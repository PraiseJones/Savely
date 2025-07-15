const supabase = require("../services/supabaseClient");

function daysBetween(date1, date2) {
  const diff = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
  return diff;
}

const simulateDeductions = async (req, res) => {
  const { data: vaults, error } = await supabase.from("vaults").select("*");

  if (error) return res.status(500).json({ error: error.message });

  const today = new Date();

  const results = [];

  for (const vault of vaults) {
    const { user_id, deduction_freq, deduction_amt, last_deducted } = vault;

    if (!deduction_freq || !deduction_amt) continue;

    const { data: account, error: accError } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (accError || !account) continue;

    const daysSince = last_deducted
      ? daysBetween(new Date(last_deducted), today)
      : Infinity;

    const shouldDeduct =
      (deduction_freq === "daily" && daysSince >= 1) ||
      (deduction_freq === "weekly" && daysSince >= 7) ||
      (deduction_freq === "monthly" && daysSince >= 30);

    if (!shouldDeduct || account.balance < deduction_amt) continue;

    // Deduct from account
    const newBalance = account.balance - deduction_amt;
    await supabase
      .from("accounts")
      .update({ balance: newBalance })
      .eq("user_id", user_id);

    // Add to vault
    await supabase
      .from("vaults")
      .update({
        balance: vault.balance + deduction_amt,
        last_deducted: today.toISOString().split("T")[0],
      })
      .eq("id", vault.id);

    results.push({
      user_id,
      vault_id: vault.id,
      deducted: deduction_amt,
    });
  }

  return res.status(200).json({ message: "Deductions simulated", results });
};

module.exports = { simulateDeductions };
