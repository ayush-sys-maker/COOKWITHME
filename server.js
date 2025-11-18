import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import session from "express-session";
import bcrypt from "bcrypt";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const app = express();

// --- DATABASE CONFIGURATION ---
const pool = new Pool({
  user: process.env.DB_user,
  host: process.env.DB_host,
  database: process.env.DB_name,
  password: process.env.DB_password,
  port: parseInt(process.env.DB_port, 10),
  ssl: false // No SSL for localhost
});



// --- MIDDLEWARE ---
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3002"], // frontend localhost
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: false
  }
}));

// --- AUTH CHECK ---
const requireAuth = (req, res, next) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};


// --- ROUTES ---
// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

pool.addchat = async (userId, question, answer, conversationId) => {
  return await pool.query(
    "INSERT INTO chathistory (user_id, question, answer, conversation_id) VALUES ($1, $2, $3, $4) RETURNING *",
    [userId, question, answer, conversationId]
  );
};


// Signup
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username & password required" });

    const exists = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (exists.rows.length > 0) return res.status(409).json({ error: "Username exists" });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashed]
    );

    const user = result.rows[0];
    req.session.user = { id: user.id, username: user.username };

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username & password required" });

    const result = await pool.query("SELECT id, username, password FROM users WHERE username = $1", [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid username or password" });

    req.session.user = { id: user.id, username: user.username };
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Check auth
app.get("/check-auth", (req, res) => {
  if (req.session.user) return res.json({ islogin: true, user: req.session.user });
  res.json({ islogin: false });
});

// Get conversations
app.get("/getconversation", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.title, c.created_at,
        json_agg(
          json_build_object('id', ch.id, 'question', ch.question, 'answer', ch.answer, 'created_at', ch.created_at)
          ORDER BY ch.created_at
        ) as messages
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
  const { question, conversationId } = req.body;
  const userId = req.session.user.id;

  try {
    let newConversationId = conversationId;

    if (!newConversationId) {
      const result = await pool.query(
        "INSERT INTO conversation (user_id, title) VALUES ($1, $2) RETURNING id",
        [userId, question.substring(0, 50)]
      );
      newConversationId = result.rows[0].id;
    }

    // Call AI API (OpenRouter)
    const messages = [
      { role: "system", content:"You are a helpful cooking assistant created by Ayush. Always give answers in 3 to 4 short bullet points only. Keep responses simple, clear, and not too long."},
      { role: "user", content: question }
    ];

    const aiResponse = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "anthropic/claude-3-haiku",
      messages,
      max_tokens: 1000
    }, {
      headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` }
    });

    const answer = aiResponse.data.choices[0].message.content;

    const saved = await pool.addchat(userId, question, answer, newConversationId);

    res.json({ success: true, answer, conversationId: newConversationId, saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get AI answer" });
  }
});

// Root
app.get("/", (req, res) => res.send("🍳 CookWithMe backend running locally!"));

// --- START SERVER ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🍳 Server running on http://localhost:${PORT}`));

