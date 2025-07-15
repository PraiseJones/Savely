const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());


const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const vaultRoutes = require('./routes/vaultRoutes');
app.use('/api/vaults', vaultRoutes);

const deductionRoutes = require('./routes/deductionRoutes');
app.use('/api/deductions', deductionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));