import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { Search, UserPlus, X, Loader2, Bell } from 'lucide-react';
import { conversationsAPI, userAPI, getCurrentUser } from '../services/api';
import socketService from '../services/socket';

const DirectMessages = ({ initialChatId }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [userSearchEmail, setUserSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [filter, setFilter] = useState('all'); // 'all' | 'unread'

    const currentUser = getCurrentUser();

    const fetchConversations = async () => {
        try {
            const res = await conversationsAPI.getConversations();
            if (res.success) setConversations(res.conversations);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();

        socketService.onNewMessage(({ conversationId, message }) => {
            setConversations(prev => {
                const index = prev.findIndex(c => c._id === conversationId);
                if (index === -1) {
                    fetchConversations();
                    return prev;
                }
                const updated = [...prev];
                updated[index] = { ...updated[index], lastMessage: message, lastMessageAt: message.createdAt };
                const item = updated.splice(index, 1)[0];
                updated.unshift(item);
                return updated;
            });
        });

        return () => {
            socketService.off('new-message');
        };
    }, []);

    useEffect(() => {
        if (initialChatId && conversations.length > 0) {
            const chat = conversations.find(c => c._id === initialChatId);
            if (chat) {
                handleSelectChat(chat);
            }
        }
    }, [conversations, initialChatId]);

    useEffect(() => {
        socketService.socket?.on('unread-update', ({ conversationId, unreadCount }) => {
            setConversations(prev => prev.map(c => {
                if (c._id === conversationId && selectedChat?._id !== conversationId) {
                    const newSettings = c.userSettings ? [...c.userSettings] : [];
                    const userIndex = newSettings.findIndex(s => s.userId === currentUser.id);
                    if (userIndex > -1) {
                        newSettings[userIndex] = { ...newSettings[userIndex], unreadCount };
                    } else {
                        newSettings.push({ userId: currentUser.id, unreadCount });
                    }
                    return { ...c, userSettings: newSettings };
                }
                return c;
            }));
        });

        return () => {
            socketService.socket?.off('unread-update');
        };
    }, [selectedChat]);

    const getUnreadCount = (conv) => {
        return conv.userSettings?.find(s => s.userId === currentUser?.id)?.unreadCount || 0;
    };

    const handleSelectChat = (chat) => {
        setSelectedChat(chat);
        // Optimistically clear unread count in frontend state
        if (chat) {
            setConversations(prev => prev.map(c => {
                if (c._id === chat._id) {
                    const newSettings = c.userSettings ? [...c.userSettings] : [];
                    const userIndex = newSettings.findIndex(s => s.userId === currentUser.id);
                    if (userIndex > -1) {
                        newSettings[userIndex] = { ...newSettings[userIndex], unreadCount: 0 };
                    }
                    return { ...c, userSettings: newSettings };
                }
                return c;
            }));
        }
    };

    const handleUpdateChat = (updatedChat) => {
        setConversations(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
        if (selectedChat?._id === updatedChat._id) {
            setSelectedChat(updatedChat);
        }
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
                
                // Add to list if not exists
                setConversations(prev => {
                    const exists = prev.find(c => c._id === newChat._id);
                    if (exists) return prev;
                    return [newChat, ...prev];
                });

                handleSelectChat(newChat);
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
        const matchesFilter = filter === 'unread' ? getUnreadCount(conv) > 0 : true;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="flex h-full w-full overflow-hidden relative">
            <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col bg-[#13131a] border-r border-white/10`}>
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Messages</h2>
                        <button
                            onClick={() => setIsNewChatOpen(true)}
                            className="w-10 h-10 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] flex items-center justify-center text-white transition-all shadow-lg"
                            title="Start New Chat"
                        >
                            <UserPlus size={20} />
                        </button>
                    </div>
                    <div className="relative group mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-[#06b6d4]" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#06b6d4] text-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setFilter('all')} 
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'all' ? 'bg-[#06b6d4] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setFilter('unread')} 
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === 'unread' ? 'bg-[#06b6d4] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            Unread
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {isLoading ? (
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
                                    className={`p-4 mx-3 my-1 rounded-xl flex items-center gap-4 cursor-pointer transition-all ${selectedChat?._id === conv._id ? 'bg-[#06b6d4] shadow-lg' : 'hover:bg-white/5'
                                        }`}
                                >
                                    <img src={other?.avatar} className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-semibold text-sm truncate text-white">{other?.name}</h3>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-gray-500 mb-1">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                {getUnreadCount(conv) > 0 && (
                                                    <span className="bg-[#06b6d4] text-white text-[10px] font-bold px-1.5 min-w-[1.2rem] h-5 rounded-full flex items-center justify-center">
                                                        {getUnreadCount(conv)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm truncate text-gray-400">{conv.lastMessage?.content || 'No messages yet'}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            <ChatWindow chat={selectedChat} onBack={() => handleSelectChat(null)} onUpdateChat={handleUpdateChat} />

            {isNewChatOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#13131a] rounded-3xl border border-white/10 p-8 shadow-2xl relative animate-in zoom-in duration-300">
                        <button onClick={() => { setIsNewChatOpen(false); setSearchResults([]); setUserSearchEmail(''); }} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
                        <h3 className="text-2xl font-bold text-white mb-2">Start New Chat</h3>
                        <p className="text-gray-400 text-sm mb-6">Search for a user by email to start chatting.</p>
                        
                        <form onSubmit={handleSearchUsers} className="space-y-4 mb-6">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={userSearchEmail} 
                                    onChange={(e) => setUserSearchEmail(e.target.value)} 
                                    placeholder="Enter email or name..." 
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[#06b6d4] pr-12" 
                                    autoFocus
                                />
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#06b6d4] hover:bg-[#06b6d4]/10 rounded-lg transition-colors">
                                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                </button>
                            </div>
                        </form>

                        <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                            {searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <div 
                                        key={user._id}
                                        onClick={() => handleStartChat(user._id)}
                                        className="p-3 rounded-xl bg-white/5 hover:bg-[#06b6d4]/20 border border-white/5 hover:border-[#06b6d4]/50 cursor-pointer flex items-center gap-3 transition-all"
                                    >
                                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-medium truncate">{user.name}</h4>
                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : userSearchEmail && !isSearching ? (
                                <p className="text-center text-gray-500 text-sm py-4">No users found.</p>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DirectMessages;
