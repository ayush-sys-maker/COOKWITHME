import pg from "pg";
import dotenv from "dotenv";

dotenv.config();





const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Force public schema (Neon fix)
pool.on("connect", async (client) => {
  await client.query("SET search_path TO public");
});



export default data;
