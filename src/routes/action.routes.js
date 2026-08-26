const express = require('express');
const { evaluateActionRequest } = require('../controllers/action.controller');

const router = express.Router();

router.post('/evaluate', evaluateActionRequest);

module.exports = router;
