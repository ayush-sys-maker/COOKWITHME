import dotenv from "dotenv";
import pkg from "pg";

const { Pool } = pkg;
dotenv.config();

const data = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Optional: test connection (safe for Render)
data.connect()
  .then(client => {
    console.log("✅ Connected to PostgreSQL (Neon)");
    client.release();
  })
  .catch(err => {
    console.error("❌ PostgreSQL connection error:", err.message);
  });

export default data;
