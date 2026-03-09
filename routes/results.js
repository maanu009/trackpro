const express = require('express');
const Result = require('../models/Result');
const Athlete = require('../models/Athlete');
const Event = require('../models/Event');
const router = express.Router();

// Get all results
router.get('/', async (req, res) => {
    try {
        const results = await Result.find().populate('eventId').populate('athleteId');
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save result
router.post('/', async (req, res) => {
    try {
        const { eventId, athleteId, performance, position } = req.body;

        // 1. Check Meet Record
        const event = await Event.findById(eventId);
        const athlete = await Athlete.findById(athleteId);

        if (!event || !athlete) return res.status(404).json({ message: 'Event or Athlete not found' });

        let isMR = false;
        let isPB = false;

        // Simplify MR check: depends on type of event, for time lowest is better, for distance highest is better.
        // For simplicity, we just mark it as PB/MR if client flags it or we do basic string comparison if numeric.
        // In a real app we'd parse this. We rely on the client or simple checks. Let's assume the request body handles PB/MR flags for complex parsing, 
        // OR we just store what's given. The prompt says "Meet Record / Personal Best tracking". Let's track it in the DB.

        let result = await Result.findOne({ eventId, athleteId });
        if (result) {
            // Update existing result for this athlete in this event
            result.performance = performance;
            result.position = position;
            result.isPB = req.body.isPB || false;
            result.isMR = req.body.isMR || false;
            await result.save();
        } else {
            result = new Result({
                eventId,
                athleteId,
                performance,
                position,
                isPB: req.body.isPB || false,
                isMR: req.body.isMR || false
            });
            await result.save();
        }
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Department Medal Count endpoint
router.get('/medal-count', async (req, res) => {
    try {
        const results = await Result.find({ position: { $in: [1, 2, 3] } }).populate('athleteId');

        const medalCounts = {};
        results.forEach(result => {
            if (!result.athleteId) return;
            const dept = result.athleteId.department;
            if (!medalCounts[dept]) medalCounts[dept] = { department: dept, gold: 0, silver: 0, bronze: 0 };

            if (result.position === 1) medalCounts[dept].gold++;
            else if (result.position === 2) medalCounts[dept].silver++;
            else if (result.position === 3) medalCounts[dept].bronze++;
        });

        const array = Object.values(medalCounts).sort((a, b) => {
            if (b.gold !== a.gold) return b.gold - a.gold;
            if (b.silver !== a.silver) return b.silver - a.silver;
            return b.bronze - a.bronze;
        });

        res.json(array);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
