# WorkHire Real-Time Communication Guide: WebSockets & Socket.io

This document provides a complete conceptual explanation and implementation guide for integrating **Real-Time WebSockets** into the **WorkHire** Node.js/Express backend using **Socket.io**.

---

## 1. What are WebSockets and Why Do We Need Them?

### The Traditional HTTP Request-Response Model
In a standard HTTP web application:
1. The **Client (Browser/Mobile App)** sends an HTTP request to the **Server**.
2. The **Server** processes the request and sends back a response.
3. The connection **closes**.

```
Client  ─── HTTP GET /requests ───►  Server
Client  ◄─── 200 OK [JSON Data] ───  Server
(Connection closed)
```

**The Problem**: In WorkHire, when Worker A submits a bid on Customer B's request, Customer B doesn't know about it unless Customer B manually refreshes their browser or constantly asks the server every few seconds (**HTTP Polling**), which wastes bandwidth and server CPU.

---

### The WebSocket Model (Full-Duplex Communication)
**WebSockets** create a persistent, two-way (full-duplex) connection between the client and server over a single TCP socket.

```
Client  ═══ 1. HTTP Upgrade Handshake ═══►  Server
Client  ◄══ 2. 101 Switching Protocols ═══  Server

        ── Persistent Open Connection ──
Client  ─── 3. Event: "chat:send_message" ──► Server
Client  ◄── 4. Event: "notification:new_bid" ── Server
```

Once connected:
- Either side can push data at any time with virtually **zero latency** (< 10ms).
- Perfect for instant notifications, live status updates, live worker tracking, and real-time chat.

---

### Why Use `Socket.io` instead of Native WebSockets?

Native Browser `WebSocket` API is low-level and lacks built-in features needed for production. **Socket.io** is built on top of WebSockets and provides:

1. **Automatic Reconnection**: Automatically retries if wifi drops or server restarts.
2. **Rooms & Namespaces**: Group connections into target rooms (e.g., `user_123` or `request_abc`).
3. **HTTP Long-Polling Fallback**: Falls back to HTTP polling if firewall blocks WebSockets.
4. **JSON Serialization**: Automatically converts JavaScript objects without `JSON.parse` / `JSON.stringify`.

---

## 2. How Socket.io Plugs Into Our Express Backend

In Node.js Express, an `app` object handles HTTP routes (`app.get`, `app.post`). To attach Socket.io, we wrap our Express `app` with standard Node.js `http.createServer`.

### Architecture Overview

```
                        ┌───────────────────────────────────┐
                        │        index.js (Entry)           │
                        └─────────────────┬─────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │      http.createServer(app)       │
                        └────────┬─────────────────┬────────┘
                                 │                 │
              ┌──────────────────▼──┐           ┌──▼──────────────────┐
              │  Express REST APIs  │           │   Socket.io Server  │
              │  (/auth, /bids, ..) │           │    (socket.js)      │
              └─────────────────────┘           └──┬──────────────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │ JWT Handshake Auth  │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  Rooms & Event Hub  │
                                        └─────────────────────┘
```

---

## 3. WebSocket Authentication (JWT Handshake)

Just like REST API headers use `Authorization: Bearer <token>`, Socket.io connections send tokens during the initial connection **handshake**.

### Client Side (Browser / React)
```javascript
const socket = io("http://localhost:3000", {
  auth: {
    token: "USER_OR_WORKER_JWT_TOKEN_HERE"
  }
});
```

### Server Side (Socket Authentication Middleware)
Before accepting a connection, Socket.io verifies the JWT token. If invalid, the connection is rejected:

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication token required'));

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    socket.user = payload; // Attach user info (id, roles) to socket instance
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});
```

---

## 4. Rooms & Target Notifications

Rooms allow us to send events to specific users without broadcasting to everyone on the platform.

### Standard WorkHire Room Patterns:

1. **User Personal Notification Channel**: `user_<account_id>`
   - Joined automatically when a user/worker connects.
   - Used for personal alerts (e.g. "Your bid was accepted!", "You received a direct request!").

2. **Job Request Tracking & Chat Room**: `request_<request_id>`
   - Joined by customer and assigned worker when viewing job details.
   - Used for live status progression updates and in-job chat.

```javascript
io.on('connection', (socket) => {
  const userId = socket.user.sub;
  
  // Automatically join personal notification room
  socket.join(`user_${userId}`);
  console.log(`User ${userId} joined room user_${userId}`);

  // Join a specific job room
  socket.on('join_job_room', (requestId) => {
    socket.join(`request_${requestId}`);
  });
});
```

---

## 5. Event Dictionary for WorkHire

| Event Name | Sender | Target Audience | Payload Data | Trigger Condition |
| :--- | :--- | :--- | :--- | :--- |
| `notification:new_bid` | Server | Customer (`user_USER_ID`) | `{ bid_id, request_id, amount, worker_name }` | Worker places bid on open request |
| `notification:bid_accepted` | Server | Worker (`user_WORKER_ID`) | `{ bid_id, request_id, request_title }` | Customer accepts worker's bid |
| `notification:direct_request` | Server | Worker (`user_WORKER_ID`) | `{ request_id, title, budget, requester_name }` | Customer creates direct request |
| `notification:direct_response`| Server | Customer (`user_USER_ID`) | `{ request_id, action, note }` | Worker accepts/rejects direct request |
| `job:status_updated` | Server | Job Room (`request_REQ_ID`) | `{ request_id, new_status, note }` | Worker updates job to `in_progress` / `completed` |
| `chat:send_message` | Client | Job Room (`request_REQ_ID`) | `{ request_id, text }` | User or Worker sends chat message |
| `chat:message_received` | Server | Job Room (`request_REQ_ID`) | `{ sender_id, text, timestamp }` | Server broadcasts message to room |

---

## 6. Step-by-Step Backend Integration Plan

### Step 1: Install Socket.io Package
```bash
npm install socket.io
```

### Step 2: Create Socket Service Manager (`services/socket.service.js`)
Create a singleton module that initializes Socket.io and exports helper functions like `sendNotification(userId, event, payload)` so any controller/service can trigger real-time events.

### Step 3: Wrap Express Server in `index.js`
Update `index.js` from `app.listen(PORT)` to:
```javascript
const http = require('http');
const { initSocket } = require('./services/socket.service');

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`WorkHire HTTP & WebSocket server running on port ${PORT}`);
});
```

### Step 4: Emit Events in Services
- In `bid.service.js`:
  - When bid placed $\rightarrow$ `socketService.emitToUser(requestOwnerId, 'notification:new_bid', bidData)`
  - When bid accepted $\rightarrow$ `socketService.emitToUser(winningWorkerId, 'notification:bid_accepted', acceptData)`
- In `request.service.js`:
  - When direct request created $\rightarrow$ `socketService.emitToUser(targetWorkerId, 'notification:direct_request', reqData)`
  - When job status updated $\rightarrow$ `socketService.emitToRoom('request_' + requestId, 'job:status_updated', statusData)`

---

## 7. Client Testing Example (HTML/JS Sandbox)

You can test WebSockets in browser console or a simple test HTML page:

```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script>
  const socket = io("http://localhost:3000", {
    auth: { token: "YOUR_JWT_ACCESS_TOKEN" }
  });

  socket.on("connect", () => {
    console.log("Connected to WorkHire WebSocket Server! Socket ID:", socket.id);
  });

  socket.on("notification:new_bid", (data) => {
    alert("New Bid Received! Amount: $" + data.amount);
  });

  socket.on("notification:bid_accepted", (data) => {
    alert("Congratulations! Your bid for " + data.request_title + " was accepted!");
  });
</script>
```
