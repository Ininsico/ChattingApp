import { create } from 'zustand';
import { conversationsAPI } from '../services/api';
import socketService from '../services/socket';

const useChatStore = create((set, get) => ({
    // State
    currentUser: null,
    conversations: [],
    selectedChat: null,
    messages: [],
    isLoadingMessages: false,
    areConversationsLoading: false,
    activeTab: 'direct', // 'direct' | 'groups' | 'profile'

    // Actions
    setCurrentUser: (user) => set({ currentUser: user }),

    setActiveTab: (tab) => set({ activeTab: tab }),

    // Conversations
    setConversations: (conversations) => set({ conversations }),

    fetchConversations: async () => {
        set({ areConversationsLoading: true });
        try {
            const res = await conversationsAPI.getConversations();
            if (res.success) {
                set({ conversations: res.conversations });
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            set({ areConversationsLoading: false });
        }
    },

    // Chat Selection
    setSelectedChat: async (chat) => {
        const prevChat = get().selectedChat;
        if (prevChat?._id === chat?._id) return; // No change

        set({ selectedChat: chat, messages: [] }); // Clear prev messages immediately

        if (chat) {
            // Join via socket
            socketService.joinConversation(chat._id);

            // Mark as read locally and on server
            get().markConversationAsRead(chat._id);

            // Fetch messages
            set({ isLoadingMessages: true });
            try {
                const res = await conversationsAPI.getMessages(chat._id);
                if (res.success) {
                    set({ messages: res.messages });
                }
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            } finally {
                set({ isLoadingMessages: false });
            }
        }
    },

    updateConversation: (updatedChat) => {
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c._id === updatedChat._id ? { ...c, ...updatedChat } : c
            ),
            selectedChat: state.selectedChat?._id === updatedChat._id
                ? { ...state.selectedChat, ...updatedChat }
                : state.selectedChat
        }));
    },

    // Messages
    addMessage: (message) => {
        set((state) => {
            // Only add if it belongs to current chat
            if (state.selectedChat?._id === message.conversationId) {
                // Deduplicate just in case
                if (state.messages.some(m => m._id === message._id)) return {};
                return { messages: [...state.messages, message] };
            }
            return {};
        });

        // Also update conversation preview (lastMessage)
        set((state) => {
            const convIndex = state.conversations.findIndex(c => c._id === message.conversationId);
            if (convIndex === -1) return {}; // New conversation? Handled by socket 'new-message' usually re-fetching or adding

            const updatedConvs = [...state.conversations];
            const updatedConv = {
                ...updatedConvs[convIndex],
                lastMessage: message,
                lastMessageAt: message.createdAt
            };

            // Move to top
            updatedConvs.splice(convIndex, 1);
            updatedConvs.unshift(updatedConv);

            return { conversations: updatedConvs };
        });
    },

    setMessages: (messages) => set({ messages }),

    // Mark Read Logic
    markConversationAsRead: async (chatId) => {
        const { currentUser } = get();
        if (!currentUser) return;

        // Optimistic update
        set((state) => {
            const updatedConvs = state.conversations.map(c => {
                if (c._id === chatId) {
                    const newSettings = c.userSettings ? [...c.userSettings] : [];
                    const userIndex = newSettings.findIndex(s => s.userId === currentUser.id || s.userId?._id === currentUser.id);
                    if (userIndex > -1) {
                        newSettings[userIndex] = { ...newSettings[userIndex], unreadCount: 0, isUnread: false };
                    }
                    return { ...c, userSettings: newSettings };
                }
                return c;
            });
            return { conversations: updatedConvs };
        });

        try {
            await conversationsAPI.updateSettings(chatId, 'read', true);
            socketService.markConversationRead(chatId);
        } catch (error) {
            console.error('Failed to mark read:', error);
        }
    },

    deleteMessage: (messageId) => {
        set((state) => {
            // Update active messages
            const updatedMessages = state.messages.filter(m => m._id !== messageId);

            // Update conversations preview if needed
            let updatedConvs = state.conversations;
            const convIndex = state.conversations.findIndex(c => c.lastMessage?._id === messageId);
            if (convIndex > -1) {
                updatedConvs = [...state.conversations];
                // Ideally we fetch the new last message, but for now we can just show "Message deleted" or previous
                // Simplest is to just update content text
                updatedConvs[convIndex] = {
                    ...updatedConvs[convIndex],
                    lastMessage: { ...updatedConvs[convIndex].lastMessage, content: 'Message deleted' }
                };
            }

            return { messages: updatedMessages, conversations: updatedConvs };
        });
    },

    updateMessageReaction: (messageId, reactions) => {
        set((state) => ({
            messages: state.messages.map(m => m._id === messageId ? { ...m, reactions } : m)
        }));
    },

    setTypingUser: (data) => {
        // data: { conversationId, userId, name, isTyping }
        set((state) => {
            const currentTyping = state.typingUsers || {}; // { convId: [names] }
            const { conversationId, name, isTyping } = data;

            const users = currentTyping[conversationId] || [];
            let newUsers = [...users];

            if (isTyping) {
                if (!newUsers.includes(name)) newUsers.push(name);
            } else {
                newUsers = newUsers.filter(n => n !== name);
            }

            return { typingUsers: { ...currentTyping, [conversationId]: newUsers } };
        });
    },

    // Refined Socket Event Handlers
    handleNewMessage: (data) => {
        const { conversationId, message } = data;
        const state = get();

        // Update conversation list (preview)
        let updatedConvs = [...state.conversations];
        const convIndex = updatedConvs.findIndex(c => c._id === conversationId);

        if (convIndex > -1) {
            updatedConvs[convIndex] = {
                ...updatedConvs[convIndex],
                lastMessage: message,
                lastMessageAt: message.createdAt
            };
            // Move to top
            const item = updatedConvs.splice(convIndex, 1)[0];
            updatedConvs.unshift(item);
        } else {
            // New conversation? Fetch all again or add it
            // If we have the conversation object in data, we could add it. 
            // Logic to fetch if missing is sound:
            get().fetchConversations();
            return;
        }

        // Add to messages if current chat
        let newMessages = state.messages;
        if (state.selectedChat?._id === conversationId) {
            // Deduplicate
            if (!newMessages.some(m => m._id === message._id)) {
                newMessages = [...state.messages, message];

                // Mark read
                get().markConversationAsRead(conversationId);
            }
        } else {
            // Update unread count in conversation list
            // This logic mimics socket 'unread-update'. 
            // Ideally rely on 'unread-update' event, but optimistic update here is:
            const targetConv = updatedConvs.find(c => c._id === conversationId);
            if (targetConv) {
                const newSettings = targetConv.userSettings ? [...targetConv.userSettings] : [];
                // Find self
                const meVal = state.currentUser?.id || state.currentUser?._id;
                const mySettingIdx = newSettings.findIndex(s => (s.userId?._id || s.userId) === meVal);
                if (mySettingIdx > -1) {
                    newSettings[mySettingIdx] = {
                        ...newSettings[mySettingIdx],
                        unreadCount: (newSettings[mySettingIdx].unreadCount || 0) + 1
                    };
                }
                const newConvWithUnread = { ...targetConv, userSettings: newSettings };
                updatedConvs = updatedConvs.map(c => c._id === conversationId ? newConvWithUnread : c);
            }
        }

        set({ conversations: updatedConvs, messages: newMessages });
    },
}));

export default useChatStore;
