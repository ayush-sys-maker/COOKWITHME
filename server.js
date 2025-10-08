const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

dotenv.config();

// Check critical environment variables
console.log('🔧 Environment check:', {
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
  nodeEnv: process.env.NODE_ENV
});

const app = express();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Table creation function - UPDATED WITH DEBUGGING
const createTables = async () => {
  console.log('🔧 Attempting database connection...');
  
  try {
    // Test if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL environment variable is missing');
      console.log('💡 Please set DATABASE_URL in Render environment variables');
      return;
    }
    console.log('✅ DATABASE_URL is set');

    // Test database connection
    console.log('🔧 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();

    // Create tables
    console.log('🔧 Creating tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created/verified');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Conversation table created/verified');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chathistory (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES conversation(id) ON DELETE CASCADE,
        question TEXT,
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Chathistory table created/verified');
    
    console.log('🎉 All database tables created successfully');
  } catch (error) {
    console.log('❌ Database error:', error.message);
    console.log('Error details:', {
      code: error.code,
      detail: error.detail
    });
  }
};

// Call this function when server starts
createTables();

// CORS - Update for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true  // Allow all origins in production for now
    : "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - FIXED for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// Database helper
const db = {
  query: (text, params) => pool.query(text, params),
  
  addchat: async (userId, question, answer, conversationId) => {
    const result = await pool.query(
      'INSERT INTO chathistory (user_id, question, answer, conversation_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, question, answer, conversationId]
    );
    return result.rows[0];
  }
};

// HEALTH CHECK (important for deployment)
app.get("/health", (req, res) => {
  res.json({ 
    message: '🍳 CookWithMe API is running!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    const checkUser = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await db.query(
      "INSERT INTO users(username, password) VALUES ($1, $2) RETURNING *",
      [username, hashedPassword]
    );
    const user = rows[0];

    req.session.user = { id: user.id, username: user.username };
    
    res.json({ success: true, user: req.session.user });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Error in sign up" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const checkuser = await db.query("SELECT * FROM users WHERE username = $1", [username]);

    if (checkuser.rows.length === 0) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, checkuser.rows[0].password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    req.session.user = {
      id: checkuser.rows[0].id,
      username: checkuser.rows[0].username,
    };

    res.json({ success: true, user: req.session.user });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error in login" });
  }
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// CHECK AUTH
app.get("/check-auth", (req, res) => {
  try {
    if (req.session.user) {
      return res.json({ islogin: true, user: req.session.user });
    }
    return res.json({ islogin: false, user: null });
  } catch (error) {
    console.log("Error in authentication check:", error);
    res.status(500).json({ error: "Authentication check failed" });
  }
});

// GET CONVERSATIONS
app.get("/getconversation", requireAuth, async (req, res) => {
  try {
      const result = await db.query(`
          SELECT c.id, c.title, c.created_at,
                 json_agg(
                     json_build_object(
                         'id', ch.id,
                         'question', ch.question,
                         'answer', ch.answer,
                         'created_at', ch.created_at
                     ) ORDER BY ch.created_at
                 ) as messages
          FROM conversation c
          LEFT JOIN chathistory ch ON c.id = ch.conversation_id
          WHERE c.user_id = $1
          GROUP BY c.id
          ORDER BY c.created_at DESC
      `, [req.session.user.id]);

      res.json({ success:true,conversations: result.rows });
  } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// GET SPECIFIC CONVERSATION MESSAGES
app.get("/getconversation/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.session.user.id;

    // Verify the conversation belongs to the user
    const convCheck = await db.query(
      'SELECT * FROM chathistory WHERE conversation_id = $1 AND user_id = $2 LIMIT 1',
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: "Conversation not found or access denied" });
    }

    // Get all messages for this conversation
    const result = await db.query(
      `SELECT id, question, answer, created_at 
       FROM chathistory 
       WHERE conversation_id = $1 AND user_id = $2 
       ORDER BY created_at ASC`,
      [conversationId, userId]
    );
    
    res.json({ 
      success: true, 
      messages: result.rows,
      conversationId: conversationId
    });

  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    res.status(500).json({ 
      error: "Failed to fetch conversation messages",
      details: error.message 
    });
  }
});

// COOKING ASSISTANT
app.post("/ask-cooking-assistant", requireAuth, async (req, res) => {
  const { question, conversationId, language = 'en' } = req.body;
  const userId = req.session.user.id;

  try {
    let conversationhistory = []
    let newconversationId = conversationId;

    if (!newconversationId) {
      const result = await db.query(
        'INSERT INTO conversation (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at',
        [userId, question.substring(0, 50)]
      )
      newconversationId = result.rows[0].id;
    }

    if (conversationId) {
      let historyResult = await db.query(
        'SELECT question, answer FROM chathistory WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
      )
      conversationhistory = historyResult.rows;
    }

    let messages = [];

    // Add system message
    const systemMessage = "You are a helpful cooking assistant coded by ayush. Provide clear, concise cooking instructions. After 2-3 steps, ask if you want to continue.";

    messages.push({
      role: "system",
      content: systemMessage
    });

    // Add conversation history if exists
    if (conversationhistory && conversationhistory.length > 0) {
      conversationhistory.forEach(msg => {
        if (msg.question && msg.question.trim()) {
          messages.push({
            role: "user",
            content: msg.question.trim()
          });
        }
        if (msg.answer && msg.answer.trim()) {
          messages.push({
            role: "assistant",
            content: msg.answer.trim()
          });
        }
      });
    }

    // Include the current question
    if (question && question.trim()) {
      messages.push({
        role: "user",
        content: question.trim()
      });
    }

    const aiResponse = await axios.post("https://openrouter.ai/api/v1/chat/completions", 
      {
        model: "anthropic/claude-3-haiku",
        messages: messages,
        max_tokens: 1000
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NODE_ENV === 'production' ? 'https://effulgent-raindrop-f9ddee.netlify.app' : 'http://localhost:3000',
          "X-Title": "Cooking Assistant"
        }
      }
    );

    if (aiResponse.status !== 200) {
      throw new Error(`OpenRouter API error: ${aiResponse.status}`);
    }

    const answer = aiResponse.data.choices[0].message.content;
    const savechat = await db.addchat(userId, question, answer, newconversationId);

    // Get the conversation to include in the response
    const conversation = await db.query(
      'SELECT id, title, created_at FROM conversation WHERE id = $1', 
      [newconversationId]
    );

    return res.json({
      success: true, 
      answer,
      savechat,
      conversationId: newconversationId,
      conversationTitle: conversation.rows[0]?.title,
      createdAt: conversation.rows[0]?.created_at
    });

  } catch (error) {
    console.error("Error in ask-cooking-assistant:", error);
    if (error.response) {
      return res.status(error.response.status).json({ 
        error: error.response.data.error || "API request failed"
      });
    }
    return res.status(500).json({ error: "Failed to process request" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🍳 CookWithMe Server running on port ${PORT}`);
});