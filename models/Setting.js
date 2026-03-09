const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  // Global flag to manually open/close registration
  registrationOpen: {
    type: Boolean,
    default: true
  },
  // Optional date/time to automatically close registration
  registrationCloseTime: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
