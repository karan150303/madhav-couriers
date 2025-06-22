const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb+srv://admin:Snaka@786@.../madhav-couriers?retryWrites=true&w=majority&appName=madhav'; // ← Use your actual working URI

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  loginAttempts: Number,
  lockedUntil: mongoose.Schema.Types.Mixed
});

const Admin = mongoose.model('Admin', adminSchema);

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all existing admin users
    await Admin.deleteMany({});
    console.log('🗑️ Deleted all previous admin users');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await Admin.create({
      username: 'admin',
      password: hashedPassword,
      loginAttempts: 0,
      lockedUntil: null
    });

    console.log('✅ New admin user created: admin / admin123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to fix admin:', err.message);
    process.exit(1);
  }
})();
