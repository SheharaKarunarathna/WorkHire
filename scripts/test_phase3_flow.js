const pool = require('../db');
const authService = require('../services/auth.service');
const workerService = require('../services/worker.service');
const requestService = require('../services/request.service');
const reviewService = require('../services/review.service');

async function runPhase3Test() {
	console.log('--- Starting Phase 3 Flow Verification ---');

	const ts = Date.now();
	const userEmail = `p3_user_${ts}@example.com`;
	const workerEmail = `p3_worker_${ts}@example.com`;

	try {
		// 1. Create accounts
		console.log('1. Registering test User and Worker...');
		const user = await authService.register({
			full_name: 'Phase 3 Customer',
			email: userEmail,
			password: 'Password123!',
			phone: '1112223333',
			role: 'user',
		});

		const worker = await authService.register({
			full_name: 'Phase 3 Pro Worker',
			email: workerEmail,
			password: 'Password123!',
			phone: '4445556666',
			role: 'worker',
		});

		// Verify worker account
		await pool.query(
			`UPDATE worker_profiles SET verification_status = 'verified' WHERE account_id = $1`,
			[worker.id]
		);

		// 2. Update Worker Profile
		console.log('2. Updating Worker Profile...');
		const updatedProfile = await workerService.updateWorkerProfile(worker.id, {
			skills: ['electrical', 'plumbing'],
			availability: true,
			location: 'San Francisco, CA',
			bio: 'Licensed master electrician with 10 years experience.',
			hourly_rate: 85.50,
		});

		console.log('PASS: Updated profile skills:', updatedProfile.skills, '| Hourly rate:', updatedProfile.hourly_rate);

		// 3. Query Public Worker Directory
		console.log('3. Searching Public Worker Directory...');
		const workersList = await workerService.listWorkers({ skill: 'electrical', available_only: true });
		console.log(`PASS: Found ${workersList.length} verified available worker(s) for skill 'electrical'.`);

		// 4. Create Direct Request to targeted worker
		console.log('4. Creating Direct Request...');
		const directReq = await requestService.createRequest(user.id, {
			request_type: 'direct',
			title: 'Emergency Breaker Box Repair',
			description: 'Main breaker keeps tripping during peak load',
			location: 'San Francisco, CA',
			target_worker_account_id: worker.id,
			budget: 300.00,
			urgency: 'high',
		});
		console.log('PASS: Direct request created:', directReq.id, '| Status:', directReq.status);

		// 5. Worker views incoming direct requests
		console.log('5. Worker fetching incoming direct requests...');
		const incoming = await requestService.getIncomingDirectRequests(worker.id);
		console.log(`PASS: Worker found ${incoming.length} incoming direct request(s).`);

		// 6. Targeted worker accepts direct request
		console.log('6. Worker accepting direct request...');
		const acceptRes = await requestService.respondToDirectRequest(worker.id, directReq.id, {
			action: 'accept',
			note: 'Accepted. Will arrive at 10 AM tomorrow.',
		});
		console.log('PASS: Direct request response result:', acceptRes.message);

		// 7. Progress job status: accepted -> in_progress -> completed
		console.log('7. Advancing job status to in_progress...');
		const inProgressReq = await requestService.updateJobStatus(worker.id, directReq.id, {
			status: 'in_progress',
			note: 'Work started on breaker panel.',
		});
		console.log('PASS: Job status updated to:', inProgressReq.status);

		console.log('8. Advancing job status to completed...');
		const completedReq = await requestService.updateJobStatus(worker.id, directReq.id, {
			status: 'completed',
			note: 'Replaced faulty breaker and tested lines.',
		});
		console.log('PASS: Job status updated to:', completedReq.status);

		// 8. User submits Rating & Review
		console.log('9. Customer submitting review and rating...');
		const reviewRes = await reviewService.createReview(user.id, {
			request_id: directReq.id,
			rating: 5,
			review_text: 'Outstanding work! Very professional and fast.',
		});
		console.log('PASS: Review created:', reviewRes.id, '| Rating:', reviewRes.rating);
		console.log('PASS: Updated Worker Avg Rating:', reviewRes.worker_new_avg_rating, '| Rating Count:', reviewRes.worker_new_ratings_count);

		// 9. Fetch worker reviews
		console.log('10. Fetching worker reviews...');
		const workerReviews = await reviewService.getWorkerReviews(worker.id);
		console.log(`PASS: Retrieved ${workerReviews.length} review(s) for worker.`);

		console.log('\n--- ALL PHASE 3 TESTS PASSED SUCCESSFULLY! ---');
		process.exit(0);
	} catch (err) {
		console.error('TEST ERROR:', err);
		process.exit(1);
	}
}

runPhase3Test();
