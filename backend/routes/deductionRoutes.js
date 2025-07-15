const express = require('express');
const router = express.Router();
const { simulateDeductions } = require('../controllers/deductionController');

router.post("/simulate", simulateDeductions);

module.exports = router;
