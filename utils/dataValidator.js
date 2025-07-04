/**
 * Utility functions for validating and sanitizing cloud dashboard data
 */

const validateColumns = (columns) => {
  if (!Array.isArray(columns)) {
    throw new Error('Columns must be an array');
  }
  
  if (columns.length === 0) {
    throw new Error('At least one column is required');
  }
  
  const validColumns = columns.filter(col => col && typeof col === 'string' && col.trim().length > 0);
  
  if (validColumns.length !== columns.length) {
    throw new Error('All columns must be non-empty strings');
  }
  
  // Check for duplicate columns
  const uniqueColumns = [...new Set(validColumns)];
  if (uniqueColumns.length !== validColumns.length) {
    throw new Error('Duplicate columns are not allowed');
  }
  
  return validColumns;
};

const validateRows = (rows, columns) => {
  if (!Array.isArray(rows)) {
    throw new Error('Rows must be an array');
  }
  
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('Valid columns array is required for row validation');
  }
  
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') {
      throw new Error(`Row ${index + 1} must be a valid object`);
    }
    
    const validatedRow = {};
    columns.forEach(column => {
      // Ensure each row has all columns
      validatedRow[column] = row[column] !== undefined ? String(row[column]).trim() : '';
    });
    
    return validatedRow;
  });
};

const sanitizeReportData = (data) => {
  const sanitized = {};
  
  // Validate and sanitize report title
  if (data.reportTitle && typeof data.reportTitle === 'string') {
    sanitized.reportTitle = data.reportTitle.trim().substring(0, 200);
  }
  
  // Validate and sanitize report dates
  if (data.reportDates && typeof data.reportDates === 'object') {
    sanitized.reportDates = {};
    
    if (data.reportDates.startDate) {
      const startDate = new Date(data.reportDates.startDate);
      if (!isNaN(startDate.getTime())) {
        sanitized.reportDates.startDate = startDate;
      }
    }
    
    if (data.reportDates.endDate) {
      const endDate = new Date(data.reportDates.endDate);
      if (!isNaN(endDate.getTime())) {
        sanitized.reportDates.endDate = endDate;
      }
    }
  }
  
  // Validate and sanitize total space used (cloud reports only)
  if (data.totalSpaceUsed && typeof data.totalSpaceUsed === 'string') {
    sanitized.totalSpaceUsed = data.totalSpaceUsed.trim().substring(0, 100);
  }
  
  // Validate columns and rows
  if (data.columns) {
    sanitized.columns = validateColumns(data.columns);
    
    if (data.rows) {
      sanitized.rows = validateRows(data.rows, sanitized.columns);
    }
  }
  
  return sanitized;
};

const ensureRowColumnsConsistency = (rows, columns) => {
  if (!Array.isArray(rows) || !Array.isArray(columns)) {
    return [];
  }
  
  return rows.map(row => {
    const consistentRow = {};
    
    // Ensure all columns exist in the row
    columns.forEach(column => {
      consistentRow[column] = row[column] || '';
    });
    
    return consistentRow;
  });
};

module.exports = {
  validateColumns,
  validateRows,
  sanitizeReportData,
  ensureRowColumnsConsistency
};