const scheduleService = require('../services/schedule.service');

async function createSlot(req, res, next) {
	try {
		const slot = await scheduleService.createScheduleSlot(req.user.sub, req.body);
		return res.status(201).json({
			message: 'Schedule slot created successfully',
			slot,
		});
	} catch (error) {
		next(error);
	}
}

async function getMySlots(req, res, next) {
	try {
		const slots = await scheduleService.getWorkerSchedules(req.user.sub, req.query);
		return res.status(200).json({ slots });
	} catch (error) {
		next(error);
	}
}

async function getWorkerSlots(req, res, next) {
	try {
		const slots = await scheduleService.getWorkerSchedules(req.params.workerId, req.query);
		return res.status(200).json({ slots });
	} catch (error) {
		next(error);
	}
}

async function deleteSlot(req, res, next) {
	try {
		const result = await scheduleService.deleteScheduleSlot(req.user.sub, req.params.slotId);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	createSlot,
	getMySlots,
	getWorkerSlots,
	deleteSlot,
};
