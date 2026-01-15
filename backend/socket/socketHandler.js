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
        await User.findByIdAndUpdate(socket.userId, { status: 'online', lastSeen: new Date() });
        socket.broadcast.emit('user-online', { userId: socket.userId, name: socket.user.name });
        socket.join(socket.userId);

        const conversations = await Conversation.find({ participants: socket.userId });
        conversations.forEach(conv => socket.join(conv._id.toString()));

        socket.on('join-conversation', (conversationId) => socket.join(conversationId));

        socket.on('send-message', async (data) => {
            try {
                const { conversationId, content, messageType = 'text', fileUrl } = data;
                const conversation = await Conversation.findById(conversationId);
                if (!conversation || !conversation.isParticipant(socket.userId)) return;

                const message = await Message.create({ conversationId, sender: socket.userId, content, messageType, fileUrl });
                await message.populate('sender', 'name avatar');

                // Update conversation: lastMessage, timestamps, and unread counts
                conversation.lastMessage = message._id;
                conversation.lastMessageAt = new Date();

                // Update unread counts for other participants
                conversation.participants.forEach(pId => {
                    const participantId = pId.toString();
                    if (participantId !== socket.userId) {
                        const settings = conversation.userSettings.find(s => s.userId.toString() === participantId);
                        if (settings) {
                            settings.unreadCount = (settings.unreadCount || 0) + 1;
                        } else {
                            conversation.userSettings.push({ userId: participantId, unreadCount: 1 });
                        }
                        // Emit real-time unread update
                        const newCount = settings ? settings.unreadCount : 1;
                        io.to(participantId).emit('unread-update', { conversationId, unreadCount: newCount });
                    }
                });

                await conversation.save();
                await removeUserTyping(conversationId, socket.userId);

                io.to(conversationId).emit('new-message', {
                    conversationId,
                    message: {
                        _id: message._id,
                        content: message.content,
                        messageType: message.messageType,
                        fileUrl: message.fileUrl,
                        sender: message.sender,
                        createdAt: message.createdAt
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
            await User.findByIdAndUpdate(socket.userId, { status: 'offline', lastSeen: new Date() });
            socket.broadcast.emit('user-offline', { userId: socket.userId, lastSeen: new Date() });
        });
    });
};

module.exports = socketHandler;
