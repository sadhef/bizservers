const mongoose = require('mongoose');

const cloudReportSchema = new mongoose.Schema({
  reportTitle: {
    type: String,
    default: 'Cloud Status Report',
    trim: true,
    maxlength: [200, 'Report title cannot exceed 200 characters']
  },
  reportDates: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: Date.now
    }
  },
  totalSpaceUsed: {
    type: String,
    default: '',
    trim: true,
    maxlength: [100, 'Total space used cannot exceed 100 characters']
  },
  columns: {
    type: [String],
    default: ['Server', 'Status', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'SSL Expiry', 'Space Used', 'Remarks'],
    validate: {
      validator: function(arr) {
        return arr && arr.length > 0 && arr.every(col => col && col.trim().length > 0);
      },
      message: 'At least one non-empty column is required'
    }
  },
  rows: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
    validate: {
      validator: function(arr) {
        return Array.isArray(arr);
      },
      message: 'Rows must be an array'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
cloudReportSchema.index({ createdBy: 1, updatedAt: -1 });
cloudReportSchema.index({ updatedAt: -1 });
cloudReportSchema.index({ isActive: 1 });

// Virtual for row count
cloudReportSchema.virtual('rowCount').get(function() {
  return this.rows ? this.rows.length : 0;
});

// Virtual for column count
cloudReportSchema.virtual('columnCount').get(function() {
  return this.columns ? this.columns.length : 0;
});

// Static method to get or create latest report
cloudReportSchema.statics.getLatestReport = async function(userId) {
  try {
    console.log(`[CloudReport Model] Getting latest report for user: ${userId}`);
    
    let report = await this.findOne({ 
      isActive: true 
    }).sort({ updatedAt: -1 });
    
    if (!report) {
      console.log(`[CloudReport Model] No existing report found, creating new one`);
      report = await this.create({
        createdBy: userId,
        updatedBy: userId,
        reportTitle: 'Cloud Status Report',
        reportDates: {
          startDate: new Date(),
          endDate: new Date()
        },
        columns: ['Server', 'Status', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'SSL Expiry', 'Space Used', 'Remarks'],
        rows: [],
        totalSpaceUsed: ''
      });
      console.log(`[CloudReport Model] Created new report with ID: ${report._id}`);
    } else {
      console.log(`[CloudReport Model] Found existing report with ID: ${report._id}, rows: ${report.rows.length}`);
    }
    
    return report;
  } catch (error) {
    console.error('[CloudReport Model] Error in getLatestReport:', error);
    throw error;
  }
};

// Method to validate row data
cloudReportSchema.methods.validateRows = function() {
  if (!this.rows || !Array.isArray(this.rows)) {
    this.rows = [];
    return true;
  }
  
  // Check if all rows have the required columns
  const validRows = this.rows.filter(row => {
    if (!row || typeof row !== 'object') return false;
    return this.columns.every(column => row.hasOwnProperty(column));
  });
  
  // Update with valid rows
  this.rows = validRows;
  return true;
};

// Method to ensure data consistency
cloudReportSchema.methods.ensureDataConsistency = function() {
  // Ensure columns is always an array
  if (!Array.isArray(this.columns)) {
    this.columns = ['Server', 'Status', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'SSL Expiry', 'Space Used', 'Remarks'];
  }
  
  // Remove empty columns
  this.columns = this.columns.filter(col => col && col.trim().length > 0);
  
  // Ensure rows is always an array
  if (!Array.isArray(this.rows)) {
    this.rows = [];
  }
  
  // Ensure each row has all columns
  this.rows = this.rows.map(row => {
    if (!row || typeof row !== 'object') {
      const newRow = {};
      this.columns.forEach(column => {
        newRow[column] = '';
      });
      return newRow;
    }
    
    // Add missing columns
    this.columns.forEach(column => {
      if (!row.hasOwnProperty(column)) {
        row[column] = '';
      }
    });
    
    // Remove extra columns not in the column list
    const cleanRow = {};
    this.columns.forEach(column => {
      cleanRow[column] = row[column] || '';
    });
    
    return cleanRow;
  });
  
  return this;
};

// Pre-save middleware
cloudReportSchema.pre('save', function(next) {
  console.log(`[CloudReport Model] Pre-save: Saving report with ${this.rows.length} rows and ${this.columns.length} columns`);
  
  // Ensure data consistency
  this.ensureDataConsistency();
  
  // Validate rows
  this.validateRows();
  
  // Increment version on update
  if (!this.isNew) {
    this.version += 1;
  }
  
  next();
});

// Post-save middleware
cloudReportSchema.post('save', function(doc) {
  console.log(`[CloudReport Model] Post-save: Report ${doc._id} saved successfully with ${doc.rows.length} rows`);
});

// Pre-validate middleware
cloudReportSchema.pre('validate', function(next) {
  // Ensure data consistency before validation
  this.ensureDataConsistency();
  next();
});

// Error handling
cloudReportSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Report with this configuration already exists'));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('CloudReport', cloudReportSchema);