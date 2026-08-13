const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const { validateCreateScheduleSlot } = require('../middleware/validateSchedule');
const {
	createSlot,
	getMySlots,
	getWorkerSlots,
	deleteSlot,
} = require('../controllers/schedule.controller');

const router = express.Router();

// Worker endpoints
router.post('/me', authenticateToken, authorizeRoles(['worker']), validateCreateScheduleSlot, createSlot);
router.get('/me', authenticateToken, authorizeRoles(['worker']), getMySlots);
router.delete('/me/:slotId', authenticateToken, authorizeRoles(['worker']), deleteSlot);

// Public / User lookup endpoint for a worker's schedule
router.get('/worker/:workerId', getWorkerSlots);

module.exports = router;
