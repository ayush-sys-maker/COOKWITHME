import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import session from "express-session";
import bcrypt from "bcrypt";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";
// Import DB pool (Neon)
import data from "./data/data.js";

dotenv.config();

console.log("Loaded key:", process.env.OPENROUTER_API_KEY);



const app = express();
const PgSession = connectPgSimple(session);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Alias for clarity (optional but recommended)
const pool = data;

/* -------------------- MIDDLEWARE -------------------- */




app.use(cors({
  origin:'https://mycookingassistant.netlify.app'
  ,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.set('trust proxy', 1);


app.use(session({
  store: new PgSession({
    pool: pool,                 // ✅ SAME Neon pool
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure: true  // Set to true if using HTTPS
  }
}));




/* -------------------- AUTH MIDDLEWARE -------------------- */

const requireAuth = (req, res, next) => {
  if (!req.session.user?.id) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};




/* -------------------- ROUTES -------------------- */

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Helper method
pool.addchat = async (userId, question, answer, conversationId) => {
  return pool.query(
    `INSERT INTO chathistory 
     (user_id, question, answer, conversation_id) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, question, answer, conversationId]
  );
};

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username & password required" });

    const exists = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (exists.rows.length)
      return res.status(409).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashed]
    );

    req.session.user = result.rows[0];
    res.json({ success: true, user: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      "SELECT id, username, password FROM users WHERE username = $1",
      [username]
    );

    if (!result.rows.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    req.session.user = { id: user.id, username: user.username };
    res.json({ success: true, user: req.session.user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Check auth
app.get("/check-auth",  (req, res) => {
  res.json({
    islogin: !!req.session.user,
    user: req.session.user || null
  })
});

// Get conversations
app.get("/getconversation", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.title, c.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ch.id,
              'question', ch.question,
              'answer', ch.answer,
              'created_at', ch.created_at
            )
            ORDER BY ch.created_at
          ) FILTER (WHERE ch.id IS NOT NULL),
          '[]'
        ) AS messages
      FROM conversation c
      LEFT JOIN chathistory ch ON c.id = ch.conversation_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.session.user.id]);

    res.json({ success: true, conversations: result.rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Ask cooking assistant
app.post("/ask-cooking-assistant", requireAuth, async (req, res) => {
  try {
    const { question, conversationId } = req.body;
    const userId = req.session.user.id;

    let convoId = conversationId;

    if (!convoId) {
      const result = await pool.query(
        "INSERT INTO conversation (user_id, title) VALUES ($1, $2) RETURNING id",
        [userId, question.slice(0, 50)]
      );
      convoId = result.rows[0].id;
    }
    
    const systemPrompt = `
You are a professional cooking assistant that returns recipes in JSON format only.

When the user asks for a recipe, respond using this exact JSON structure:

{
  "title": string,
  "description": string (3-4 lines about origin, cultural background, why it is famous, and health benefits),
  "nutrition": {
    "calories": string (e.g. "562 kcal"),
    "protein": string (e.g. "30g"),
    "fat": string (e.g. "12g")
  },
  "servings": number,
  "time": {
    "prep": string (e.g. "10 min"),
    "cook": string (e.g. "25 min"),
    "total": string (e.g. "35 min")
  },
  "ingredients": [
    { "item": string, "quantity": string }
  ],
  "steps": [
    string (each step clear and actionable)
  ]
}

Rules:
- Only return valid JSON.
- Do not include backticks, markdown, or text outside the JSON.
- If any value is unknown, estimate reasonably.
- Steps must be clear and actionable.
`;

    const ai = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "anthropic/claude-3-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
        }
      }
    );

      let recipe;
    try {
      recipe = JSON.parse(ai.data.choices[0].message.content);
    } catch (err) {
      return res.status(500).json({ error: "Invalid JSON returned by AI" });
    }

    await pool.addchat(userId, question, recipe, convoId);
    console.log("Recipe from backend:", recipe);


    res.json({ success: true, recipe, conversationId: convoId });

  } catch (err) {
     console.error("OpenRouter Error Response:", err.response?.data);
  console.error("OpenRouter Error Message:", err.message);
  console.error("OpenRouter Error Config:", err.config?.data);
  return res.status(500).json({ 
    error: err.response?.data || err.message 
  });
  }
});

// Root
app.get("/api/health", (req, res) => {
  res.send("🍳 CookWithMe backend running");
});


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
