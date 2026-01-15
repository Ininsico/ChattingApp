import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { Search, UserPlus, X, Loader2, Bell } from 'lucide-react';
import { conversationsAPI, userAPI } from '../services/api';
import useChatStore from '../store/useChatStore';

const DirectMessages = ({ initialChatId }) => {
    const {
        conversations,
        selectedChat,
        setSelectedChat,
        currentUser,
        areConversationsLoading,
        fetchConversations,
        updateConversation,
        setConversations
    } = useChatStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [userSearchEmail, setUserSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [filter, setFilter] = useState('all'); // 'all' | 'unread'

    // Fetch conversations on mount if empty
    useEffect(() => {
        // We fetch if we have none. Dashboard usually handles init but safe to have here.
        if (conversations.length === 0) {
            fetchConversations();
        }
    }, [fetchConversations, conversations.length]);

    // Handle Deep Link / Initial Selection
    useEffect(() => {
        if (initialChatId && conversations.length > 0) {
            // Only select if not already selected to avoid loop
            if (selectedChat?._id !== initialChatId) {
                const chat = conversations.find(c => c._id === initialChatId);
                if (chat) {
                    setSelectedChat(chat);
                }
            }
        }
    }, [conversations, initialChatId, selectedChat, setSelectedChat]);

    const getUnreadCount = (conv) => {
        return conv.userSettings?.find(s => s.userId === currentUser?.id || s.userId?._id === currentUser?.id)?.unreadCount || 0;
    };

    const isUnread = (conv) => {
        const settings = conv.userSettings?.find(s => s.userId === currentUser?.id || s.userId?._id === currentUser?.id);
        return (settings?.unreadCount || 0) > 0 || settings?.isUnread;
    };

    const handleSelectChat = (chat) => {
        setSelectedChat(chat); // Store action handles marking as read and fetching messages
    };

    const handleUpdateChat = (updatedChat) => {
        updateConversation(updatedChat);
    };

    const handleSearchUsers = async (e) => {
        e.preventDefault();
        if (!userSearchEmail.trim()) return;

        setIsSearching(true);
        try {
            const res = await userAPI.searchUsers(userSearchEmail);
            if (res.success) {
                setSearchResults(res.users);
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleStartChat = async (userId) => {
        try {
            const res = await conversationsAPI.getOrCreateDirect(userId);
            if (res.success) {
                const newChat = res.conversation;

                // Add to store if not exists
                // We can use a specialized action or just refetch or manually update list
                // Since 'conversations' is in store, let's update it.
                // Best practice: define `addConversation` in store, but for now:
                const exists = conversations.find(c => c._id === newChat._id);
                if (!exists) {
                    setConversations([newChat, ...conversations]);
                }

                setSelectedChat(newChat);
                setIsNewChatOpen(false);
                setUserSearchEmail('');
                setSearchResults([]);
            }
        } catch (err) {
            console.error('Failed to start chat:', err);
        }
    };

    const filteredConversations = conversations.filter(conv => {
        if (conv.isGroup) return false;

        const currentUserId = currentUser?.id || currentUser?._id;
        const other = conv.participants.find(p => (p._id || p.id) !== currentUserId);
        const matchesSearch = other?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'unread' ? isUnread(conv) : true;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="flex h-full w-full overflow-hidden relative">
            <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col bg-[#13131a] border-r border-white/10`}>
                <div className="p-3 sm:p-4 md:p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Messages</h2>
                        <button
                            onClick={() => setIsNewChatOpen(true)}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] flex items-center justify-center text-white transition-all shadow-lg flex-shrink-0"
                            title="Start New Chat"
                        >
                            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                    <div className="relative group mb-3 sm:mb-4">
                        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5 sm:w-4 sm:h-4 group-focus-within:text-[#06b6d4]" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#06b6d4] text-white text-sm sm:text-base"
                        />
                    </div>
                    <div className="flex gap-1.5 sm:gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'all' ? 'bg-[#06b6d4] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`flex-1 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'unread' ? 'bg-[#06b6d4] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            Unread
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {areConversationsLoading && conversations.length === 0 ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No conversations yet. Start a new chat!</div>
                    ) : (
                        filteredConversations.map(conv => {
                            const currentUserId = currentUser?.id || currentUser?._id;
                            const other = conv.participants.find(p => (p._id || p.id) !== currentUserId);
                            return (
                                <div
                                    key={conv._id}
                                    onClick={() => handleSelectChat(conv)}
                                    className={`p-3 sm:p-4 mx-2 sm:mx-3 my-1 rounded-xl flex items-center gap-2.5 sm:gap-3 md:gap-4 cursor-pointer transition-all active:scale-98 ${selectedChat?._id === conv._id ? 'bg-[#06b6d4] shadow-lg' : 'hover:bg-white/5'
                                        }`}
                                >
                                    <img src={other?.avatar} className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover ring-2 ring-white/10 flex-shrink-0" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5 sm:mb-1 gap-2">
                                            <h3 className="font-semibold text-sm sm:text-base truncate text-white flex-1">{other?.name}</h3>
                                            <div className="flex flex-col items-end gap-0.5 sm:gap-1 flex-shrink-0">
                                                <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                {isUnread(conv) && (
                                                    <span className="bg-[#06b6d4] text-white text-[10px] font-bold px-1.5 min-w-[1.2rem] h-4 sm:h-5 rounded-full flex items-center justify-center">
                                                        {getUnreadCount(conv) > 0 ? getUnreadCount(conv) : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs sm:text-sm truncate text-gray-400">{conv.lastMessage?.content || 'No messages yet'}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            <ChatWindow chat={selectedChat} onBack={() => setSelectedChat(null)} onUpdateChat={handleUpdateChat} />

            {isNewChatOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#13131a] rounded-2xl sm:rounded-3xl border border-white/10 p-5 sm:p-6 md:p-8 shadow-2xl relative animate-in zoom-in duration-300">
                        <button onClick={() => { setIsNewChatOpen(false); setSearchResults([]); setUserSearchEmail(''); }} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-white p-1"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5 sm:mb-2 pr-8">Start New Chat</h3>
                        <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">Search for a user by email to start chatting.</p>

                        <form onSubmit={handleSearchUsers} className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={userSearchEmail}
                                    onChange={(e) => setUserSearchEmail(e.target.value)}
                                    placeholder="Enter email or name..."
                                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[#06b6d4] pr-11 sm:pr-12 text-sm sm:text-base"
                                    autoFocus
                                />
                                <button type="submit" className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-[#06b6d4] hover:bg-[#06b6d4]/10 rounded-lg transition-colors">
                                    {isSearching ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Search className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                            </div>
                        </form>

                        <div className="space-y-1.5 sm:space-y-2 max-h-52 sm:max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                            {searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <div
                                        key={user._id}
                                        onClick={() => handleStartChat(user._id)}
                                        className="p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-[#06b6d4]/20 border border-white/5 hover:border-[#06b6d4]/50 cursor-pointer flex items-center gap-2.5 sm:gap-3 transition-all active:scale-98"
                                    >
                                        <img src={user.avatar} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-medium truncate text-sm sm:text-base">{user.name}</h4>
                                            <p className="text-[10px] sm:text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : userSearchEmail && !isSearching ? (
                                <p className="text-center text-gray-500 text-xs sm:text-sm py-3 sm:py-4">No users found.</p>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DirectMessages;
