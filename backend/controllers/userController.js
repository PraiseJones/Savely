const supabase = require("../services/supabaseClient");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const { registerSchema, loginSchema } = require("../validators/userValidator");

const registerUser = async (req, res, next) => {
  try {
    const { error: validationError, value } = registerSchema.validate(req.body);
    if (validationError) {
      return next({
        statusCode: 400,
        message: validationError.details[0].message,
        error_code: "INVALID_INPUT"
      });
    }

    const { name, phone, password } = value;

    const { data: existingUser, error: findError } = await supabase
      .from("Users")
      .select("*")
      .eq("phone", phone)
      .single();

    if (findError) {
      logger.error(findError.message);
      return next({
        statusCode: 500,
        message: "Something went wrong during registration",
        error_code: "DB_ERROR"
      });
    }

    if (existingUser) {
      return next({
        statusCode: 409,
        message: "User already exists",
        error_code: "USER_EXISTS"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("Users")
      .insert([{ name, phone, password: hashedPassword }])
      .select()
      .single();

    if (error) {
      logger.error(error.message);
      return next({
        statusCode: 500,
        message: "Could not create user",
        error_code: "REGISTRATION_FAILED"
      });
    }

    await supabase.from("accounts").insert([
      {
        user_id: data.id,
        balance: 0,
        created_at: new Date().toISOString()
      }
    ]);

    delete data.password;

    return res.status(201).json({ user: data });
  } catch (err) {
    logger.error(err.stack);
    next(err);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { error: validationError, value } = loginSchema.validate(req.body);
    if (validationError) {
      return next({
        statusCode: 400,
        message: validationError.details[0].message,
        error_code: "INVALID_INPUT"
      });
    }

    const { phone, password } = value;

    const { data: user, error } = await supabase
      .from("Users")
      .select("*")
      .eq("phone", phone)
      .single();

    if (error) {
      logger.error(error.message);
      return next({
        statusCode: 500,
        message: "Could not verify user",
        error_code: "DB_ERROR"
      });
    }

    if (!user) {
      return next({
        statusCode: 404,
        message: "User not found",
        error_code: "USER_NOT_FOUND"
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return next({
        statusCode: 401,
        message: "Invalid password",
        error_code: "WRONG_PASSWORD"
      });
    }

    const payload = { id: user.id, phone: user.phone };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    delete user.password;

    return res.status(200).json({ user, token });
  } catch (err) {
    logger.error(err.stack);
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("Users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error(error.message);
      return next({
        statusCode: 500,
        message: "Unable to fetch user",
        error_code: "DB_ERROR"
      });
    }

    if (!data) {
      return next({
        statusCode: 404,
        message: "User not found",
        error_code: "USER_NOT_FOUND"
      });
    }

    if (data.password) delete data.password;

    return res.status(200).json({ user: data });
  } catch (err) {
    logger.error(err.stack);
    next(err);
  }
};

module.exports = { registerUser, loginUser, getUser };