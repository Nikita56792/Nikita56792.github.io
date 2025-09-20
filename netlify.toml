import { Client } from "pg";
import fetch from "node-fetch";

// Neon DB credentials через ENV переменные в Netlify: NEON_HOST, NEON_USER, NEON_PASS, NEON_DB
const dbClient = new Client({
  host: process.env.NEON_HOST,
  user: process.env.NEON_USER,
  password: process.env.NEON_PASS,
  database: process.env.NEON_DB,
  ssl: { rejectUnauthorized: false }
});

await dbClient.connect();

export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;
    const token = body.token; // OAuth Yandex token
    const REMOTE_PATH = "/test_folder/data.json";

    if (action === "save-db") {
      const data = body.data;
      await dbClient.query("CREATE TABLE IF NOT EXISTS test_data (id SERIAL PRIMARY KEY, data JSONB)");
      await dbClient.query("INSERT INTO test_data(data) VALUES($1)", [data]);
      return { statusCode: 200, headers, body: JSON.stringify({ status: "saved" }) };
    }

    if (action === "upload") {
      const uploadRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(REMOTE_PATH)}&overwrite=true`, {
        headers: { Authorization: `OAuth ${token}` }
      });
      const json = await uploadRes.json();
      if (!json.href) return { statusCode: 500, headers, body: JSON.stringify(json) };
      await fetch(json.href, { method: "PUT", body: JSON.stringify(body.data) });
      return { statusCode: 200, headers, body: JSON.stringify({ status: "uploaded" }) };
    }

    if (action === "download") {
      const dlRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(REMOTE_PATH)}`, {
        headers: { Authorization: `OAuth ${token}` }
      });
      const dlJson = await dlRes.json();
      if (!dlJson.href) return { statusCode: 500, headers, body: JSON.stringify(dlJson) };
      const fileRes = await fetch(dlJson.href);
      const data = await fileRes.json();
      return { statusCode: 200, headers, body: JSON.stringify({ data }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
