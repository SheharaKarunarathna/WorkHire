function validateCreateScheduleSlot(req, res, next) {
	const { slot_date, start_time, end_time } = req.body;

	if (!slot_date || !start_time || !end_time) {
		return res.status(400).json({
			error: 'slot_date, start_time, and end_time are required',
		});
	}

	// Validate slot_date format YYYY-MM-DD
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(String(slot_date))) {
		return res.status(400).json({
			error: 'slot_date must be in YYYY-MM-DD format',
		});
	}

	const dateObj = new Date(slot_date);
	if (isNaN(dateObj.getTime())) {
		return res.status(400).json({
			error: 'slot_date is invalid',
		});
	}

	// Ensure slot_date is not in the past (comparing date string YYYY-MM-DD with today's YYYY-MM-DD)
	const todayStr = new Date().toISOString().split('T')[0];
	if (slot_date < todayStr) {
		return res.status(400).json({
			error: 'slot_date cannot be in the past',
		});
	}

	// Validate start_time and end_time format (HH:MM or HH:MM:SS)
	const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
	if (!timeRegex.test(String(start_time))) {
		return res.status(400).json({
			error: 'start_time must be in HH:MM or HH:MM:SS format (24-hour)',
		});
	}

	if (!timeRegex.test(String(end_time))) {
		return res.status(400).json({
			error: 'end_time must be in HH:MM or HH:MM:SS format (24-hour)',
		});
	}

	// Convert times to total seconds to compare start_time < end_time
	const parseTimeToSeconds = (tStr) => {
		const parts = tStr.split(':').map(Number);
		return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
	};

	if (parseTimeToSeconds(end_time) <= parseTimeToSeconds(start_time)) {
		return res.status(400).json({
			error: 'end_time must be strictly after start_time',
		});
	}

	next();
}

module.exports = {
	validateCreateScheduleSlot,
};
