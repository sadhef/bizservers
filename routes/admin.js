const express = require('express');
const User = require('../models/User');
const CloudReport = require('../models/CloudReport');
const BackupServer = require('../models/BackupServer');
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../utils/errorHandler');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo('admin'));

// Get admin dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, cloudUsers, pendingRequests, activeReports] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ cloudUser: true }),
      User.countDocuments({ status: 'pending' }),
      CloudReport.countDocuments()
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        cloudUsers,
        pendingRequests,
        activeReports
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get pending users
router.get('/pending-users', async (req, res, next) => {
  try {
    const users = await User.find({ status: 'pending' })
      .select('name email createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;

    let filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('name email role cloudUser status createdAt lastLogin')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('approvedBy', 'name');

    const total = await User.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Approve user
router.post('/users/:id/approve', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    await user.updateCloudAccess(true, req.user._id);

    res.status(200).json({
      status: 'success',
      message: 'User approved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Reject user
router.post('/users/:id/reject', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    await user.updateCloudAccess(false, req.user._id);

    res.status(200).json({
      status: 'success',
      message: 'User rejected successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Toggle cloud access
router.patch('/users/:id/cloud-access', async (req, res, next) => {
  try {
    const { cloudUser } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    await user.updateCloudAccess(cloudUser, req.user._id);

    res.status(200).json({
      status: 'success',
      message: `Cloud access ${cloudUser ? 'granted' : 'revoked'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.role === 'admin') {
      return next(new AppError('Cannot delete admin user', 400));
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;