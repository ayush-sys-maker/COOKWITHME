import dotenv from "dotenv";
import pkg from "pg";

const { Pool } = pkg;
dotenv.config();

let Isproduction = process.env.NODE_ENV === "production";

const data = new Pool({
  connectionString: Isproduction ? process.env.DATABASE_URL : process.env.local_DATABASE_URL,
  ssl: Isproduction ? { rejectUnauthorized: false } : false
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
