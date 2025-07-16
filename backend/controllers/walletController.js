const supabase = require("../services/supabaseClient");

// Constants and configuration
const CONFIG = {
  BANKS: [
    "First National Bank",
    "City Trust Bank", 
    "Metropolitan Savings",
    "Union Credit Bank",
    "Heritage Financial",
    "Central Trust Co",
    "Premier Banking",
    "Community Bank"
  ],
  FIRST_NAMES: ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "Robert", "Anna", "James", "Maria"],
  LAST_NAMES: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor"],
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 1000000
};

// Validation schemas
const VALIDATION_SCHEMAS = {
  fund: {
    amount: (value) => {
      if (!value || isNaN(value)) return "Amount must be a valid number";
      if (value < CONFIG.MIN_AMOUNT) return `Amount must be at least $${CONFIG.MIN_AMOUNT}`;
      if (value > CONFIG.MAX_AMOUNT) return `Amount cannot exceed $${CONFIG.MAX_AMOUNT}`;
      return null;
    }
  },
  withdrawal: {
    amount: (value) => {
      if (!value || isNaN(value)) return "Amount must be a valid number";
      if (value < CONFIG.MIN_AMOUNT) return `Amount must be at least $${CONFIG.MIN_AMOUNT}`;
      if (value > CONFIG.MAX_AMOUNT) return `Amount cannot exceed $${CONFIG.MAX_AMOUNT}`;
      return null;
    },
    account_number: (value) => {
      if (!value || typeof value !== 'string') return "Account number is required";
      if (value.length < 8 || value.length > 20) return "Account number must be between 8 and 20 characters";
      if (!/^\d+$/.test(value)) return "Account number must contain only digits";
      return null;
    },
    bank_name: (value) => {
      if (!value || typeof value !== 'string') return "Bank name is required";
      if (!CONFIG.BANKS.includes(value)) return "Invalid bank name";
      return null;
    }
  }
};

// Utility functions
const utils = {
  generateMockName: () => {
    const firstName = CONFIG.FIRST_NAMES[Math.floor(Math.random() * CONFIG.FIRST_NAMES.length)];
    const lastName = CONFIG.LAST_NAMES[Math.floor(Math.random() * CONFIG.LAST_NAMES.length)];
    return `${firstName} ${lastName}`;
  },

  validateInput: (schema, data) => {
    const errors = {};
    for (const [field, validator] of Object.entries(schema)) {
      const error = validator(data[field]);
      if (error) errors[field] = error;
    }
    return Object.keys(errors).length === 0 ? null : errors;
  },

  formatCurrency: (amount) => {
    return parseFloat(amount).toFixed(2);
  },

  sanitizeAmount: (amount) => {
    return parseFloat(parseFloat(amount).toFixed(2));
  }
};

// Database service layer
const walletService = {
  async getWalletByUserId(userId) {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    return { data, error };
  },

  async getWalletBalance(userId) {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    return { data, error };
  },

  async updateWalletBalance(userId, newBalance) {
    const { error } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", userId);

    return { error };
  },

  async recordTransaction(transactionData) {
    const { error } = await supabase
      .from("transactions")
      .insert([{
        ...transactionData,
        created_at: new Date().toISOString()
      }]);

    return { error };
  },

  async getTransactionHistory(userId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return { data, error };
  }
};

