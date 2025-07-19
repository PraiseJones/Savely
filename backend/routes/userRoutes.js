const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUser } = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const supabase = require('../services/supabaseClient');

router.post('/register', registerUser);
router.post('/login', loginUser);

// Specific routes should come before parameterized routes
router.get('/profile', authenticate, async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('Users')
    .select('id, name, phone')
    .eq('id', userId)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ user: data });
});

// remove in production
// router.get('/debug/list', async (req, res) => {
//   try {
//     const { data, error } = await supabase
//       .from('Users')
//       .select('id, name, phone, created_at');

//     if (error) {
//       return res.status(500).json({ error: error.message });
//     }

//     res.status(200).json({ users: data });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// Parameterized route should come last
router.get('/:id', getUser);

module.exports = router;
