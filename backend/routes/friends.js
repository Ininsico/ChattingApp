const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Conversation = require('../models/Conversation');

// @desc    Send friend request by email
// @route   POST /api/friends/request
// @access  Private
router.post('/request', protect, async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const targetUser = await User.findOne({ email });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email'
            });
        }

        // Can't send request to yourself
        if (targetUser._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send friend request to yourself'
            });
        }

        // Check if already friends
        if (req.user.friends.includes(targetUser._id)) {
            return res.status(400).json({
                success: false,
                message: 'Already friends with this user'
            });
        }

        // Check for existing request
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { from: req.user.id, to: targetUser._id },
                { from: targetUser._id, to: req.user.id }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'Friend request already exists'
            });
        }

        // Create friend request
        const friendRequest = await FriendRequest.create({
            from: req.user.id,
            to: targetUser._id
        });

        await friendRequest.populate('from', 'name email avatar');
        await friendRequest.populate('to', 'name email avatar');

        res.status(201).json({
            success: true,
            message: 'Friend request sent',
            friendRequest
        });
    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending friend request',
            error: error.message
        });
    }
});

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
router.get('/requests', protect, async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            to: req.user.id,
            status: 'pending'
        }).populate('from', 'name email avatar status');

        res.json({
            success: true,
            requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Accept/Reject friend request
// @route   PUT /api/friends/request/:id
// @access  Private
router.put('/request/:id', protect, async (req, res) => {
    try {
        const { action } = req.body; // 'accept' or 'reject'

        const friendRequest = await FriendRequest.findById(req.params.id);

        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found'
            });
        }

        // Verify user is the recipient
        if (friendRequest.to.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (action === 'accept') {
            // Add to friends list
            await User.findByIdAndUpdate(req.user.id, {
                $addToSet: { friends: friendRequest.from }
            });

            await User.findByIdAndUpdate(friendRequest.from, {
                $addToSet: { friends: req.user.id }
            });

            // Create a conversation
            const conversation = await Conversation.create({
                participants: [req.user.id, friendRequest.from],
                isGroup: false
            });

            friendRequest.status = 'accepted';
            await friendRequest.save();

            res.json({
                success: true,
                message: 'Friend request accepted',
                conversation
            });
        } else if (action === 'reject') {
            friendRequest.status = 'rejected';
            await friendRequest.save();

            res.json({
                success: true,
                message: 'Friend request rejected'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get friends list
// @route   GET /api/friends
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('friends', 'name email avatar status lastSeen');

        res.json({
            success: true,
            friends: user.friends
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Remove friend
// @route   DELETE /api/friends/:friendId
// @access  Private
router.delete('/:friendId', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { friends: req.params.friendId }
        });

        await User.findByIdAndUpdate(req.params.friendId, {
            $pull: { friends: req.user.id }
        });

        res.json({
            success: true,
            message: 'Friend removed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
