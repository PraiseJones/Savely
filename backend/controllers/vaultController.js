const supabase = require("../services/supabaseClient");

const createVault = async (req, res, next) => {
  try {
    const {
      title,
      amount,
      lock_date,
      funding_method,
      deduction_amt,
      deduction_freq,
    } = req.body;
    const user_id = req.user.id; // Use authenticated user's ID

    if (!title || !amount || !lock_date) {
      return next({
        statusCode: 400,
        message: "All fields are required",
      });
    }

    const { data, error } = await supabase
      .from("vaults")
      .insert([
        {
          user_id,
          title,
          amount,
          balance: 0,
          lock_date,
          funding_method: funding_method || "wallet",
          deduction_amt: deduction_amt || null,
          deduction_freq: deduction_freq || null,
          last_deducted: null,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return next({
        statusCode: 500,
        message: "Could not create vault",
      });
    }

    return res.status(201).json({ vault: data });
  } catch (err) {
    next(err);
  }
};

const depositToVault = async (req, res, next) => {
  try {
    const vaultId = req.params.id;
    const { amount } = req.body;
    const user_id = req.user.id; // Use authenticated user's ID

    if (!amount || amount <= 0) {
      return next({
        statusCode: 400,
        message: "Amount must be greater than 0",
      });
    }

    // Get the vault and verify ownership
    const { data: vault, error: fetchError } = await supabase
      .from("vaults")
      .select("*")
      .eq("id", vaultId)
      .eq("user_id", user_id) // Ensure user owns this vault
      .single();

    if (fetchError || !vault) {
      return next({
        statusCode: 404,
        message: "Vault not found",
      });
    }

    const newBalance = parseFloat(vault.balance) + parseFloat(amount);

    // Update the balance
    const { error: updateError } = await supabase
      .from("vaults")
      .update({ balance: newBalance })
      .eq("id", vaultId);

    if (updateError) {
      return next({
        statusCode: 500,
        message: "Could not update vault balance",
      });
    }

    return res.status(200).json({ message: "Deposit successful", newBalance });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  depositToVault,
  createVault,
};
