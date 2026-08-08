function validateUpdateProfile(req, res, next) {
	const { skills, availability, location, bio, hourly_rate } = req.body;

	if (skills !== undefined && skills !== null) {
		if (!Array.isArray(skills)) {
			return res.status(400).json({ error: 'skills must be an array of strings' });
		}
		for (const skill of skills) {
			if (typeof skill !== 'string' || skill.trim() === '') {
				return res.status(400).json({ error: 'each skill in array must be a non-empty string' });
			}
		}
		req.body.skills = skills.map((s) => s.trim().toLowerCase());
	}

	if (availability !== undefined && availability !== null) {
		if (typeof availability !== 'boolean') {
			return res.status(400).json({ error: 'availability must be a boolean' });
		}
	}

	if (location !== undefined && location !== null) {
		if (typeof location !== 'string') {
			return res.status(400).json({ error: 'location must be a string' });
		}
	}

	if (bio !== undefined && bio !== null) {
		if (typeof bio !== 'string') {
			return res.status(400).json({ error: 'bio must be a string' });
		}
		if (bio.length > 1000) {
			return res.status(400).json({ error: 'bio cannot exceed 1000 characters' });
		}
	}

	if (hourly_rate !== undefined && hourly_rate !== null) {
		const numericRate = Number(hourly_rate);
		if (!Number.isFinite(numericRate) || numericRate < 0) {
			return res.status(400).json({ error: 'hourly_rate must be a non-negative number' });
		}
		req.body.hourly_rate = numericRate;
	}

	next();
}

module.exports = {
	validateUpdateProfile,
};
