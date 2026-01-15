const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const {
            name, bio, avatar, phoneNumber, customStatus,
            banner, avatarVisibility, secondaryEmail, country,
            department, role, employeeId, reportingManager,
            availabilityStatus, workingHours
        } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                name, bio, avatar, phoneNumber, customStatus,
                banner, avatarVisibility, secondaryEmail, country,
                department, role, employeeId, reportingManager,
                availabilityStatus, workingHours
            },
            { new: true, runValidators: true }
        );

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Update user status
// @route   PUT /api/user/status
// @access  Private
router.put('/status', protect, async (req, res) => {
    try {
        const { status } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { status, lastSeen: new Date() },
            { new: true }
        );

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Search users
// @route   GET /api/user/search?q=query
// @access  Private
router.get('/search', protect, async (req, res) => {
    try {
        const { q } = req.query;

        const users = await User.find({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ],
            _id: { $ne: req.user.id } // Exclude current user
        }).limit(10);

        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
