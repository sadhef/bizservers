const mongoose = require('mongoose');

const backupServerSchema = new mongoose.Schema({
  reportTitle: {
    type: String,
    default: 'Backup Server Cronjob Status'
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
    default: ['Server', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Remarks']
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

backupServerSchema.statics.getLatestReport = async function(userId) {
  let report = await this.findOne().sort({ updatedAt: -1 });
  
  if (!report) {
    report = await this.create({
      createdBy: userId,
      updatedBy: userId
    });
  }
  
  return report;
};

module.exports = mongoose.model('BackupServer', backupServerSchema);