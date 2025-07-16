const express = require("express");
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { 
  getWalletBalance, 
  fundWallet, 
  withdrawFromWallet, 
  getTransactionHistory,
  getAvailableBanks
} = require("../controllers/walletController");

// Get wallet balance
router.get("/balance", authenticate, getWalletBalance);

// Get available banks for withdrawal
router.get("/banks", authenticate, getAvailableBanks);

// Fund wallet from fake source
router.post("/fund", authenticate, fundWallet);

// Withdraw to fake account
router.post("/withdraw", authenticate, withdrawFromWallet);

// Get transaction history
router.get("/transactions", authenticate, getTransactionHistory);

module.exports = router; 