const express = require('express');
const { classifyLeadRequest } = require('../controllers/lead.controller');

const router = express.Router();

router.post('/classify', classifyLeadRequest);

module.exports = router;
