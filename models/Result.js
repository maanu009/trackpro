const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true },
    performance: { type: String, required: true }, // Time or Distance
    position: { type: Number, min: 1 },
    isPB: { type: Boolean, default: false },
    isMR: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent multiple results for the same athlete in the same event unless needed (e.g. heats vs finals). 
// Here we simplify by uniquely identifying result by event and athlete.
resultSchema.index({ eventId: 1, athleteId: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
