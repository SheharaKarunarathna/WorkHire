const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const { validateCreateBid, validateBidParams } = require('../middleware/validateBid');
const {
	createBid,
	getBidsByRequest,
	getMyBids,
	withdrawBid,
	acceptBid,
} = require('../controllers/bid.controller');

const router = express.Router();

router.post('/', authenticateToken, authorizeRoles(['worker']), validateCreateBid, createBid);

router.get('/my-bids', authenticateToken, authorizeRoles(['worker']), getMyBids);

router.get('/request/:requestId', authenticateToken, validateBidParams, getBidsByRequest);

router.patch('/:bidId/withdraw', authenticateToken, authorizeRoles(['worker']), validateBidParams, withdrawBid);

router.post('/request/:requestId/accept/:bidId', authenticateToken, authorizeRoles(['user']), validateBidParams, acceptBid);

module.exports = router;
