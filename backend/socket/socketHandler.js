const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const {
    setUserOnline,
    setUserOffline,
    getUserSocketId,
    setUserTyping,
    removeUserTyping
} = require('../config/redis');

const socketHandler = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error'));
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (!user) return next(new Error('User not found'));
            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        await setUserOnline(socket.userId, socket.id);
        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
        socket.broadcast.emit('user-online', { userId: socket.userId, name: socket.user.name });
        socket.join(socket.userId);

        const conversations = await Conversation.find({ participants: socket.userId });
        conversations.forEach(conv => socket.join(conv._id.toString()));

        socket.on('join-conversation', (conversationId) => socket.join(conversationId));

        socket.on('send-message', async (data) => {
            try {
                const { conversationId, content, messageType = 'text', fileUrl, fileName, fileSize, mimeType, fileIcon, duration } = data;
                const conversation = await Conversation.findById(conversationId);
                if (!conversation || !conversation.isParticipant(socket.userId)) return;

                const message = await Message.create({
                    conversationId,
                    sender: socket.userId,
                    content,
                    messageType,
                    fileUrl,
                    fileName,
                    fileSize,
                    mimeType,
                    fileIcon,
                    duration
                });
                await message.populate('sender', 'name avatar');

                // Update conversation: lastMessage, timestamps
                conversation.lastMessage = message._id;
                conversation.lastMessageAt = new Date();

                // Reset sender's unread count and update lastReadAt (Reply = Read)
                let senderSettings = conversation.userSettings.find(s => s.userId.toString() === socket.userId);
                if (senderSettings) {
                    senderSettings.unreadCount = 0;
                    senderSettings.isUnread = false;
                    senderSettings.lastReadAt = new Date();
                } else {
                    conversation.userSettings.push({
                        userId: socket.userId,
                        unreadCount: 0,
                        isUnread: false,
                        lastReadAt: new Date()
                    });
                    senderSettings = conversation.userSettings[conversation.userSettings.length - 1];
                }

                // Calculate unread counts for OTHER participants only
                for (const pId of conversation.participants) {
                    const participantId = pId.toString();

                    // Skip the sender - they should always have 0 unread
                    if (participantId === socket.userId) continue;

                    const participantSettings = conversation.userSettings.find(s => s.userId.toString() === participantId);
                    const lastReadAt = participantSettings?.lastReadAt || new Date(0);

                    // Count messages from others sent after this participant's last reply
                    const unreadCount = await Message.countDocuments({
                        conversationId,
                        sender: { $ne: participantId },
                        createdAt: { $gt: lastReadAt },
                        isDeleted: false
                    });

                    // Update the count in conversation settings
                    if (participantSettings) {
                        participantSettings.unreadCount = unreadCount;
                    } else {
                        conversation.userSettings.push({
                            userId: participantId,
                            unreadCount
                        });
                    }

                    // Emit real-time unread update
                    io.to(participantId).emit('unread-update', { conversationId, unreadCount });
                }

                // Notify sender their count is 0
                io.to(socket.userId).emit('unread-update', { conversationId, unreadCount: 0 });

                // Save all changes once
                await conversation.save();
                await removeUserTyping(conversationId, socket.userId);

                // Emit the message
                io.to(conversationId).emit('new-message', {
                    conversationId,
                    message: {
                        _id: message._id,
                        content: message.content,
                        messageType: message.messageType,
                        fileUrl: message.fileUrl,
                        sender: message.sender,
                        createdAt: message.createdAt,
                        fileName: message.fileName,
                        fileSize: message.fileSize,
                        mimeType: message.mimeType,
                        fileIcon: message.fileIcon,
                        duration: message.duration
                    }
                });
            } catch (error) {
                console.error('Send message error:', error);
            }
        });

        socket.on('typing-start', async ({ conversationId }) => {
            await setUserTyping(conversationId, socket.userId);
            socket.to(conversationId).emit('user-typing', { conversationId, userId: socket.userId, name: socket.user.name });
        });

        socket.on('typing-stop', async ({ conversationId }) => {
            await removeUserTyping(conversationId, socket.userId);
            socket.to(conversationId).emit('user-stopped-typing', { conversationId, userId: socket.userId });
        });

        socket.on('mark-conversation-read', async ({ conversationId }) => {
            try {
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) return;

                const userSettings = conversation.userSettings.find(s => s.userId.toString() === socket.userId);
                const readAt = new Date();

                if (userSettings) {
                    userSettings.unreadCount = 0;
                    userSettings.isUnread = false;
                    userSettings.lastReadAt = readAt;
                } else {
                    conversation.userSettings.push({
                        userId: socket.userId,
                        unreadCount: 0,
                        isUnread: false,
                        lastReadAt: readAt
                    });
                }

                await conversation.save();

                // Broadcast read receipt to other participants
                socket.to(conversationId).emit('conversation-read', {
                    conversationId,
                    userId: socket.userId,
                    readAt
                });
            } catch (error) {
                console.error('Mark read error:', error);
            }
        });

        socket.on('friend-request-sent', ({ targetUserId, request }) => {
            io.to(targetUserId).emit('new-friend-request', request);
        });

        socket.on('friend-request-accepted', ({ targetUserId, conversation }) => {
            io.to(targetUserId).emit('request-accepted', { conversation });
        });

        socket.on('send-reaction', ({ conversationId, messageId, reactions }) => {
            io.to(conversationId).emit('message-reaction', { messageId, reactions });
        });

        socket.on('group-update', ({ conversationId, conversation }) => {
            io.to(conversationId).emit('group-updated', { conversationId, conversation });
        });

        socket.on('group-created', ({ conversation }) => {
            conversation.participants.forEach(p => {
                const pid = p._id ? p._id.toString() : p.toString();
                if (pid !== socket.userId) {
                    io.to(pid).emit('group-joined', { conversation });
                }
            });
        });

        socket.on('delete-message', ({ conversationId, messageId }) => {
            io.to(conversationId).emit('message-deleted', { messageId });
        });

        socket.on('add-member', ({ userId, conversation }) => {
            io.to(userId).emit('group-joined', { conversation });
            // Also inform existing room members
            io.to(conversation._id).emit('group-updated', { conversationId: conversation._id, conversation });
        });

        socket.on('delete-group', ({ conversationId }) => {
            io.to(conversationId).emit('group-deleted', { conversationId });
        });

        socket.on('disconnect', async () => {
            await setUserOffline(socket.userId, socket.id);
            await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
            socket.broadcast.emit('user-offline', { userId: socket.userId, lastSeen: new Date() });
        });
    });
};

module.exports = socketHandler;
