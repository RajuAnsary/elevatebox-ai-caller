const express = require('express');
const { scheduleCallbackRequest } = require('../controllers/callback.controller');

const router = express.Router();

router.post('/schedule', scheduleCallbackRequest);

module.exports = router;
