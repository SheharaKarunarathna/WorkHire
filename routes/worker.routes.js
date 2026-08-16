const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const { validateUpdateProfile } = require('../middleware/validateWorkerProfile');
const {
	getMyProfile,
	updateProfile,
	getAllWorkers,
	getWorkerById,
	updateWorkerVerification,
} = require('../controllers/worker.controller');

const router = express.Router();

router.get('/', getAllWorkers);
router.get('/profile/me', authenticateToken, authorizeRoles(['worker']), getMyProfile);
router.put('/profile/me', authenticateToken, authorizeRoles(['worker']), validateUpdateProfile, updateProfile);
router.patch('/:workerId/verify', authenticateToken, authorizeRoles(['admin', 'operator', 'worker']), updateWorkerVerification);
router.get('/:id', getWorkerById);

module.exports = router;

