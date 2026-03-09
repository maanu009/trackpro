const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const authMiddleware = require('./authMiddleware');

// Helper to get or create settings
async function getSettings() {
    let settings = await Setting.findOne();
    if (!settings) {
        settings = new Setting();
        await settings.save();
    }
    return settings;
}

// @route   GET /api/settings
// @desc    Get current global settings (public)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const settings = await getSettings();
        // Calculate if registration is effectively open
        let isOpen = settings.registrationOpen;
        if (isOpen && settings.registrationCloseTime) {
            if (new Date() >= settings.registrationCloseTime) {
                isOpen = false;
            }
        }

        res.json({
            registrationOpen: isOpen,
            manualRegistrationOpen: settings.registrationOpen, // The explicit manual flag
            registrationCloseTime: settings.registrationCloseTime
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/settings
// @desc    Update global settings
// @access  Private (Admin only)
router.post('/', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const { registrationOpen, registrationCloseTime } = req.body;

    try {
        const settings = await getSettings();

        if (registrationOpen !== undefined) {
            settings.registrationOpen = registrationOpen;
        }
        if (registrationCloseTime !== undefined) {
            // If passing null or empty string, clear the close time
            settings.registrationCloseTime = registrationCloseTime ? new Date(registrationCloseTime) : null;
        }

        await settings.save();

        let isOpen = settings.registrationOpen;
        if (isOpen && settings.registrationCloseTime) {
            if (new Date() >= settings.registrationCloseTime) {
                isOpen = false;
            }
        }

        res.json({
            message: 'Settings updated successfully',
            settings: {
                registrationOpen: isOpen,
                manualRegistrationOpen: settings.registrationOpen,
                registrationCloseTime: settings.registrationCloseTime
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
