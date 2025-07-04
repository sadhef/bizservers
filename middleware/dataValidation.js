const { body, validationResult } = require('express-validator');
const { AppError } = require('../utils/errorHandler');

// Validation rules for cloud report data
const validateCloudReportData = [
  body('reportTitle')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Report title must be between 1 and 200 characters'),
  
  body('columns')
    .isArray({ min: 1 })
    .withMessage('Columns must be a non-empty array')
    .custom((columns) => {
      if (!columns.every(col => typeof col === 'string' && col.trim().length > 0)) {
        throw new Error('All columns must be non-empty strings');
      }
      
      const uniqueColumns = [...new Set(columns)];
      if (uniqueColumns.length !== columns.length) {
        throw new Error('Duplicate columns are not allowed');
      }
      
      return true;
    }),
  
  body('rows')
    .isArray()
    .withMessage('Rows must be an array')
    .custom((rows, { req }) => {
      const columns = req.body.columns;
      if (!columns || !Array.isArray(columns)) {
        throw new Error('Valid columns array is required');
      }
      
      rows.forEach((row, index) => {
        if (!row || typeof row !== 'object') {
          throw new Error(`Row ${index + 1} must be a valid object`);
        }
        
        // Check if row has required structure
        const hasRequiredColumns = columns.every(column => row.hasOwnProperty(column));
        if (!hasRequiredColumns) {
          throw new Error(`Row ${index + 1} is missing required columns`);
        }
      });
      
      return true;
    }),
  
  body('reportDates.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('reportDates.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  body('totalSpaceUsed')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Total space used must not exceed 100 characters')
];

// Validation rules for backup server data
const validateBackupServerData = [
  body('reportTitle')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Report title must be between 1 and 200 characters'),
  
  body('columns')
    .isArray({ min: 1 })
    .withMessage('Columns must be a non-empty array')
    .custom((columns) => {
      if (!columns.every(col => typeof col === 'string' && col.trim().length > 0)) {
        throw new Error('All columns must be non-empty strings');
      }
      
      const uniqueColumns = [...new Set(columns)];
      if (uniqueColumns.length !== columns.length) {
        throw new Error('Duplicate columns are not allowed');
      }
      
      return true;
    }),
  
  body('rows')
    .isArray()
    .withMessage('Rows must be an array')
    .custom((rows, { req }) => {
      const columns = req.body.columns;
      if (!columns || !Array.isArray(columns)) {
        throw new Error('Valid columns array is required');
      }
      
      rows.forEach((row, index) => {
        if (!row || typeof row !== 'object') {
          throw new Error(`Row ${index + 1} must be a valid object`);
        }
        
        // Check if row has required structure
        const hasRequiredColumns = columns.every(column => row.hasOwnProperty(column));
        if (!hasRequiredColumns) {
          throw new Error(`Row ${index + 1} is missing required columns`);
        }
      });
      
      return true;
    }),
  
  body('reportDates.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('reportDates.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
];

// Middleware to check validation results
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(`Validation failed: ${errorMessages.join(', ')}`, 400));
  }
  next();
};

module.exports = {
  validateCloudReportData,
  validateBackupServerData,
  checkValidationResult
};