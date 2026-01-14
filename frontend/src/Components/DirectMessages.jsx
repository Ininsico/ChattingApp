import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { Search, UserPlus, X, Loader2, Bell } from 'lucide-react';
import { conversationsAPI, friendsAPI, getCurrentUser } from '../services/api';
import socketService from '../services/socket';

const DirectMessages = () => {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const [friendEmail, setFriendEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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

        socketService.socket?.on('request-accepted', ({ conversation }) => {
            setConversations(prev => [conversation, ...prev]);
        });

        return () => {
            socketService.off('new-message');
            socketService.socket?.off('request-accepted');
        };
    }, []);

    const handleUpdateChat = (updatedChat) => {
        setConversations(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
        if (selectedChat?._id === updatedChat._id) {
            setSelectedChat(updatedChat);
        }
    };

    const handleAddFriend = async (e) => {
        e.preventDefault();
        if (!friendEmail) return;
        setIsSubmitting(true);
        setError('');
        try {
            const res = await friendsAPI.sendRequest(friendEmail);
            if (res.success) {
                socketService.socket.emit('friend-request-sent', {
                    targetUserId: res.friendRequest.to._id,
                    request: res.friendRequest
                });
                setIsAddFriendOpen(false);
                setFriendEmail('');
                alert('Friend request sent!');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredConversations = conversations.filter(conv => {
        if (conv.isGroup) return false;
        const currentUserId = currentUser?.id || currentUser?._id;
        const other = conv.participants.find(p => (p._id || p.id) !== currentUserId);
        return other?.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex h-full w-full overflow-hidden relative">
            <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col bg-[#13131a] border-r border-white/10`}>
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Messages</h2>
                        <button
                            onClick={() => setIsAddFriendOpen(true)}
                            className="w-10 h-10 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] flex items-center justify-center text-white transition-all shadow-lg"
                        >
                            <UserPlus size={20} />
                        </button>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-[#06b6d4]" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#06b6d4] text-white"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No conversations. Add friends via email!</div>
                    ) : (
                        filteredConversations.map(conv => {
                            const currentUserId = currentUser?.id || currentUser?._id;
                            const other = conv.participants.find(p => (p._id || p.id) !== currentUserId);
                            return (
                                <div
                                    key={conv._id}
                                    onClick={() => setSelectedChat(conv)}
                                    className={`p-4 mx-3 my-1 rounded-xl flex items-center gap-4 cursor-pointer transition-all ${selectedChat?._id === conv._id ? 'bg-[#06b6d4] shadow-lg' : 'hover:bg-white/5'
                                        }`}
                                >
                                    <img src={other?.avatar} className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-semibold text-sm truncate text-white">{other?.name}</h3>
                                            <span className="text-xs text-gray-500">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                        </div>
                                        <p className="text-sm truncate text-gray-400">{conv.lastMessage?.content || 'No messages yet'}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            <ChatWindow chat={selectedChat} onBack={() => setSelectedChat(null)} onUpdateChat={handleUpdateChat} />

            {isAddFriendOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#13131a] rounded-3xl border border-white/10 p-8 shadow-2xl relative animate-in zoom-in duration-300">
                        <button onClick={() => setIsAddFriendOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
                        <h3 className="text-2xl font-bold text-white mb-2">Add Connection</h3>
                        <form onSubmit={handleAddFriend} className="space-y-4">
                            <input type="email" value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} placeholder="friend@example.com" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[#06b6d4]" required />
                            {error && <p className="text-red-500 text-xs">{error}</p>}
                            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#06b6d4] text-white rounded-xl font-bold flex justify-center items-center">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Connection Request'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DirectMessages;
