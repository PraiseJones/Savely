const express = require("express");
const router = express.Router();
// const authenticate = require('../middleware/authMiddleware');
const { createVault, depositToVault } = require("../controllers/vaultController");

router.post("/create", /* authenticate, */ createVault);
router.patch("/:id/deposit", depositToVault);

module.exports = router;
