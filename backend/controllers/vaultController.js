const supabase = require("../services/supabaseClient");

const createVault = async (req, res) => {
  const {
    title,
    amount,
    lock_date,
    funding_method, // 'wallet' or 'card' (card for future use)
    deduction_amt, // how much to deduct
    deduction_freq, // 'daily', 'weekly', or 'monthly'
  } = req.body;
  const user_id = require("../utils/devUserId");

  if (!title || !amount || !lock_date) {
    return res.status(400).json({ error: "All fields are required" });
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
        funding_method: funding_method || 'wallet',
        deduction_amt: deduction_amt || null,
        deduction_freq: deduction_freq || null,
        last_deducted: null,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ vault: data });
};

const depositToVault = async (req, res) => {
  const vaultId = req.params.id;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Amount must be greater than 0" });
  }

  // Get the vault
  const { data: vault, error: fetchError } = await supabase
    .from("vaults")
    .select("*")
    .eq("id", vaultId)
    .single();

  if (fetchError || !vault) {
    return res.status(404).json({ error: "Vault not found" });
  }

  const newBalance = parseFloat(vault.balance) + parseFloat(amount);

  // Update the balance
  const { error: updateError } = await supabase
    .from("vaults")
    .update({ balance: newBalance })
    .eq("id", vaultId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  res.status(200).json({ message: "Deposit successful", newBalance });
};

module.exports = {
  depositToVault,
  createVault,
};
