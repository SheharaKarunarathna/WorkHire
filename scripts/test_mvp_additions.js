const http = require('http');
const { io: Client } = require('socket.io-client');
const pool = require('../db');
const { register, login } = require('../services/auth.service');
const { createRequest, getOpenRequests, cancelRequestByUser } = require('../services/request.service');
const { updateWorkerVerification } = require('../services/worker.service');
const { getChatHistory } = require('../services/chat.service');
const { initSocket } = require('../services/socket.service');
const express = require('express');

const app = express();
app.use(express.json());

const authRoutes = require('../routes/auth.routes');
const requestRoutes = require('../routes/request.routes');
const workerRoutes = require('../routes/worker.routes');
const errorHandler = require('../middleware/errorHandler');

app.use('/auth', authRoutes);
app.use('/requests', requestRoutes);
app.use('/workers', workerRoutes);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

async function runMvpTests() {
	console.log('🧪 Starting MVP Additions End-to-End Test Suite...');

	await new Promise((resolve) => server.listen(0, resolve));
	const port = server.address().port;
	const baseUrl = `http://localhost:${port}`;
	console.log(`🌐 Test Server running on ${baseUrl}`);

	try {
		const timestamp = Date.now();

		// 1. Register User & Worker
		console.log('\n--- 1. Testing Registration ---');
		const userAcc = await register({
			full_name: 'Test User MVP',
			email: `user_mvp_${timestamp}@example.com`,
			password: 'password123',
			phone: '1234567890',
			role: 'user',
		});
		console.log('✅ Registered User:', userAcc.email);

		const workerAcc = await register({
			full_name: 'Test Worker MVP',
			email: `worker_mvp_${timestamp}@example.com`,
			password: 'password123',
			phone: '0987654321',
			role: 'worker',
		});
		console.log('✅ Registered Worker:', workerAcc.email);

		// 2. Login to get JWT tokens
		const userAuth = await login({ email: userAcc.email, password: 'password123' });
		const workerAuth = await login({ email: workerAcc.email, password: 'password123' });

		const jwt = require('jsonwebtoken');
		const secret = process.env.ACCESS_TOKEN_SECRET || 'testsecret';
		const userToken = jwt.sign({ sub: userAuth.id, email: userAuth.email, roles: userAuth.roles }, secret, { expiresIn: '1h' });
		const workerToken = jwt.sign({ sub: workerAcc.id, email: workerAcc.email, roles: workerAuth.roles }, secret, { expiresIn: '1h' });

		// 3. Test Worker Verification
		console.log('\n--- 2. Testing Worker Verification ---');
		const verifiedProfile = await updateWorkerVerification(workerAcc.id, 'verified');
		console.log('✅ Worker verification status updated to:', verifiedProfile.verification_status);

		// 4. Test Create Open Request & List Open Requests
		console.log('\n--- 3. Testing Open Marketplace Feed ---');
		const openReq = await createRequest(userAcc.id, {
			request_type: 'open',
			title: 'Plumbing Repair Urgent',
			description: 'Fix leaking pipe in kitchen',
			location: 'Downtown Metro',
		});
		console.log('✅ Created Open Request ID:', openReq.id);

		const openRequests = await getOpenRequests({ location: 'Metro' });
		console.log(`✅ Fetched ${openRequests.length} open requests. First title:`, openRequests[0]?.title);

		// 5. Test Persistent WebSocket Chat
		console.log('\n--- 4. Testing Persistent Chat via WebSockets ---');
		const userSocket = Client(baseUrl, { auth: { token: userToken } });

		await new Promise((resolve) => userSocket.on('connect', resolve));
		console.log('✅ User connected to WebSocket');

		userSocket.emit('join_job_room', openReq.id);

		// Send chat message over socket
		userSocket.emit('chat:send_message', {
			requestId: openReq.id,
			text: 'Hello, when can you arrive?',
		});

		// Wait briefly for DB insertion
		await new Promise((resolve) => setTimeout(resolve, 500));

		const chatHistory = await getChatHistory(openReq.id, userAcc.id);
		console.log(`✅ Retrieved ${chatHistory.length} chat message(s) from DB history:`);
		console.log(`   "${chatHistory[0]?.message_text}" by ${chatHistory[0]?.sender_name}`);

		userSocket.disconnect();

		// 6. Test User Request Cancellation
		console.log('\n--- 5. Testing User Request Cancellation ---');
		const cancelledReq = await cancelRequestByUser(userAcc.id, openReq.id, 'No longer needed');
		console.log('✅ Request cancelled. New status:', cancelledReq.status);

		console.log('\n🎉 ALL MVP ADDITIONS TESTS PASSED SUCCESSFULLY!');
		process.exit(0);
	} catch (err) {
		console.error('\n❌ Test execution failed:', err);
		process.exit(1);
	} finally {
		server.close();
		pool.end();
	}
}

runMvpTests();
