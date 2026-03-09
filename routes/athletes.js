const express = require('express');
const Athlete = require('../models/Athlete');
const Setting = require('../models/Setting');
const router = express.Router();

// Get all athletes
router.get('/', async (req, res) => {
    try {
        const athletes = await Athlete.find();
        res.json(athletes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new athlete
router.post('/', async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (settings) {
            let isOpen = settings.registrationOpen;
            if (isOpen && settings.registrationCloseTime) {
                if (new Date() >= settings.registrationCloseTime) {
                    isOpen = false;
                }
            }
            if (!isOpen) {
                return res.status(403).json({ message: 'Registration is currently closed' });
            }
        }

        // Auto-generate sequential chest number
        const maxChestAthlete = await Athlete.findOne({ chestNumber: { $exists: true } }).sort({ chestNumber: -1 });
        let nextChestInt = 1;
        if (maxChestAthlete && maxChestAthlete.chestNumber) {
            nextChestInt = parseInt(maxChestAthlete.chestNumber, 10) + 1;
        }
        req.body.chestNumber = String(nextChestInt).padStart(3, '0');

        const athlete = new Athlete(req.body);
        await athlete.save();
        res.status(201).json(athlete);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Athlete with this Admission Number already exists' });
        res.status(500).json({ error: err.message });
    }
});

// Get by ID
router.get('/:id', async (req, res) => {
    try {
        const athlete = await Athlete.findById(req.params.id);
        if (!athlete) return res.status(404).json({ message: 'Athlete not found' });
        res.json(athlete);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update athlete
router.put('/:id', async (req, res) => {
    try {
        const athlete = await Athlete.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(athlete);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete athlete
router.delete('/:id', async (req, res) => {
    try {
        await Athlete.findByIdAndDelete(req.params.id);
        res.json({ message: 'Athlete deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
