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
    console.log(`[CLOUD-REPORT] Getting data for user: ${req.user._id}`);
    
    let report = await CloudReport.getLatestReport(req.user._id);
    
    // Ensure all required fields exist
    if (!report.reportDates) {
      report.reportDates = {
        startDate: new Date(),
        endDate: new Date()
      };
    }
    
    if (!report.columns || !Array.isArray(report.columns)) {
      report.columns = ['Server', 'Status', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'SSL Expiry', 'Space Used', 'Remarks'];
    }
    
    if (!report.rows || !Array.isArray(report.rows)) {
      report.rows = [];
    }
    
    console.log(`[CLOUD-REPORT] Returning data - Rows: ${report.rows.length}, Columns: ${report.columns.length}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        reportTitle: report.reportTitle || 'Cloud Status Report',
        reportDates: report.reportDates,
        columns: report.columns,
        rows: report.rows,
        totalSpaceUsed: report.totalSpaceUsed || '',
        updatedAt: report.updatedAt,
        createdAt: report.createdAt
      }
    });
  } catch (error) {
    console.error('[CLOUD-REPORT] Error fetching data:', error);
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
    
    console.log(`[CLOUD-REPORT] Saving data for user: ${req.user._id}`);
    console.log(`[CLOUD-REPORT] Data to save:`, {
      columnsCount: columns ? columns.length : 0,
      rowsCount: rows ? rows.length : 0,
      reportTitle,
      totalSpaceUsed
    });
    
    // Validate required fields
    if (!columns || !Array.isArray(columns)) {
      return next(new AppError('Columns must be a valid array', 400));
    }
    
    if (!rows || !Array.isArray(rows)) {
      return next(new AppError('Rows must be a valid array', 400));
    }
    
    // Get or create report
    let report = await CloudReport.getLatestReport(req.user._id);
    
    // Update report data
    report.reportTitle = reportTitle || 'Cloud Status Report';
    report.reportDates = {
      startDate: reportDates?.startDate || new Date(),
      endDate: reportDates?.endDate || new Date()
    };
    report.columns = columns;
    report.rows = rows;
    report.totalSpaceUsed = totalSpaceUsed || '';
    report.updatedBy = req.user._id;
    
    // Save the report
    const savedReport = await report.save();
    
    console.log(`[CLOUD-REPORT] Data saved successfully with ID: ${savedReport._id}`);
    console.log(`[CLOUD-REPORT] Saved data contains ${savedReport.rows.length} rows and ${savedReport.columns.length} columns`);
    
    res.status(200).json({
      status: 'success',
      message: 'Cloud report data saved successfully',
      data: {
        id: savedReport._id,
        rowsCount: savedReport.rows.length,
        columnsCount: savedReport.columns.length,
        updatedAt: savedReport.updatedAt
      }
    });
  } catch (error) {
    console.error('[CLOUD-REPORT] Error saving data:', error);
    return next(new AppError('Failed to save cloud report data', 500));
  }
});

// Get cloud report history
router.get('/history', async (req, res, next) => {
  try {
    const reports = await CloudReport.find()
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .limit(50); // Limit to last 50 reports
    
    res.status(200).json({
      status: 'success',
      results: reports.length,
      data: {
        reports
      }
    });
  } catch (error) {
    console.error('[CLOUD-REPORT] Error fetching history:', error);
    return next(new AppError('Failed to fetch cloud report history', 500));
  }
});

// Delete specific report
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const report = await CloudReport.findById(id);
    if (!report) {
      return next(new AppError('Report not found', 404));
    }
    
    // Check if user has permission to delete
    if (req.user.role !== 'admin' && report.createdBy.toString() !== req.user._id.toString()) {
      return next(new AppError('You do not have permission to delete this report', 403));
    }
    
    await CloudReport.findByIdAndDelete(id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('[CLOUD-REPORT] Error deleting report:', error);
    return next(new AppError('Failed to delete report', 500));
  }
});

module.exports = router;