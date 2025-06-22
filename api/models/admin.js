const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [4, 'Username must be at least 4 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin', 'manager'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  loginAttempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  lockedUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware to hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000; // Ensures token is created after password change
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
adminSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
      username: this.username
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '1h' }
  );
};

// Method to create password reset token
adminSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Static method for account lock check
adminSchema.statics.checkAccountLock = async function(username) {
  const admin = await this.findOne({ username });
  
  if (admin?.lockedUntil && admin.lockedUntil > Date.now()) {
    const retryAfter = Math.ceil((admin.lockedUntil - Date.now()) / 1000);
    throw new Error(`Account locked. Try again in ${retryAfter} seconds`);
  }
  
  return admin;
};

// Query helper to exclude inactive accounts
adminSchema.query.active = function() {
  return this.where({ isActive: true });
};

// Virtual for account status
adminSchema.virtual('status').get(function() {
  if (this.lockedUntil && this.lockedUntil > Date.now()) {
    return 'locked';
  }
  return this.isActive ? 'active' : 'inactive';
});

// Indexes
adminSchema.index({ username: 1 }, { unique: true });
adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ passwordResetToken: 1 });
adminSchema.index({ lockedUntil: 1 });

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
