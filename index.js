const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const pool = require('./db');
const authRoutes = require('./routes/auth.routes');
const requestRoutes = require('./routes/request.routes');
const bidRoutes = require('./routes/bid.routes');
const workerRoutes = require('./routes/worker.routes');
const reviewRoutes = require('./routes/review.routes');
const errorHandler = require('./middleware/errorHandler');
const { initSocket } = require('./services/socket.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use('/requests', requestRoutes);
app.use('/bids', bidRoutes);
app.use('/workers', workerRoutes);
app.use('/reviews', reviewRoutes);

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
                    <p>Your Node + Express + Socket.io server is up and visible.</p>
                    <p>Open <strong>http://localhost:${PORT}</strong></p>
                </div>
            </body>
        </html>
    `);
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

app.use(errorHandler);

// Wrap Express app in HTTP server for WebSocket support
const server = http.createServer(app);

// Initialize Socket.io Manager
initSocket(server);

server.listen(PORT, () => {
    console.log(`WorkHire HTTP & WebSocket server running on http://localhost:${PORT}`);
});