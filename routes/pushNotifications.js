const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, restrictTo } = require('../middleware/auth');
const PushService = require('../services/pushService');
const { AppError } = require('../utils/errorHandler');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      publicKey: process.env.VAPID_PUBLIC_KEY
    }
  });
});

// Subscribe to push notifications
router.post('/subscribe', [
  body('subscription.endpoint').isURL().withMessage('Valid endpoint required'),
  body('subscription.keys.p256dh').notEmpty().withMessage('p256dh key required'),
  body('subscription.keys.auth').notEmpty().withMessage('auth key required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { subscription } = req.body;
    const result = await PushService.subscribe(req.user._id, subscription);
    
    res.status(201).json({
      status: 'success',
      message: 'Subscribed to push notifications',
      data: { subscriptionId: result._id }
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    next(new AppError('Failed to subscribe to notifications', 500));
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const deletedCount = await PushService.unsubscribe(req.user._id);
    
    res.status(200).json({
      status: 'success',
      message: 'Unsubscribed from push notifications',
      data: { deletedSubscriptions: deletedCount }
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    next(new AppError('Failed to unsubscribe from notifications', 500));
  }
});

// Check subscription status
router.get('/status', async (req, res, next) => {
  try {
    const isSubscribed = await PushService.isUserSubscribed(req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: { isSubscribed }
    });
  } catch (error) {
    console.error('Status check error:', error);
    next(new AppError('Failed to check subscription status', 500));
  }
});

// Admin-only routes
router.use(restrictTo('admin'));

// Send notification to specific user
router.post('/send-to-user', [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('message').trim().isLength({ min: 1, max: 300 }).withMessage('Message must be 1-300 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { userId, title, message, data } = req.body;
    
    const result = await PushService.sendToUser(userId, {
      title,
      body: message,
      data: data || {}
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send notification error:', error);
    next(new AppError('Failed to send notification', 500));
  }
});

// Send notification to all users
router.post('/send-to-all', [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('message').trim().isLength({ min: 1, max: 300 }).withMessage('Message must be 1-300 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { title, message, data } = req.body;
    
    const result = await PushService.sendToAllUsers({
      title,
      body: message,
      data: data || {}
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Notifications sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send bulk notification error:', error);
    next(new AppError('Failed to send notifications', 500));
  }
});

module.exports = router;