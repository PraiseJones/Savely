const express = require('express');
const cors = require('cors');
require('dotenv').config();


const userRoutes = require('./routes/userRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const walletRoutes = require('./routes/walletRoutes');
const deductionRoutes = require('./routes/deductionRoutes');
const errorHandler = require('./middleware/errorHandler');


const app = express();
app.use(cors());
app.use(express.json());


app.use('/api/users', userRoutes);
app.use('/api/vaults', vaultRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/deductions', deductionRoutes);

app.use(errorHandler);

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;