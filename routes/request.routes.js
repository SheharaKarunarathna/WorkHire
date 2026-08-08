const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const validateCreateRequest = require('../middleware/validateCreateRequest');
const {
	createRequest,
	getIncomingDirectRequests,
	respondDirectRequest,
	updateJobStatus,
	getMyRequests,
	getRequestById,
} = require('../controllers/request.controller');

const router = express.Router();

router.post('/', authenticateToken, validateCreateRequest, createRequest);
router.get('/my-requests', authenticateToken, getMyRequests);
router.get('/direct/incoming', authenticateToken, authorizeRoles(['worker']), getIncomingDirectRequests);
router.patch('/direct/:requestId/respond', authenticateToken, authorizeRoles(['worker']), respondDirectRequest);
router.patch('/:requestId/status', authenticateToken, authorizeRoles(['worker']), updateJobStatus);
router.get('/:requestId', authenticateToken, getRequestById);

module.exports = router;
