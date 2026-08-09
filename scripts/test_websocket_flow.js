const http = require('http');
const ioClient = require('socket.io-client');
const pool = require('../db');
const authService = require('../services/auth.service');
const requestService = require('../services/request.service');
const bidService = require('../services/bid.service');
const workerService = require('../services/worker.service');
const { initSocket } = require('../services/socket.service');
const jwt = require('jsonwebtoken');

const PORT = 3999;
let server;
let userSocket;
let workerSocket;

function createAccessToken(user) {
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    const payload = {
        sub: user.id,
        email: user.email,
        roles: roles.map(r => String(r).toLowerCase())
    };
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

async function runTest() {
    console.log('=== Starting Real-Time WebSockets Integration Test ===\n');

    // 1. Start test HTTP & Socket server
    const express = require('express');
    const app = express();
    app.use(express.json());
    server = http.createServer(app);
    initSocket(server);

    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`[Test Server] Running on http://localhost:${PORT}`);

    try {
        // 2. Setup Test Accounts
        const timestamp = Date.now();
        const userAccount = await authService.register({
            full_name: `WS User ${timestamp}`,
            email: `ws_user_${timestamp}@test.com`,
            password: 'Password123!',
            phone: '1234567890',
            role: 'user'
        });

        const workerAccount = await authService.register({
            full_name: `WS Worker ${timestamp}`,
            email: `ws_worker_${timestamp}@test.com`,
            password: 'Password123!',
            phone: '0987654321',
            role: 'worker'
        });

        // Verify worker profile so they can place bids
        await pool.query(
            `UPDATE worker_profiles SET verification_status = 'verified' WHERE account_id = $1`,
            [workerAccount.id]
        );

        const userToken = createAccessToken(userAccount);
        const workerToken = createAccessToken(workerAccount);

        // 3. Connect Socket Clients with JWT Auth Handshake
        console.log('\n[WS] Connecting User and Worker WebSocket clients...');

        userSocket = ioClient(`http://localhost:${PORT}`, {
            auth: { token: userToken }
        });

        workerSocket = ioClient(`http://localhost:${PORT}`, {
            auth: { token: workerToken }
        });

        await Promise.all([
            new Promise(res => userSocket.on('connect', res)),
            new Promise(res => workerSocket.on('connect', res))
        ]);

        console.log(`[WS] User connected (socket id: ${userSocket.id})`);
        console.log(`[WS] Worker connected (socket id: ${workerSocket.id})`);

        // -------------------------------------------------------------------
        // Test Case 1: Open Request & Bid Real-time Notifications
        // -------------------------------------------------------------------
        console.log('\n--- Test 1: Open Request & New Bid Notification ---');

        const newBidReceivedPromise = new Promise((resolve) => {
            userSocket.on('notification:new_bid', (data) => {
                console.log('✅ User received [notification:new_bid]:', data);
                resolve(data);
            });
        });

        // User creates open request
        const openReq = await requestService.createRequest(userAccount.id, {
            request_type: 'open',
            title: 'Fix Plumbing Leak',
            description: 'Water leaking under kitchen sink',
            location: 'Colombo 03'
        });

        // Worker places bid
        const bid = await bidService.placeBid(workerAccount.id, {
            request_id: openReq.id,
            amount: 75.00,
            message: 'I can fix this in 1 hour'
        });

        const newBidEvent = await newBidReceivedPromise;
        if (newBidEvent.bid_id !== bid.id) throw new Error('Bid ID mismatch in socket event');

        // Test 1b: Accepting Bid Notification
        console.log('\n--- Test 1b: Bid Accepted Notification ---');

        const bidAcceptedPromise = new Promise((resolve) => {
            workerSocket.on('notification:bid_accepted', (data) => {
                console.log('✅ Worker received [notification:bid_accepted]:', data);
                resolve(data);
            });
        });

        await bidService.acceptBid(userAccount.id, openReq.id, bid.id);
        const bidAcceptedEvent = await bidAcceptedPromise;
        if (bidAcceptedEvent.bid_id !== bid.id) throw new Error('Accepted Bid ID mismatch in socket event');

        // -------------------------------------------------------------------
        // Test Case 2: Direct Service Request Notification
        // -------------------------------------------------------------------
        console.log('\n--- Test 2: Direct Service Request & Response Notifications ---');

        const directReqPromise = new Promise((resolve) => {
            workerSocket.on('notification:direct_request', (data) => {
                console.log('✅ Worker received [notification:direct_request]:', data);
                resolve(data);
            });
        });

        // User creates direct request to worker
        const directReq = await requestService.createRequest(userAccount.id, {
            request_type: 'direct',
            title: 'Wiring Repair',
            description: 'Electrical circuit breaker fix',
            location: 'Kandy',
            target_worker_account_id: workerAccount.id,
            budget: 150.00,
            urgency: 'high'
        });

        const directReqEvent = await directReqPromise;
        if (directReqEvent.request_id !== directReq.id) throw new Error('Direct request ID mismatch in socket event');

        // Test 2b: Worker responds (accepts) direct request
        console.log('\n--- Test 2b: Worker Direct Request Response Notification ---');

        const directResponsePromise = new Promise((resolve) => {
            userSocket.on('notification:direct_response', (data) => {
                console.log('✅ User received [notification:direct_response]:', data);
                resolve(data);
            });
        });

        await requestService.respondToDirectRequest(workerAccount.id, directReq.id, {
            action: 'accept',
            note: 'I will be there at 2 PM'
        });

        const directRespEvent = await directResponsePromise;
        if (directRespEvent.status !== 'accepted') throw new Error('Direct response status mismatch');

        // -------------------------------------------------------------------
        // Test Case 3: Job Progress Status Update Event
        // -------------------------------------------------------------------
        console.log('\n--- Test 3: Job Progress Status Update ---');

        const jobStatusPromise = new Promise((resolve) => {
            userSocket.on('job:status_updated', (data) => {
                console.log('✅ User received [job:status_updated]:', data);
                resolve(data);
            });
        });

        await requestService.updateJobStatus(workerAccount.id, directReq.id, {
            status: 'in_progress',
            note: 'Work has started on-site'
        });

        const statusEvent = await jobStatusPromise;
        if (statusEvent.new_status !== 'in_progress') throw new Error('Job status mismatch');

        console.log('\n🎉 ALL REAL-TIME WEBSOCKET INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');

    } finally {
        if (userSocket) userSocket.disconnect();
        if (workerSocket) workerSocket.disconnect();
        if (server) server.close();
        await pool.end();
    }
}

runTest().catch((err) => {
    console.error('❌ WebSocket Test Failed:', err);
    process.exit(1);
});
