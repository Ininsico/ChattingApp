import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    }
};

// User API
export const userAPI = {
    getProfile: async () => {
        const response = await api.get('/user/profile');
        return response.data;
    },

    updateProfile: async (userData) => {
        const response = await api.put('/user/profile', userData);
        return response.data;
    },

    updateStatus: async (status) => {
        const response = await api.put('/user/status', { status });
        return response.data;
    },

    searchUsers: async (query) => {
        const response = await api.get(`/user/search?q=${query}`);
        return response.data;
    }
};

// Friends API
export const friendsAPI = {
    sendRequest: async (email) => {
        const response = await api.post('/friends/request', { email });
        return response.data;
    },
    getRequests: async () => {
        const response = await api.get('/friends/requests');
        return response.data;
    },
    handleRequest: async (requestId, action) => {
        const response = await api.put(`/friends/request/${requestId}`, { action });
        return response.data;
    },
    getFriends: async () => {
        const response = await api.get('/friends');
        return response.data;
    },
    removeFriend: async (friendId) => {
        const response = await api.delete(`/friends/${friendId}`);
        return response.data;
    }
};

// Conversations API
export const conversationsAPI = {
    getConversations: async () => {
        const response = await api.get('/conversations');
        return response.data;
    },
    getMessages: async (conversationId, page = 1) => {
        const response = await api.get(`/conversations/${conversationId}/messages?page=${page}`);
        return response.data;
    },
    createGroup: async (name, participants) => {
        const response = await api.post('/conversations/group', { name, participants });
        return response.data;
    },
    getOrCreateDirect: async (userId) => {
        const response = await api.post('/conversations/direct', { userId });
        return response.data;
    },
    reactToMessage: async (messageId, emoji) => {
        const response = await api.post(`/conversations/messages/${messageId}/react`, { emoji });
        return response.data;
    },
    addMember: async (conversationId, userId) => {
        const response = await api.put(`/conversations/${conversationId}/members`, { userId });
        return response.data;
    },
    removeMember: async (conversationId, userId) => {
        const response = await api.delete(`/conversations/${conversationId}/members/${userId}`);
        return response.data;
    },
    updateSettings: async (id, action, value) => {
        const response = await api.patch(`/conversations/${id}/settings`, { action, value });
        return response.data;
    },
    reportConversation: async (id, reason) => {
        // Placeholder for report endpoint if not yet created on backend, 
        // using settings endpoint or similar for now if strictly needed, 
        // but assuming we will add the route or just mocked for now.
        // Actually, let's just assume we added it or will add it.
        // If I haven't added the route, this will 404. 
        // I should add the route to backend in next step or now. 
        // For safety, I'll stick to the plan of adding it.
        const response = await api.post(`/conversations/${id}/report`, { reason });
        return response.data;
    },
    deleteMessage: async (messageId) => {
        const response = await api.delete(`/conversations/messages/${messageId}`);
        return response.data;
    },
    deleteGroup: async (conversationId) => {
        const response = await api.delete(`/conversations/${conversationId}`);
        return response.data;
    }
};

// Upload API
export const uploadAPI = {
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },
    downloadFile: async (messageId) => {
        const response = await api.get(`/upload/download/${messageId}`, {
            responseType: 'blob'
        });
        return response.data;
    }
};

// Helper to check if user is authenticated
export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

// Helper to get current user
export const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    try {
        const user = JSON.parse(userData);
        if (user) {
            // Ensure both id and _id are present for cross-compatibility
            const id = user.id || user._id;
            user.id = id;
            user._id = id;
        }
        return user;
    } catch (e) {
        return null;
    }
};

export default api;
