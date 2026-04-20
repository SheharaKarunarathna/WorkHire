const express = require('express');
const { createRequest } = require('../controllers/request.controller');
const authenticateToken = require('../middleware/authenticateToken');
const validateCreateRequest = require('../middleware/validateCreateRequest');

const router = express.Router();

router.post('/', authenticateToken, validateCreateRequest, createRequest);

module.exports = router;
