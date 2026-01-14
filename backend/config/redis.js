// In-memory fallback if Redis is not available
const memoryStore = {
    online_users: new Map(),
    sockets: new Map(),
    typing: new Map()
};

let redisClient = {
    on: () => { },
    connect: async () => { throw new Error('Redis not available'); },
    duplicate: function () { return this; },
    isOpen: false
};

let isUsingRedis = false;
let redisErrorShown = false;

try {
    const redis = require('redis');
    const client = redis.createClient({
        socket: {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379,
            reconnectStrategy: (retries) => {
                if (retries > 1) {
                    if (!redisErrorShown) {
                        console.log('ℹ️ Redis not found or connection refused. Switching to In-Memory store.');
                        redisErrorShown = true;
                    }
                    return false; // Stop retrying immediately after first failure to avoid spam
                }
                return 1000;
            }
        }
    });

    client.on('error', (err) => {
        // Suppress all redis errors unless we successfully connected at least once
        if (isUsingRedis) {
            console.error('❌ Redis Error:', err.message);
        }
    });

    client.on('connect', () => {
        console.log('✅ Redis Connected');
        isUsingRedis = true;
        redisErrorShown = false;
    });

    client.connect().catch(() => {
        if (!redisErrorShown) {
            console.log('ℹ️ Redis not found. Using In-Memory store.');
            redisErrorShown = true;
        }
    });

    redisClient = client;
} catch (err) {
    console.log('ℹ️ Redis library not found. Using In-Memory store.');
}

// Helper functions for user online status
const setUserOnline = async (userId, socketId) => {
    if (isUsingRedis && redisClient.isOpen) {
        try {
            await redisClient.hSet('online_users', userId, socketId);
            await redisClient.set(`socket:${socketId}`, userId);
        } catch (e) {
            memoryStore.online_users.set(userId, socketId);
            memoryStore.sockets.set(socketId, userId);
        }
    } else {
        memoryStore.online_users.set(userId, socketId);
        memoryStore.sockets.set(socketId, userId);
    }
};

const setUserOffline = async (userId, socketId) => {
    if (isUsingRedis && redisClient.isOpen) {
        try {
            await redisClient.hDel('online_users', userId);
            await redisClient.del(`socket:${socketId}`);
        } catch (e) {
            memoryStore.online_users.delete(userId);
            memoryStore.sockets.delete(socketId);
        }
    } else {
        memoryStore.online_users.delete(userId);
        memoryStore.sockets.delete(socketId);
    }
};

const getUserSocketId = async (userId) => {
    if (isUsingRedis && redisClient.isOpen) {
        try {
            return await redisClient.hGet('online_users', userId);
        } catch (e) {
            return memoryStore.online_users.get(userId);
        }
    } else {
        return memoryStore.online_users.get(userId);
    }
};

const getUserBySocketId = async (socketId) => {
    if (isUsingRedis && redisClient.isOpen) {
        try {
            return await redisClient.get(`socket:${socketId}`);
        } catch (e) {
            return memoryStore.sockets.get(socketId);
        }
    } else {
        return memoryStore.sockets.get(socketId);
    }
};

const getAllOnlineUsers = async () => {
    if (isUsingRedis && redisClient.isOpen) {
        try {
            return await redisClient.hGetAll('online_users');
        } catch (e) {
            return Object.fromEntries(memoryStore.online_users);
        }
    } else {
        return Object.fromEntries(memoryStore.online_users);
    }
};

// Typing indicators
const setUserTyping = async (conversationId, userId) => {
    if (isUsingRedis && redisClient.isOpen) {
        try {
            await redisClient.sAdd(`typing:${conversationId}`, userId);
            await redisClient.expire(`typing:${conversationId}`, 10);
        } catch (e) {
            if (!memoryStore.typing.has(conversationId)) memoryStore.typing.set(conversationId, new Set());
            memoryStore.typing.get(conversationId).add(userId);
        }
    } else {
        if (!memoryStore.typing.has(conversationId)) memoryStore.typing.set(conversationId, new Set());
        memoryStore.typing.get(conversationId).add(userId);
        setTimeout(() => removeUserTyping(conversationId, userId), 10000);
    }
};

const removeUserTyping = async (conversationId, userId) => {
    if (isUsingRedis && redisClient.isOpen) {
        try {
            await redisClient.sRem(`typing:${conversationId}`, userId);
        } catch (e) {
            const typingSet = memoryStore.typing.get(conversationId);
            if (typingSet) typingSet.delete(userId);
        }
    } else {
        const typingSet = memoryStore.typing.get(conversationId);
        if (typingSet) typingSet.delete(userId);
    }
};

const getTypingUsers = async (conversationId) => {
    if (isUsingRedis && redisClient.isOpen) {
        try {
            return await redisClient.sMembers(`typing:${conversationId}`);
        } catch (e) {
            const typingSet = memoryStore.typing.get(conversationId);
            return typingSet ? Array.from(typingSet) : [];
        }
    } else {
        const typingSet = memoryStore.typing.get(conversationId);
        return typingSet ? Array.from(typingSet) : [];
    }
};

module.exports = {
    redisClient,
    setUserOnline,
    setUserOffline,
    getUserSocketId,
    getUserBySocketId,
    getAllOnlineUsers,
    setUserTyping,
    removeUserTyping,
    getTypingUsers
};
