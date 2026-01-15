import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

class SocketService {
    socket = null;

    connect(token) {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to socket server');
        });

        this.socket.on('connect_error', (err) => {
            console.error('❌ Socket connection error:', err.message);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Messaging
    sendMessage(data) {
        if (this.socket) {
            this.socket.emit('send-message', data);
        }
    }

    onNewMessage(callback) {
        if (this.socket) {
            this.socket.on('new-message', callback);
        }
    }

    // Typing
    sendTypingStart(conversationId) {
        if (this.socket) {
            this.socket.emit('typing-start', { conversationId });
        }
    }

    sendTypingStop(conversationId) {
        if (this.socket) {
            this.socket.emit('typing-stop', { conversationId });
        }
    }

    onUserTyping(callback) {
        if (this.socket) {
            this.socket.on('user-typing', callback);
        }
    }

    onUserStoppedTyping(callback) {
        if (this.socket) {
            this.socket.on('user-stopped-typing', callback);
        }
    }

    markConversationRead(conversationId) {
        if (this.socket) {
            this.socket.emit('mark-conversation-read', { conversationId });
        }
    }

    onConversationRead(callback) {
        if (this.socket) {
            this.socket.on('conversation-read', callback);
        }
    }

    // Status
    onUserOnline(callback) {
        if (this.socket) {
            this.socket.on('user-online', callback);
        }
    }

    onUserOffline(callback) {
        if (this.socket) {
            this.socket.on('user-offline', callback);
        }
    }

    joinConversation(conversationId) {
        if (this.socket) {
            this.socket.emit('join-conversation', conversationId);
        }
    }

    // Cleanup listeners
    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }
}

const socketService = new SocketService();
export default socketService;
