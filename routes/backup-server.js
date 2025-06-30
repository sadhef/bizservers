const express = require('express');
const router = express.Router();
const { protect, restrictToCloud } = require('../middleware/auth');
const BackupServer = require('../models/BackupServer');
const { AppError } = require('../utils/errorHandler');

// Protect all routes
router.use(protect);
router.use(restrictToCloud);

// Get backup server data
router.get('/data', async (req, res, next) => {
  try {
    const report = await BackupServer.getLatestReport(req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        reportTitle: report.reportTitle,
        reportDates: report.reportDates,
        columns: report.columns,
        rows: report.rows,
        updatedAt: report.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching backup server data:', error);
    return next(new AppError('Failed to fetch backup server data', 500));
  }
});

// Save backup server data
router.post('/save', async (req, res, next) => {
  try {
    const { 
      columns, 
      rows, 
      reportTitle,
      reportDates
    } = req.body;
    
    if (!columns || !Array.isArray(columns)) {
      return next(new AppError('Columns must be an array', 400));
    }
    
    if (!rows || !Array.isArray(rows)) {
      return next(new AppError('Rows must be an array', 400));
    }
    
    let report = await BackupServer.getLatestReport(req.user._id);
    
    report.reportTitle = reportTitle || 'Backup Server Cronjob Status';
    report.reportDates = reportDates || {
      startDate: new Date(),
      endDate: new Date()
    };
    report.columns = columns;
    report.rows = rows;
    report.updatedBy = req.user._id;
    
    await report.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Backup server data saved successfully'
    });
  } catch (error) {
    console.error('Error saving backup server data:', error);
    return next(new AppError('Failed to save backup server data', 500));
  }
});

module.exports = router;