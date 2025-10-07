import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import session from "express-session";
import bcrypt from "bcrypt";
import chatdata from "../data/chatdata.js";
import data from "../data/data.js";
dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: false
  }
}));

app.use(express.json());

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    const checkUser = await data.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await data.query(
      "INSERT INTO users(username, password) VALUES ($1, $2) RETURNING *",
      [username, hashedPassword]
    );
    const user = rows[0];

    req.session.user = { id: user.id, username: user.username };
    req.session.save(err => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Session error" });
      }
      res.json({ success: true, user: req.session.user });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error in sign up" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const checkuser = await data.query("SELECT * FROM users WHERE username = $1", [username]);

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

    req.session.save(err => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Session error" });
      }
      res.json({ success: true, user: req.session.user });
    });

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
      const result = await data.query(`
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

    console.log(`Fetching messages for conversation ${conversationId} and user ${userId}`);

    // Verify the conversation belongs to the user
    const convCheck = await data.query(
      'SELECT * FROM chathistory WHERE conversation_id = $1 AND user_id = $2 LIMIT 5',
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      console.log(`No access to conversation ${conversationId} for user ${userId}`);
      return res.status(404).json({ error: "Conversation not found or access denied" });
    }

    // Get all messages for this conversation
    const result = await data.query(
      `SELECT id, question, answer, created_at 
       FROM chathistory 
       WHERE conversation_id = $1 AND user_id = $2 
       ORDER BY created_at ASC`,
      [conversationId, userId]
    );

    console.log(`Found ${result.rows.length} messages for conversation ${conversationId}`);
    
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

// COOKING ASSISTANT (existing code)
const COOKING_MODELS = {
  FAST: "anthropic/claude-3-haiku",
  BALANCED: "google/gemini-pro-1.0",
  ADVANCED: "anthropic/claude-3-opus"
};

app.post("/ask-cooking-assistant",requireAuth,async (req,res)=>{
  const {question, conversationId, language = 'en'} = req.body;
  const userId = req.session.user.id;

try {
  
let conversationhistory = []
let newconversationId = conversationId;

if(!req.body){
  console.warn("No body")
}

if(!newconversationId){
  const result = await data.query(
    'INSERT INTO conversation (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at',
    [userId, question.substring(0, 50)]
  )
  newconversationId = result.rows[0].id;
}

if(conversationId){
  let historyResult = await data.query(
    'Select question , answer from chathistory WHERE conversation_id = $1 order by created_at asc',[conversationId]
  )
  conversationhistory = historyResult.rows;
}

let messages = [];

// Add system message with language support
const systemMessage = "You are a helpful cooking assistant  coded by ayush and he is the owner of this app  . Provide clear, concise cooking instructions. After 2-3 steps, ask if you want to continue.if someone say to speak in hindi then say i cant speak but i can give as as a text message ";

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

// Include the current question so the model responds to it
if (question && question.trim()) {
  messages.push({
    role: "user",
    content: question.trim()
  });
}

try {
  console.log("Sending request to OpenRouter with messages:", JSON.stringify(messages, null, 2));
  
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
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Cooking Assistant"
      },
      validateStatus: () => true // Prevent axios from throwing on HTTP error status
    }
  );

  console.log("OpenRouter response status:", aiResponse.status);
  console.log("OpenRouter response data:", JSON.stringify(aiResponse.data, null, 2));

  if (aiResponse.status !== 200) {
    throw new Error(`OpenRouter API error: ${JSON.stringify(aiResponse.data)}`);
  }

  const answer = aiResponse.data.choices[0].message.content;
  const savechat = await chatdata.addchat(userId,question,answer,newconversationId);

  // Get the conversation to include in the response
  const conversation = await data.query(
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
    console.error("Error response data:", error.response.data);
    console.error("Error response status:", error.response.status);
    console.error("Error response headers:", error.response.headers);
    return res.status(error.response.status).json({ 
      error: error.response.data.error || "API request failed",
      details: error.response.data
    });
  } else if (error.request) {
    console.error("No response received:", error.request);
    return res.status(500).json({ error: "No response from AI service" });
  } else {
    console.error("Request setup error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

} catch (error) {
  console.error("Error in ask-cooking-assistant:", error);
  if(error.response){
   return res.status(error.response.status).json({ error: error.response.data.error });
  }
  return res.status(500).json({ error: "Failed to fetch conversation messages" });
}


})

app.listen(3001, () => {
  console.log("Server running on port 3001");
});