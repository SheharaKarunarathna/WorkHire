const pool = require('../db');
const authService = require('../services/auth.service');
const requestService = require('../services/request.service');
const bidService = require('../services/bid.service');

async function runTest() {
	console.log('--- Starting Bidding System Flow Verification ---');

	const timestamp = Date.now();
	const userEmail = `user_${timestamp}@example.com`;
	const worker1Email = `worker1_${timestamp}@example.com`;
	const worker2Email = `worker2_${timestamp}@example.com`;

	try {
		// 1. Create test accounts
		console.log('1. Registering test User and Workers...');
		const user = await authService.register({
			full_name: 'Test Customer',
			email: userEmail,
			password: 'Password123!',
			phone: '1234567890',
			role: 'user',
		});

		const worker1 = await authService.register({
			full_name: 'Bob Electrician',
			email: worker1Email,
			password: 'Password123!',
			phone: '0987654321',
			role: 'worker',
		});

		const worker2 = await authService.register({
			full_name: 'Alice Plumber',
			email: worker2Email,
			password: 'Password123!',
			phone: '1122334455',
			role: 'worker',
		});

		// 2. Set worker verification status to 'verified'
		console.log('2. Verifying worker profiles...');
		await pool.query(
			`UPDATE worker_profiles SET verification_status = 'verified' WHERE account_id IN ($1, $2)`,
			[worker1.id, worker2.id]
		);

		// 3. Create Open Request & Direct Request
		console.log('3. Creating open request and direct request...');
		const openRequest = await requestService.createRequest(user.id, {
			request_type: 'open',
			title: 'Fix Electrical Panel',
			description: 'Main panel triplication issue',
			location: 'New York, NY',
			budget: 250.00,
		});

		const directRequest = await requestService.createRequest(user.id, {
			request_type: 'direct',
			title: 'Fix Bathroom Sink',
			description: 'Leaking pipe under sink',
			location: 'New York, NY',
			target_worker_account_id: worker1.id,
		});

		// 4. Test protection: Worker attempting to bid on direct request
		console.log('4. Testing constraint: Bidding on direct request (should fail)...');
		try {
			await bidService.placeBid(worker2.id, {
				request_id: directRequest.id,
				amount: 150.00,
				message: 'I can fix this!',
			});
			console.error('FAILED: Bidding on direct request should have thrown an error!');
			process.exit(1);
		} catch (err) {
			console.log('PASS: Correctly rejected bid on direct request:', err.message);
		}

		// 5. Worker 1 places bid on Open Request
		console.log('5. Worker 1 placing bid on open request...');
		const bid1 = await bidService.placeBid(worker1.id, {
			request_id: openRequest.id,
			amount: 220.00,
			message: 'I can arrive today at 3 PM with full gear.',
		});
		console.log('PASS: Worker 1 placed bid:', bid1.id, '| Amount:', bid1.amount);

		// 6. Duplicate active bid test (should fail)
		console.log('6. Worker 1 attempting duplicate active bid (should fail)...');
		try {
			await bidService.placeBid(worker1.id, {
				request_id: openRequest.id,
				amount: 200.00,
			});
			console.error('FAILED: Duplicate active bid should have been rejected!');
			process.exit(1);
		} catch (err) {
			console.log('PASS: Correctly rejected duplicate active bid:', err.message);
		}

		// 7. Worker 2 places bid on Open Request
		console.log('7. Worker 2 placing bid on open request...');
		const bid2 = await bidService.placeBid(worker2.id, {
			request_id: openRequest.id,
			amount: 200.00,
			message: 'Experienced plumber available immediately.',
		});
		console.log('PASS: Worker 2 placed bid:', bid2.id, '| Amount:', bid2.amount);

		// 8. User fetches bids for open request
		console.log('8. Fetching bids for open request as User...');
		const bids = await bidService.getBidsForRequest(user.id, openRequest.id);
		console.log(`PASS: Found ${bids.length} bids for request.`);
		if (bids.length !== 2) {
			console.error('FAILED: Expected 2 bids, found:', bids.length);
			process.exit(1);
		}

		// 9. Worker 2 withdraws bid
		console.log('9. Worker 2 withdrawing bid...');
		const withdrawnBid = await bidService.withdrawBid(worker2.id, bid2.id);
		console.log('PASS: Bid status updated to:', withdrawnBid.status);

		// 10. User accepts Worker 1 bid
		console.log('10. User accepting Worker 1 bid...');
		const acceptResult = await bidService.acceptBid(user.id, openRequest.id, bid1.id);
		console.log('PASS: Bid accepted result:', acceptResult.message);
		console.log('Assigned worker account ID:', acceptResult.assigned_worker_account_id);

		// 11. Verify DB final state
		console.log('11. Verifying database state...');
		const finalRequestRes = await pool.query(`SELECT status, assigned_worker_account_id FROM requests WHERE id = $1`, [openRequest.id]);
		const finalRequest = finalRequestRes.rows[0];
		console.log(`Request status: ${finalRequest.status}, Assigned worker: ${finalRequest.assigned_worker_account_id}`);

		if (finalRequest.status !== 'accepted' || finalRequest.assigned_worker_account_id !== worker1.id) {
			console.error('FAILED: Final request state invalid!');
			process.exit(1);
		}

		const winningBidRes = await pool.query(`SELECT status FROM bids WHERE id = $1`, [bid1.id]);
		console.log(`Winning bid status: ${winningBidRes.rows[0].status}`);
		if (winningBidRes.rows[0].status !== 'accepted') {
			console.error('FAILED: Winning bid status should be accepted!');
			process.exit(1);
		}

		console.log('\n--- ALL BIDDING SYSTEM TESTS PASSED SUCCESSFULLY! ---');
		process.exit(0);
	} catch (err) {
		console.error('TEST ERROR:', err);
		process.exit(1);
	}
}

runTest();
