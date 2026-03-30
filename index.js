const express = require('express');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WorkHire</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>
                    body {
                        margin: 0;
                        min-height: 100vh;
                        display: grid;
                        place-items: center;
                        font-family: Segoe UI, sans-serif;
                        background: linear-gradient(120deg, #f6f9fc, #e6eef9);
                        color: #1b2a41;
                    }
                    .card {
                        background: #ffffff;
                        padding: 2rem;
                        border-radius: 14px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
                        text-align: center;
                        max-width: 600px;
                    }
                    h1 {
                        margin-top: 0;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>WorkHire is running</h1>
                    <p>Your Node + Express server is up and visible.</p>
                    <p>Open <strong>http://localhost:${PORT}</strong></p>
                </div>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`WorkHire server running on http://localhost:${PORT}`);
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows);
  } catch (err) {
    console.error("REAL ERROR:", err); // 👈 check terminal
    res.status(500).json({ error: err.message }); // 👈 show in browser
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});