// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // You can replace this with logging to a service

  const status = err.statusCode || 500;
  const message =
    err.message || "Something went wrong. Please try again later.";

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
