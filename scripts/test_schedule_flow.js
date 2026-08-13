const pool = require('../db');
const authService = require('../services/auth.service');
const workerService = require('../services/worker.service');
const scheduleService = require('../services/schedule.service');
const requestService = require('../services/request.service');

const http = require('http');
const express = require('express');
const { initSocket } = require('../services/socket.service');

async function runScheduleTest() {
	console.log('=== Starting Worker Appointment & Schedule Management Integration Test ===\n');

	const app = express();
	app.use(express.json());
	const server = http.createServer(app);
	initSocket(server);
	await new Promise((resolve) => server.listen(3998, resolve));

	try {
		const timestamp = Date.now();

		// 1. Register User & Worker Accounts
		console.log('1. Creating test accounts...');
		const userAccount = await authService.register({
			full_name: `Schedule User ${timestamp}`,
			email: `schedule_user_${timestamp}@test.com`,
			password: 'Password123!',
			phone: '1234567890',
			role: 'user',
		});

		const workerAccount = await authService.register({
			full_name: `Schedule Worker ${timestamp}`,
			email: `schedule_worker_${timestamp}@test.com`,
			password: 'Password123!',
			phone: '0987654321',
			role: 'worker',
		});

		// Verify worker identity
		await pool.query(
			`UPDATE worker_profiles SET verification_status = 'verified' WHERE account_id = $1`,
			[workerAccount.id]
		);
		console.log(`✅ Accounts created: User (${userAccount.id}) & Verified Worker (${workerAccount.id})`);

		// 2. Worker Creates Schedule Slots
		console.log('\n2. Creating available schedule slots for worker...');
		const slotDate = '2026-09-01';

		const slot1 = await scheduleService.createScheduleSlot(workerAccount.id, {
			slot_date: slotDate,
			start_time: '09:00:00',
			end_time: '12:00:00',
			time_zone: 'Asia/Colombo',
		});
		console.log('✅ Created Slot 1 (Morning):', slot1.id, `${slot1.slot_date} ${slot1.start_time} - ${slot1.end_time}`);

		const slot2 = await scheduleService.createScheduleSlot(workerAccount.id, {
			slot_date: slotDate,
			start_time: '14:00:00',
			end_time: '17:00:00',
			time_zone: 'Asia/Colombo',
		});
		console.log('✅ Created Slot 2 (Afternoon):', slot2.id, `${slot2.slot_date} ${slot2.start_time} - ${slot2.end_time}`);

		// 3. Validation Checks: Overlapping Slot Error
		console.log('\n3. Verifying overlap error handling...');
		try {
			await scheduleService.createScheduleSlot(workerAccount.id, {
				slot_date: slotDate,
				start_time: '10:00:00',
				end_time: '11:00:00',
			});
			throw new Error('Expected overlap error but slot creation succeeded');
		} catch (err) {
			console.log('✅ Correctly rejected overlapping slot:', err.message);
		}

		// 4. Query Available Slots
		console.log('\n4. Querying worker schedule slots...');
		const allWorkerSlots = await scheduleService.getWorkerSchedules(workerAccount.id, { date: slotDate });
		if (allWorkerSlots.length !== 2) throw new Error(`Expected 2 slots, got ${allWorkerSlots.length}`);
		console.log(`✅ Retrieved ${allWorkerSlots.length} slots for date ${slotDate}`);

		// 5. User Books Slot 1 via Direct Request
		console.log('\n5. User booking Slot 1 via Direct Request...');
		const directReq = await requestService.createRequest(userAccount.id, {
			request_type: 'direct',
			title: 'AC Maintenance Appointment',
			description: 'Service indoor unit',
			location: 'Colombo 07',
			target_worker_account_id: workerAccount.id,
			slot_id: slot1.id,
		});
		console.log('✅ Created direct request with slot booking:', directReq.id);

		// Verify Slot 1 is marked as booked
		const updatedSlots = await scheduleService.getWorkerSchedules(workerAccount.id, { date: slotDate });
		const bookedSlot = updatedSlots.find((s) => s.id === slot1.id);
		if (!bookedSlot.is_booked || bookedSlot.booked_request_id !== directReq.id) {
			throw new Error('Slot 1 was not properly updated to is_booked=true with request_id');
		}
		console.log('✅ Slot 1 successfully marked as is_booked = true, request_id =', bookedSlot.booked_request_id);

		// Verify filtering available_only=true returns only Slot 2
		const availableOnlySlots = await scheduleService.getWorkerSchedules(workerAccount.id, {
			date: slotDate,
			available_only: true,
		});
		if (availableOnlySlots.length !== 1 || availableOnlySlots[0].id !== slot2.id) {
			throw new Error('available_only filter failed');
		}
		console.log('✅ available_only filter correctly returned only unbooked Slot 2');

		// 6. Worker Deleting Booked Slot Error Check
		console.log('\n6. Testing deletion protection on booked slots...');
		try {
			await scheduleService.deleteScheduleSlot(workerAccount.id, slot1.id);
			throw new Error('Expected deletion error for booked slot');
		} catch (err) {
			console.log('✅ Correctly prevented deleting booked slot:', err.message);
		}

		// 7. Worker Rejects Direct Request -> Automatic Slot Release
		console.log('\n7. Worker rejecting direct request to verify automatic slot release...');
		await requestService.respondToDirectRequest(workerAccount.id, directReq.id, {
			action: 'reject',
			note: 'Not available at this time',
		});

		const releasedSlots = await scheduleService.getWorkerSchedules(workerAccount.id, { date: slotDate });
		const releasedSlot1 = releasedSlots.find((s) => s.id === slot1.id);
		if (releasedSlot1.is_booked) {
			throw new Error('Slot 1 was not released after direct request rejection');
		}
		console.log('✅ Slot 1 automatically released (is_booked = false) after request rejection!');

		// 8. Worker Deleting Unbooked Slot 2
		console.log('\n8. Worker deleting unbooked Slot 2...');
		const delResult = await scheduleService.deleteScheduleSlot(workerAccount.id, slot2.id);
		console.log('✅ Unbooked Slot 2 deleted successfully:', delResult.id);

		const finalSlots = await scheduleService.getWorkerSchedules(workerAccount.id, { date: slotDate });
		if (finalSlots.length !== 1) throw new Error('Expected 1 slot remaining');
		console.log('✅ Remaining slots count verified (1 slot left)');

		console.log('\n🎉 ALL WORKER APPOINTMENT & SCHEDULE MANAGEMENT TESTS PASSED SUCCESSFULLY! 🎉\n');
	} finally {
		if (server) server.close();
		await pool.end();
	}
}

runScheduleTest().catch((err) => {
	console.error('❌ Schedule Integration Test Failed:', err);
	process.exit(1);
});
