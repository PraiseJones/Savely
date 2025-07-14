const supabase = require("../services/supabaseClient");
const bcrypt = require("bcrypt");
const validatePassword = require("../utils/validatePassword");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  const { name, phone, password } = req.body;

  // Basic required field check
  if (!name || !phone || !password) {
    return res
      .status(400)
      .json({ error: "Name, phone, and password are required" });
  }

  // Password validation
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  // Check if user already exists
  const { data: existingUser, error: findError } = await supabase
    .from("Users")
    .select("*")
    .eq("phone", phone)
    .single();

  if (existingUser) {
    return res
      .status(409)
      .json({ error: "User with this phone already exists" });
  }

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Insert user
  const { data, error } = await supabase
    .from("Users")
    .insert([{ name, phone, password: hashedPassword }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Never return password
  delete data.password;

  return res.status(201).json({ user: data });
};

const loginUser = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: "Phone and password are required" });
  }

  const { data: user, error } = await supabase
    .from("Users")
    .select("*")
    .eq("phone", phone)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: "User not found" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const payload = { id: user.id, phone: user.phone };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  delete user.password;

  return res.status(200).json({ user, token });
};

const getUser = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("Users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "User not found" });
  }

  // Never return password
  if (data.password) delete data.password;

  return res.status(200).json({ user: data });
};

module.exports = { registerUser, loginUser, getUser };
