const { Client } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL; // Вот здесь вставьте URL вашей Neon базы

exports.handler = async function(event, context) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      if (body.action === 'add' && body.text) {
        await client.query('CREATE TABLE IF NOT EXISTS test_data (id SERIAL PRIMARY KEY, text TEXT)');
        await client.query('INSERT INTO test_data (text) VALUES ($1)', [body.text]);
        return { statusCode: 200, body: 'Запись добавлена' };
      }
    } else if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      if (params.action === 'list') {
        await client.query('CREATE TABLE IF NOT EXISTS test_data (id SERIAL PRIMARY KEY, text TEXT)');
        const res = await client.query('SELECT id, text FROM test_data ORDER BY id DESC');
        return { statusCode: 200, body: JSON.stringify(res.rows), headers: {'Content-Type': 'application/json'} };
      }
    }
    return { statusCode: 400, body: 'Неверный запрос' };
  } catch (error) {
    return { statusCode: 500, body: 'Ошибка сервера: ' + error.message };
  } finally {
    await client.end();
  }
};
