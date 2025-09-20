import { Client } from "pg";

// Neon DB credentials через ENV: NEON_HOST, NEON_USER, NEON_PASS, NEON_DB
const client = new Client({
  host: process.env.NEON_HOST,
  user: process.env.NEON_USER,
  password: process.env.NEON_PASS,
  database: process.env.NEON_DB,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

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

    // Создание таблицы и вставка JSON
    if (action === "save") {
      const data = body.data;
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_data (
          id SERIAL PRIMARY KEY,
          data JSONB
        )
      `);
      await client.query("INSERT INTO test_data(data) VALUES($1)", [data]);
      return { statusCode: 200, headers, body: JSON.stringify({ status: "saved" }) };
    }

    // Получение последнего JSON
    if (action === "load") {
      const res = await client.query("SELECT data FROM test_data ORDER BY id DESC LIMIT 1");
      const lastData = res.rows.length ? res.rows[0].data : null;
      return { statusCode: 200, headers, body: JSON.stringify({ data: lastData }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
