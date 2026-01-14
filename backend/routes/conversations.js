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

        const messages = await Message.find({
            conversationId: req.params.id,
            isDeleted: false
        })
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

module.exports = router;
