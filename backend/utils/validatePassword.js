const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long';
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#\$%\^&\*\(\)_\+\-\=\[\]\{\};':"\\|,.<>\/?]+/.test(password);

  if (!hasLetter || !hasNumber || !hasSpecial) {
    return 'Password must include letters, numbers, and at least one special character';
  }

  return null;
};

module.exports = validatePassword;
