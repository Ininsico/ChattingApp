import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { Search, Plus, Users as UsersIcon, Loader2, X } from 'lucide-react';
import { conversationsAPI, userAPI, getCurrentUser } from '../services/api';
import socketService from '../services/socket';

const GroupMessages = ({ initialChatId }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    
    // Member selection states
    const [selectedParticipants, setSelectedParticipants] = useState([]); // Array of user objects
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentUser = getCurrentUser();

    const fetchGroups = async () => {
        try {
            const res = await conversationsAPI.getConversations();
            if (res.success) {
                setConversations(res.conversations.filter(c => c.isGroup));
            }
        } catch (err) {
            console.error('Failed to fetch groups:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
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
        if (!chat) {
            setSelectedChat(null);
            return;
        }
        setSelectedChat(chat);
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
    };

    const handleSearchUsers = async (term) => {
        setUserSearchTerm(term);
        if (!term.trim()) {
            setUserSearchResults([]);
            return;
        }

        setIsSearchingUsers(true);
        try {
            const res = await userAPI.searchUsers(term);
            if (res.success) {
                // Filter out already selected users
                const selectedIds = selectedParticipants.map(p => p._id);
                const filtered = res.users.filter(u => !selectedIds.includes(u._id));
                setUserSearchResults(filtered);
            }
        } catch (err) {
            console.error('User search failed:', err);
        } finally {
            setIsSearchingUsers(false);
        }
    };

    const addParticipant = (user) => {
        setSelectedParticipants(prev => [...prev, user]);
        setUserSearchResults(prev => prev.filter(u => u._id !== user._id));
        setUserSearchTerm('');
    };

    const removeParticipant = (userId) => {
        setSelectedParticipants(prev => prev.filter(p => p._id !== userId));
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        const participantIds = selectedParticipants.map(p => p._id);
        
        if (!groupName || participantIds.length < 2) return;
        
        setIsSubmitting(true);
        try {
            const res = await conversationsAPI.createGroup(groupName, participantIds);
            if (res.success) {
                setConversations(prev => [res.conversation, ...prev]);
                socketService.socket.emit('group-created', { conversation: res.conversation });
                socketService.joinConversation(res.conversation._id);
                setIsCreateOpen(false);
                setGroupName('');
                setSelectedParticipants([]);
            }
        } catch (err) {
            console.error('Group creation failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateChat = (updatedChat) => {
        if (updatedChat.isDeleted) {
            setConversations(prev => prev.filter(c => c._id !== updatedChat._id));
            if (selectedChat?._id === updatedChat._id) {
                handleSelectChat(null);
            }
        } else {
            setConversations(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
            if (selectedChat?._id === updatedChat._id) {
                handleSelectChat(updatedChat);
            }
        }
    };

    useEffect(() => {
        socketService.socket?.on('group-updated', ({ conversationId, conversation }) => {
            setConversations(prev => prev.map(c => c._id === conversationId ? conversation : c));
            if (selectedChat?._id === conversationId) {
                handleSelectChat(conversation);
            }
        });

        socketService.socket?.on('group-deleted', ({ conversationId }) => {
            setConversations(prev => prev.filter(c => c._id !== conversationId));
            if (selectedChat?._id === conversationId) {
                handleSelectChat(null);
            }
        });

        socketService.socket?.on('message-deleted', ({ messageId }) => {
            setConversations(prev => prev.map(c => {
                if (c.lastMessage?._id === messageId) {
                    return { ...c, lastMessage: { ...c.lastMessage, content: 'Message deleted' } };
                }
                return c;
            }));
        });

        socketService.socket?.on('group-joined', ({ conversation }) => {
            setConversations(prev => {
                if (prev.find(c => c._id === conversation._id)) return prev;
                return [conversation, ...prev];
            });
            socketService.joinConversation(conversation._id);
        });

        return () => {
            socketService.socket?.off('group-updated');
            socketService.socket?.off('group-deleted');
            socketService.socket?.off('message-deleted');
            socketService.socket?.off('group-joined');
        };
    }, [selectedChat?._id]);

    const filteredGroups = conversations.filter(chat =>
        chat.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full w-full overflow-hidden relative">
            {/* Sidebar List */}
            <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col bg-[#13131a] border-r border-white/10`}>
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Groups</h2>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="w-10 h-10 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] flex items-center justify-center text-white transition-all duration-300 shadow-lg shadow-[#8b5cf6]/30"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-[#8b5cf6] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#8b5cf6] focus:bg-white/10 transition-all text-sm text-white placeholder-gray-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No groups yet. Create one to start chatting!
                        </div>
                    ) : (
                        filteredGroups.map(chat => (
                            <div
                                key={chat._id}
                                onClick={() => handleSelectChat(chat)}
                                className={`p-4 mx-3 my-1 rounded-xl flex items-center gap-4 cursor-pointer transition-all duration-300 ${selectedChat?._id === chat._id
                                    ? 'bg-[#8b5cf6] shadow-lg shadow-[#8b5cf6]/30 text-white'
                                    : 'hover:bg-white/5 text-white/70'
                                    }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ring-2 ring-white/10 ${selectedChat?._id === chat._id ? 'bg-white/20' : 'bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed]'
                                        }`}>
                                        {chat.groupName?.charAt(0)}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-[#13131a] rounded-full p-0.5">
                                        <div className="bg-[#8b5cf6] rounded-full p-1.5 font-bold">
                                            <UsersIcon size={10} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-sm truncate">
                                            {chat.groupName}
                                        </h3>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] opacity-60 flex-shrink-0 ml-2 font-medium">
                                                {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                            {getUnreadCount(chat) > 0 && (
                                                <span className="bg-white text-[#8b5cf6] text-[10px] font-bold px-1.5 min-w-[1.2rem] h-5 rounded-full flex items-center justify-center mt-1 shadow-sm">
                                                    {getUnreadCount(chat)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-xs truncate font-medium ${selectedChat?._id === chat._id ? 'opacity-90' : 'opacity-50'}`}>
                                            {chat.lastMessage?.content || 'No messages yet'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">{chat.participants?.length || 0} members</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <ChatWindow chat={selectedChat} onBack={() => handleSelectChat(null)} onUpdateChat={handleUpdateChat} />

            {/* Create Group Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#13131a] rounded-3xl border border-white/10 p-8 shadow-2xl relative animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        <button onClick={() => { setIsCreateOpen(false); setSelectedParticipants([]); }} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <X size={20} />
                        </button>
                        <h3 className="text-2xl font-bold text-white mb-6">Create New Group</h3>

                        <form onSubmit={handleCreateGroup} className="space-y-6 flex flex-col flex-1 overflow-hidden">
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-bold">Group Name</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="e.g. Design Team"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#8b5cf6] focus:bg-white/10 transition-all text-white"
                                    required
                                />
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-bold">Add Members (Min 2)</label>
                                
                                {/* Selected Members Chips */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {selectedParticipants.map(participant => (
                                        <div key={participant._id} className="bg-[#8b5cf6]/20 border border-[#8b5cf6]/50 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                                            <span>{participant.name}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => removeParticipant(participant._id)}
                                                className="hover:text-red-400"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* User Search */}
                                <div className="relative mb-3">
                                    <input 
                                        type="text" 
                                        value={userSearchTerm}
                                        onChange={(e) => handleSearchUsers(e.target.value)}
                                        placeholder="Search people to add..."
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[#8b5cf6]"
                                    />
                                    {isSearchingUsers && <Loader2 className="absolute right-3 top-3 w-5 h-5 animate-spin text-gray-500" />}
                                </div>

                                {/* Search Results */}
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10 bg-black/20 rounded-xl p-2">
                                    {userSearchResults.length > 0 ? (
                                        userSearchResults.map(user => (
                                            <div
                                                key={user._id}
                                                onClick={() => addParticipant(user)}
                                                className="p-2 rounded-lg hover:bg-[#8b5cf6]/20 cursor-pointer flex items-center gap-3 transition-colors"
                                            >
                                                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                                <Plus size={16} className="text-[#8b5cf6]" />
                                            </div>
                                        ))
                                    ) : userSearchTerm && !isSearchingUsers ? (
                                        <p className="text-gray-500 text-xs text-center py-2">No users found</p>
                                    ) : (
                                        <p className="text-gray-500 text-xs text-center py-2">Type to search users</p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !groupName || selectedParticipants.length < 2}
                                className="w-full py-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-[#8b5cf6]/20 mt-auto"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Create Group (${selectedParticipants.length})`}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupMessages;
