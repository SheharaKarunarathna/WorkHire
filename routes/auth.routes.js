const express = require('express');
const { register } = require('../controllers/auth.controller');
const validateRegister = require('../middleware/validateRegister');

const router = express.Router();

router.post('/register', validateRegister, register);

module.exports = router;