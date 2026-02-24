// db/mongoClient.js
const { MongoClient } = require("mongodb");
const path = require("path");

// load .env from repo root (adjust path if your .env lives elsewhere)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Prefer server-side names; fall back to legacy VITE_* names for now
const uri =
  (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) ||
  (process.env.MONGO_URI && process.env.MONGO_URI.trim()) ||
  (process.env.VITE_MONGO_URI && process.env.VITE_MONGO_URI.trim()) ||
  "";

if (!uri) {
  throw new Error(
    "No Mongo URI found. Set MONGODB_URI in your server .env (do NOT use VITE_* for server secrets)."
  );
}

const DB_NAME =
  (process.env.DB_NAME && process.env.DB_NAME.trim()) ||
  (process.env.VITE_DB_NAME && process.env.VITE_DB_NAME.trim()) ||
  "FidelityHackathon";

let client;
let db;

async function connectToDB() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(uri);
  }
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅ Connected to MongoDB database: ${DB_NAME}`);
  return db;
}

// optional: clean shutdown
process.on("SIGINT", async () => {
  try { if (client) await client.close(); } catch {}
  process.exit(0);
});

module.exports = { connectToDB };
