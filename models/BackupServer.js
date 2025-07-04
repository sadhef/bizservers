const mongoose = require('mongoose');

const backupServerSchema = new mongoose.Schema({
  reportTitle: {
    type: String,
    default: 'Backup Server Cronjob Status',
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
  columns: {
    type: [String],
    default: ['Server', 'SERVER STATUS', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Remarks'],
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
backupServerSchema.index({ createdBy: 1, updatedAt: -1 });
backupServerSchema.index({ updatedAt: -1 });
backupServerSchema.index({ isActive: 1 });

// Virtual for row count
backupServerSchema.virtual('rowCount').get(function() {
  return this.rows ? this.rows.length : 0;
});

// Virtual for column count
backupServerSchema.virtual('columnCount').get(function() {
  return this.columns ? this.columns.length : 0;
});

// Static method to get or create latest report
backupServerSchema.statics.getLatestReport = async function(userId) {
  try {
    console.log(`[BackupServer Model] Getting latest report for user: ${userId}`);
    
    let report = await this.findOne({ 
      isActive: true 
    }).sort({ updatedAt: -1 });
    
    if (!report) {
      console.log(`[BackupServer Model] No existing report found, creating new one`);
      report = await this.create({
        createdBy: userId,
        updatedBy: userId,
        reportTitle: 'Backup Server Cronjob Status',
        reportDates: {
          startDate: new Date(),
          endDate: new Date()
        },
        columns: ['Server', 'SERVER STATUS', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Remarks'],
        rows: []
      });
      console.log(`[BackupServer Model] Created new report with ID: ${report._id}`);
    } else {
      console.log(`[BackupServer Model] Found existing report with ID: ${report._id}, rows: ${report.rows.length}`);
    }
    
    return report;
  } catch (error) {
    console.error('[BackupServer Model] Error in getLatestReport:', error);
    throw error;
  }
};

// Method to validate row data
backupServerSchema.methods.validateRows = function() {
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
backupServerSchema.methods.ensureDataConsistency = function() {
  // Ensure columns is always an array
  if (!Array.isArray(this.columns)) {
    this.columns = ['Server', 'SERVER STATUS', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Remarks'];
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
backupServerSchema.pre('save', function(next) {
  console.log(`[BackupServer Model] Pre-save: Saving report with ${this.rows.length} rows and ${this.columns.length} columns`);
  
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
backupServerSchema.post('save', function(doc) {
  console.log(`[BackupServer Model] Post-save: Report ${doc._id} saved successfully with ${doc.rows.length} rows`);
});

// Pre-validate middleware
backupServerSchema.pre('validate', function(next) {
  // Ensure data consistency before validation
  this.ensureDataConsistency();
  next();
});

// Error handling
backupServerSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Report with this configuration already exists'));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('BackupServer', backupServerSchema);