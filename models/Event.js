const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ['Standard', 'Junior', 'Senior', 'Boys', 'Girls', 'Men', 'Women', 'Mixed'], required: true },
    type: { type: String, enum: ['Track', 'Field'], required: true },
    meetRecord: {
        performance: { type: String },
        athleteName: { type: String },
        year: { type: String }
    }
}, { timestamps: true });

// Ensure uniqueness of event name within a category
eventSchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Event', eventSchema);
