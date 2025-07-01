const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
};

// Register
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 400));
    }

    // Create user with simplified fields
    const user = await User.create({
      name,
      email,
      password,
      status: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Registration successful! Please wait for admin approval to access cloud features.'
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 401));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from output
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      status: 'success',
      token,
      user: userObj
    });
  } catch (error) {
    next(error);
  }
});

// Verify token
router.get('/verify', protect, async (req, res) => {
  res.status(200).json({
    status: 'success',
    user: req.user
  });
});

// Logout (optional - mainly for clearing client-side data)
router.post('/logout', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

module.exports = router;