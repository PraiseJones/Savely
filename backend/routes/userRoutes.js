const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUser } = require('../controllers/userController');
const userId = require('../utils/devUserId');
// const authenticate = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/:id', getUser);

router.get('/profile', /* authenticate, */ async (req, res) => {
  // const userId = req.user.id;

  const { data, error } = await supabase
    .from('Users')
    .select('id, name, phone')
    .eq('id', userId)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ user: data });

});

module.exports = router;
