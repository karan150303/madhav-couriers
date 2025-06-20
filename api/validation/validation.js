module.exports = {
  loginValidation: (data) => {
    if (!data.username || !data.password) {
      return { error: { details: [{ message: 'Username and password are required' }] } };
    }
    return { error: null };
  }
};
