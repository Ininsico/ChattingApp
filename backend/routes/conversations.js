const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get all conversations
// @route   GET /api/conversations
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.id
        })
            .populate('participants', 'name email avatar status lastSeen')
            .populate('lastMessage')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'name avatar'
                }
            })
            .sort({ lastMessageAt: -1 });

        res.json({
            success: true,
            conversations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get conversation messages
// @route   GET /api/conversations/:id/messages
// @access  Private
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        const conversation = await Conversation.findById(req.params.id);

        if (!conversation || !conversation.isParticipant(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        let query = {
            conversationId: req.params.id,
            isDeleted: false
        };

        // Check for clear history setting
        // Manage user settings (reset unread, check clear history)
        let settings = conversation.userSettings.find(s => s.userId.toString() === req.user.id);

        if (settings) {
            // reset logic removed to support "unread until reply" feature
            // settings.unreadCount = 0;
            // settings.lastReadAt = new Date();
        } else {
            // Create settings if not exist
            conversation.userSettings.push({
                userId: req.user.id,
                unreadCount: 0,
                lastReadAt: new Date()
            });
            settings = conversation.userSettings[conversation.userSettings.length - 1];
        }
        await conversation.save();

        if (settings.clearedHistoryAt) {
            query.createdAt = { $gt: settings.clearedHistoryAt };
        }

        const messages = await Message.find(query)
            .populate('sender', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Message.countDocuments({
            conversationId: req.params.id,
            isDeleted: false
        });

        res.json({
            success: true,
            messages: messages.reverse(),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Create group conversation
// @route   POST /api/conversations/group
// @access  Private
router.post('/group', protect, async (req, res) => {
    try {
        const { name, participants } = req.body;

        if (!participants || participants.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Group must have at least 2 other participants'
            });
        }

        // Add creator to participants
        const allParticipants = [...new Set([req.user.id, ...participants])];

        const conversation = await Conversation.create({
            participants: allParticipants,
            isGroup: true,
            groupName: name,
            groupAdmin: req.user.id
        });

        await conversation.populate('participants', 'name email avatar status');

        res.status(201).json({
            success: true,
            conversation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get or create direct conversation
// @route   POST /api/conversations/direct
// @access  Private
router.post('/direct', protect, async (req, res) => {
    try {
        const { userId } = req.body;

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [req.user.id, userId], $size: 2 }
        }).populate('participants', 'name email avatar status lastSeen');

        if (!conversation) {
            // Create new conversation
            conversation = await Conversation.create({
                participants: [req.user.id, userId],
                isGroup: false
            });

            await conversation.populate('participants', 'name email avatar status lastSeen');
        }

        res.json({
            success: true,
            conversation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Delete message
// @route   DELETE /api/conversations/messages/:messageId
// @access  Private
router.delete('/messages/:messageId', protect, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        message.isDeleted = true;
        await message.save();

        res.json({
            success: true,
            message: 'Message deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Add member to group
// @route   PUT /api/conversations/:id/members
router.put('/:id/members', protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation || !conversation.isGroup) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        if (!conversation.groupAdmin || conversation.groupAdmin.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only admins can add members' });
        }

        if (conversation.participants.some(p => p.toString() === userId)) {
            return res.status(400).json({ success: false, message: 'User already in group' });
        }

        conversation.participants.push(userId);
        await conversation.save();
        await conversation.populate('participants', 'name email avatar status');

        res.json({ success: true, conversation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Remove member from group
// @route   DELETE /api/conversations/:id/members/:userId
router.delete('/:id/members/:userId', protect, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation || !conversation.isGroup) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        if (!conversation.groupAdmin || (conversation.groupAdmin.toString() !== req.user.id && req.user.id !== req.params.userId)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        conversation.participants = conversation.participants.filter(p => p.toString() !== req.params.userId);
        await conversation.save();
        await conversation.populate('participants', 'name email avatar status');

        res.json({ success: true, conversation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Add/Update reaction
// @route   POST /api/conversations/messages/:messageId/react
router.post('/messages/:messageId/react', protect, async (req, res) => {
    try {
        const { emoji } = req.body;
        const message = await Message.findById(req.params.messageId);

        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        const existingReactionIndex = message.reactions.findIndex(r => r.user.toString() === req.user.id);

        if (existingReactionIndex > -1) {
            if (message.reactions[existingReactionIndex].emoji === emoji) {
                // Remove if same emoji
                message.reactions.splice(existingReactionIndex, 1);
            } else {
                // Update if different emoji
                message.reactions[existingReactionIndex].emoji = emoji;
            }
        } else {
            message.reactions.push({ user: req.user.id, emoji });
        }

        await message.save();
        res.json({ success: true, reactions: message.reactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Report conversation
// @route   POST /api/conversations/:id/report
router.post('/:id/report', protect, async (req, res) => {
    // In a real app, save to a Report model.
    // For now, just acknowledge.
    res.json({ success: true, message: 'Report submitted' });
});

// @desc    Delete group conversation
// @route   DELETE /api/conversations/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        if (!conversation.isGroup) {
            return res.status(400).json({ success: false, message: 'Only groups can be deleted' });
        }

        if (!conversation.groupAdmin || conversation.groupAdmin.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only group admins can delete the group' });
        }

        // Delete all messages in the conversation
        await Message.deleteMany({ conversationId: req.params.id });

        // Delete the conversation
        await Conversation.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Group deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Update user chat settings
// @route   PATCH /api/conversations/:id/settings
router.patch('/:id/settings', protect, async (req, res) => {
    try {
        const { action, value } = req.body;
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });
        if (!conversation.isParticipant(req.user.id)) return res.status(403).json({ success: false, message: 'Not authorized' });

        let settings = conversation.userSettings.find(s => s.userId.toString() === req.user.id);
        if (!settings) {
            conversation.userSettings.push({ userId: req.user.id });
            settings = conversation.userSettings[conversation.userSettings.length - 1];
        }

        switch (action) {
            case 'mute':
                settings.mutedUntil = value ? new Date(value) : null;
                break;
            case 'unread':
                settings.isUnread = !!value;
                break;
            case 'read':
                settings.unreadCount = 0;
                settings.isUnread = false;
                settings.lastReadAt = new Date();
                break;
            case 'clear':
                settings.clearedHistoryAt = new Date();
                break;
        }

        await conversation.save();
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
