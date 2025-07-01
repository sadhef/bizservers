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
    console.log(`[BACKUP-SERVER] Getting data for user: ${req.user._id}`);
    
    let report = await BackupServer.getLatestReport(req.user._id);
    
    // Ensure all required fields exist
    if (!report.reportDates) {
      report.reportDates = {
        startDate: new Date(),
        endDate: new Date()
      };
    }
    
    if (!report.columns || !Array.isArray(report.columns)) {
      report.columns = ['Server', 'SERVER STATUS', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Remarks'];
    }
    
    if (!report.rows || !Array.isArray(report.rows)) {
      report.rows = [];
    }
    
    console.log(`[BACKUP-SERVER] Returning data - Rows: ${report.rows.length}, Columns: ${report.columns.length}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        reportTitle: report.reportTitle || 'Backup Server Cronjob Status',
        reportDates: report.reportDates,
        columns: report.columns,
        rows: report.rows,
        updatedAt: report.updatedAt,
        createdAt: report.createdAt
      }
    });
  } catch (error) {
    console.error('[BACKUP-SERVER] Error fetching data:', error);
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
    
    console.log(`[BACKUP-SERVER] Saving data for user: ${req.user._id}`);
    console.log(`[BACKUP-SERVER] Data to save:`, {
      columnsCount: columns ? columns.length : 0,
      rowsCount: rows ? rows.length : 0,
      reportTitle
    });
    
    // Validate required fields
    if (!columns || !Array.isArray(columns)) {
      return next(new AppError('Columns must be a valid array', 400));
    }
    
    if (!rows || !Array.isArray(rows)) {
      return next(new AppError('Rows must be a valid array', 400));
    }
    
    // Get or create report
    let report = await BackupServer.getLatestReport(req.user._id);
    
    // Update report data
    report.reportTitle = reportTitle || 'Backup Server Cronjob Status';
    report.reportDates = {
      startDate: reportDates?.startDate || new Date(),
      endDate: reportDates?.endDate || new Date()
    };
    report.columns = columns;
    report.rows = rows;
    report.updatedBy = req.user._id;
    
    // Save the report
    const savedReport = await report.save();
    
    console.log(`[BACKUP-SERVER] Data saved successfully with ID: ${savedReport._id}`);
    console.log(`[BACKUP-SERVER] Saved data contains ${savedReport.rows.length} rows and ${savedReport.columns.length} columns`);
    
    res.status(200).json({
      status: 'success',
      message: 'Backup server data saved successfully',
      data: {
        id: savedReport._id,
        rowsCount: savedReport.rows.length,
        columnsCount: savedReport.columns.length,
        updatedAt: savedReport.updatedAt
      }
    });
  } catch (error) {
    console.error('[BACKUP-SERVER] Error saving data:', error);
    return next(new AppError('Failed to save backup server data', 500));
  }
});

// Get backup server history
router.get('/history', async (req, res, next) => {
  try {
    const reports = await BackupServer.find()
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .limit(50);
    
    res.status(200).json({
      status: 'success',
      results: reports.length,
      data: {
        reports
      }
    });
  } catch (error) {
    console.error('[BACKUP-SERVER] Error fetching history:', error);
    return next(new AppError('Failed to fetch backup server history', 500));
  }
});

// Delete specific backup server report
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const report = await BackupServer.findById(id);
    if (!report) {
      return next(new AppError('Report not found', 404));
    }
    
    // Check if user has permission to delete
    if (req.user.role !== 'admin' && report.createdBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You do not have permission to delete this report', 403));
    }
    
    await BackupServer.findByIdAndDelete(id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('[BACKUP-SERVER] Error deleting report:', error);
    return next(new AppError('Failed to delete report', 500));
  }
});

module.exports = router;