// Business logic layer
const walletBusinessLogic = {
  async processFunding(userId, amount) {
    // Get current wallet
    const { data: wallet, error: fetchError } = await walletService.getWalletBalance(userId);
    
    if (fetchError) {
      throw new Error("Could not fetch wallet");
    }

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const currentBalance = utils.sanitizeAmount(wallet.balance);
    const fundingAmount = utils.sanitizeAmount(amount);
    const newBalance = utils.sanitizeAmount(currentBalance + fundingAmount);

    // Update wallet balance
    const { error: updateError } = await walletService.updateWalletBalance(userId, newBalance);
    
    if (updateError) {
      throw new Error("Could not fund wallet");
    }

    // Record transaction
    await walletService.recordTransaction({
      user_id: userId,
      type: "fund",
      amount: fundingAmount,
      balance_after: newBalance,
      description: "Wallet funding from external source"
    });

    return {
      previous_balance: currentBalance,
      amount_funded: fundingAmount,
      new_balance: newBalance
    };
  },

  async processWithdrawal(userId, amount, accountNumber, bankName) {
    // Get current wallet
    const { data: wallet, error: fetchError } = await walletService.getWalletBalance(userId);
    
    if (fetchError) {
      throw new Error("Could not fetch wallet");
    }

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const currentBalance = utils.sanitizeAmount(wallet.balance);
    const withdrawalAmount = utils.sanitizeAmount(amount);

    // Check sufficient balance
    if (currentBalance < withdrawalAmount) {
      throw new Error("Insufficient balance");
    }

    const newBalance = utils.sanitizeAmount(currentBalance - withdrawalAmount);
    const accountHolderName = utils.generateMockName();

    // Update wallet balance
    const { error: updateError } = await walletService.updateWalletBalance(userId, newBalance);
    
    if (updateError) {
      throw new Error("Could not process withdrawal");
    }

    // Record transaction
    await walletService.recordTransaction({
      user_id: userId,
      type: "withdrawal",
      amount: withdrawalAmount,
      balance_after: newBalance,
      description: `Withdrawal to ${bankName} - ${accountHolderName}`
    });

    return {
      previous_balance: currentBalance,
      amount_withdrawn: withdrawalAmount,
      new_balance: newBalance,
      account_number: accountNumber,
      bank_name: bankName,
      account_holder_name: accountHolderName
    };
  }
};

// Controller functions
const getWalletBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error } = await walletService.getWalletByUserId(userId);

    if (error) {
      return next({
        statusCode: 500,
        message: "Could not fetch wallet balance",
        error_code: "DB_ERROR"
      });
    }

    if (!wallet) {
      return next({
        statusCode: 404,
        message: "Wallet not found",
        error_code: "WALLET_NOT_FOUND"
      });
    }

    return res.status(200).json({ 
      balance: utils.formatCurrency(wallet.balance),
      created_at: wallet.created_at
    });
  } catch (err) {
    next(err);
  }
};

const fundWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    // Validate input
    const validationErrors = utils.validateInput(VALIDATION_SCHEMAS.fund, { amount });
    if (validationErrors) {
      return next({
        statusCode: 400,
        message: Object.values(validationErrors)[0],
        error_code: "VALIDATION_ERROR"
      });
    }

    const result = await walletBusinessLogic.processFunding(userId, amount);

    return res.status(200).json({ 
      message: "Wallet funded successfully",
      ...result
    });
  } catch (err) {
    return next({
      statusCode: 500,
      message: err.message,
      error_code: "FUNDING_ERROR"
    });
  }
};

const getAvailableBanks = async (req, res, next) => {
  try {
    const banks = CONFIG.BANKS.map(bank => ({
      name: bank,
      id: bank.toLowerCase().replace(/\s+/g, '_')
    }));

    return res.status(200).json({ banks });
  } catch (err) {
    next(err);
  }
};

const withdrawFromWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, account_number, bank_name } = req.body;

    // Validate input
    const validationErrors = utils.validateInput(VALIDATION_SCHEMAS.withdrawal, { 
      amount, 
      account_number, 
      bank_name 
    });
    
    if (validationErrors) {
      return next({
        statusCode: 400,
        message: Object.values(validationErrors)[0],
        error_code: "VALIDATION_ERROR"
      });
    }

    const result = await walletBusinessLogic.processWithdrawal(userId, amount, account_number, bank_name);

    return res.status(200).json({ 
      message: "Withdrawal successful",
      ...result,
      transaction_type: "withdrawal"
    });
  } catch (err) {
    return next({
      statusCode: err.message.includes("Insufficient") ? 400 : 500,
      message: err.message,
      error_code: "WITHDRAWAL_ERROR"
    });
  }
};

const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Validate pagination parameters
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return next({
        statusCode: 400,
        message: "Limit must be between 1 and 100",
        error_code: "VALIDATION_ERROR"
      });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return next({
        statusCode: 400,
        message: "Offset must be a non-negative number",
        error_code: "VALIDATION_ERROR"
      });
    }

    const { data: transactions, error } = await walletService.getTransactionHistory(userId, limitNum, offsetNum);

    if (error) {
      return next({
        statusCode: 500,
        message: "Could not fetch transaction history",
        error_code: "DB_ERROR"
      });
    }

    return res.status(200).json({ 
      transactions: transactions || [],
      total_transactions: transactions ? transactions.length : 0,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        has_more: transactions && transactions.length === limitNum
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWalletBalance,
  fundWallet,
  withdrawFromWallet,
  getTransactionHistory,
  getAvailableBanks
}; 