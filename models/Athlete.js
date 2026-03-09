const mongoose = require('mongoose');

const athleteSchema = new mongoose.Schema({
    admissionNumber: { type: String, required: true, unique: true },
    chestNumber: { type: String },
    name: { type: String, required: true },
    department: { type: String, required: true },
    category: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    events: [{ type: String }], // Event names or IDs, keeping it simple as array of strings for 3 events limit
    personalBests: [{
        eventName: { type: String },
        performance: { type: String }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Athlete', athleteSchema);
