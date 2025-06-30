const express = require('express');
const router = express.Router();
const { protect, restrictToCloud } = require('../middleware/auth');
const CloudReport = require('../models/CloudReport');
const { AppError } = require('../utils/errorHandler');

// Protect all routes
router.use(protect);
router.use(restrictToCloud);

// Get cloud report data
router.get('/data', async (req, res, next) => {
  try {
    const report = await CloudReport.getLatestReport(req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        reportTitle: report.reportTitle,
        reportDates: report.reportDates,
        columns: report.columns,
        rows: report.rows,
        totalSpaceUsed: report.totalSpaceUsed,
        updatedAt: report.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching cloud report data:', error);
    return next(new AppError('Failed to fetch cloud report data', 500));
  }
});

// Save cloud report data
router.post('/save', async (req, res, next) => {
  try {
    const { 
      columns, 
      rows, 
      reportTitle, 
      reportDates,
      totalSpaceUsed
    } = req.body;
    
    if (!columns || !Array.isArray(columns)) {
      return next(new AppError('Columns must be an array', 400));
    }
    
    if (!rows || !Array.isArray(rows)) {
      return next(new AppError('Rows must be an array', 400));
    }
    
    let report = await CloudReport.getLatestReport(req.user._id);
    
    report.reportTitle = reportTitle || 'Cloud Status Report';
    report.reportDates = reportDates || {
      startDate: new Date(),
      endDate: new Date()
    };
    report.columns = columns;
    report.rows = rows;
    report.totalSpaceUsed = totalSpaceUsed || '';
    report.updatedBy = req.user._id;
    
    await report.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Cloud report data saved successfully'
    });
  } catch (error) {
    console.error('Error saving cloud report data:', error);
    return next(new AppError('Failed to save cloud report data', 500));
  }
});

// Get cloud report history
router.get('/history', async (req, res, next) => {
  try {
    const reports = await CloudReport.find()
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    res.status(200).json({
      status: 'success',
      results: reports.length,
      data: {
        reports
      }
    });
  } catch (error) {
    console.error('Error fetching cloud report history:', error);
    return next(new AppError('Failed to fetch cloud report history', 500));
  }
});

module.exports = router;