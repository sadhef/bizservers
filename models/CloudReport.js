const mongoose = require('mongoose');

const cloudReportSchema = new mongoose.Schema({
  reportTitle: {
    type: String,
    default: 'Cloud Status Report'
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
    trim: true
  },
  columns: {
    type: [String],
    default: ['Server', 'Status', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'SSL Expiry', 'Space Used', 'Remarks']
  },
  rows: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

cloudReportSchema.statics.getLatestReport = async function(userId) {
  let report = await this.findOne().sort({ updatedAt: -1 });
  
  if (!report) {
    report = await this.create({
      createdBy: userId,
      updatedBy: userId
    });
  }
  
  return report;
};

module.exports = mongoose.model('CloudReport', cloudReportSchema);