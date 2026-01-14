import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Send, Image, Mic, Smile, Paperclip, Loader2, Play, UserPlus, UserMinus, Trash2, Heart, ThumbsUp, Laugh, Frown, Angry, X, Trash } from 'lucide-react';
import { conversationsAPI, getCurrentUser, uploadAPI, userAPI } from '../services/api';
import socketService from '../services/socket';

const EMOJIS = [
    { name: 'heart', char: '❤️' },
    { name: 'like', char: '👍' },
    { name: 'laugh', char: '😂' },
    { name: 'wow', char: '😮' },
    { name: 'sad', char: '😢' },
    { name: 'angry', char: '😡' }
];

const ChatWindow = ({ chat, onBack, onUpdateChat }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeReactionMenu, setActiveReactionMenu] = useState(null);
    const [showGroupStats, setShowGroupStats] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const currentUser = getCurrentUser();
    const currentUserId = currentUser?.id || currentUser?._id;
    const isAdmin = chat?.isGroup && (chat?.groupAdmin === currentUserId || chat?.groupAdmin?._id === currentUserId);

    const fetchMessages = async () => {
        if (!chat?._id) return;
        setIsLoading(true);
        try {
            const res = await conversationsAPI.getMessages(chat._id);
            if (res.success) {
                setMessages(res.messages);
            }
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (chat?._id) {
            socketService.joinConversation(chat._id);
            fetchMessages();

            socketService.onNewMessage(({ conversationId, message: newMsg }) => {
                if (conversationId === chat._id) {
                    setMessages(prev => [...prev, newMsg]);
                }
            });

            socketService.onUserTyping(({ conversationId, userId, name }) => {
                if (conversationId === chat._id && userId !== currentUser?.id) {
                    setIsTyping(true);
                }
            });

            socketService.onUserStoppedTyping(({ conversationId, userId }) => {
                if (conversationId === chat._id && userId !== currentUser?.id) {
                    setIsTyping(false);
                }
            });

            socketService.socket?.on('message-reaction', ({ messageId, reactions }) => {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
            });

            socketService.socket?.on('message-deleted', ({ messageId }) => {
                setMessages(prev => prev.filter(m => m._id !== messageId));
            });

            socketService.socket?.on('group-updated', ({ conversationId, conversation }) => {
                if (conversationId === chat._id) {
                    onUpdateChat(conversation);
                }
            });

            socketService.socket?.on('group-deleted', ({ conversationId }) => {
                if (conversationId === chat._id) {
                    alert('This group has been deleted by the admin.');
                    onBack();
                    onUpdateChat({ _id: conversationId, isDeleted: true });
                }
            });
        }

        return () => {
            socketService.off('new-message');
            socketService.off('user-typing');
            socketService.off('user-stopped-typing');
            socketService.socket?.off('message-reaction');
            socketService.socket?.off('message-deleted');
            socketService.socket?.off('group-updated');
            socketService.socket?.off('group-deleted');
        };
    }, [chat?._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = (fileData = null) => {
        if (!message.trim() && !fileData && !chat?._id) return;

        const messageData = {
            conversationId: chat._id,
            content: fileData ? (fileData.fileType === 'image' ? 'Sent an image' : 'Sent a video') : message,
            messageType: fileData ? fileData.fileType : 'text',
            fileUrl: fileData ? fileData.fileUrl : null
        };

        socketService.sendMessage(messageData);
        setMessage('');
        socketService.sendTypingStop(chat._id);
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            const res = await conversationsAPI.reactToMessage(messageId, emoji);
            if (res.success) {
                socketService.socket.emit('send-reaction', {
                    conversationId: chat._id,
                    messageId,
                    reactions: res.reactions
                });
                setActiveReactionMenu(null);
            }
        } catch (err) {
            console.error('Reaction failed:', err);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Delete message?')) return;
        try {
            await conversationsAPI.deleteMessage(messageId);
            setMessages(prev => prev.filter(m => m._id !== messageId));
            socketService.socket.emit('delete-message', { conversationId: chat._id, messageId });
        } catch (err) {
            alert('Failed to delete message');
        }
    };

    const handleAddMember = async () => {
        const email = prompt('Enter user email to add:');
        if (!email) return;
        try {
            const resSearch = await userAPI.searchUsers(email);
            const userToAdd = resSearch.users?.find(u => u.email === email);
            if (!userToAdd) return alert('User not found');

            const res = await conversationsAPI.addMember(chat._id, userToAdd._id || userToAdd.id);
            if (res.success) {
                alert('Member added');
                socketService.socket.emit('add-member', { userId: userToAdd._id || userToAdd.id, conversation: res.conversation });
                onUpdateChat(res.conversation);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            const res = await conversationsAPI.removeMember(chat._id, userId);
            if (res.success) {
                alert('Member removed');
                socketService.socket.emit('group-update', { conversationId: chat._id, conversation: res.conversation });
                onUpdateChat(res.conversation);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm('CRITICAL: Are you sure you want to delete this entire group? This action cannot be undone.')) return;
        try {
            const res = await conversationsAPI.deleteGroup(chat._id);
            if (res.success) {
                socketService.socket.emit('delete-group', { conversationId: chat._id });
                onUpdateChat({ _id: chat._id, isDeleted: true });
                onBack();
            }
        } catch (err) {
            alert('Failed to delete group');
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const res = await uploadAPI.uploadFile(file);
            if (res.success) {
                handleSend({ fileUrl: res.fileUrl, fileType: res.fileType });
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handeInputChange = (e) => {
        setMessage(e.target.value);
        if (chat?._id) {
            if (e.target.value.length > 0) {
                socketService.sendTypingStart(chat._id);
            } else {
                socketService.sendTypingStop(chat._id);
            }
        }
    };

    if (!chat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#13131a]">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                    <p className="text-gray-500">Choose from your existing conversations or connect with someone new</p>
                </div>
            </div>
        );
    }

    const otherParticipant = !chat.isGroup ? chat.participants.find(p => (p._id || p.id) !== currentUserId) : null;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#13131a] relative">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />

            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all">
                        <ArrowLeft size={20} className="text-gray-400" />
                    </button>
                    <div className="relative cursor-pointer" onClick={() => chat.isGroup && setShowGroupStats(true)}>
                        <img src={chat.isGroup ? `https://ui-avatars.com/api/?name=${chat.groupName}&background=random` : otherParticipant?.avatar} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10" />
                        {!chat.isGroup && <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${otherParticipant?.status === 'online' ? 'bg-[#10b981]' : 'bg-gray-500'} rounded-full border-2 border-[#13131a]`}></div>}
                    </div>
                    <div className="cursor-pointer" onClick={() => chat.isGroup && setShowGroupStats(true)}>
                        <h3 className="font-semibold text-white text-base truncate max-w-[150px] md:max-w-none">{chat.isGroup ? chat.groupName : otherParticipant?.name}</h3>
                        <p className="text-xs text-gray-500">{chat.isGroup ? `${chat.participants.length} members` : (otherParticipant?.status === 'online' ? 'Active now' : 'Offline')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-[#06b6d4]/10 transition-all text-gray-400 hover:text-[#06b6d4]">
                        <Phone size={20} />
                    </button>
                    <button className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-[#06b6d4]/10 transition-all text-gray-400 hover:text-[#06b6d4]">
                        <Video size={20} />
                    </button>
                    <button onClick={() => chat.isGroup && setShowGroupStats(true)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all text-gray-400 hover:text-white">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-20">No messages yet. Say hello!</div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;
                        const hasReactions = msg.reactions?.length > 0;

                        return (
                            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative mb-6`}>
                                <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'order-2' : 'order-1'} relative`}>
                                    {!isMe && chat.isGroup && <p className="text-[10px] text-gray-500 mb-1 ml-1">{msg.sender?.name}</p>}
                                    <div
                                        onContextMenu={(e) => { e.preventDefault(); setActiveReactionMenu(msg._id); }}
                                        className={`px-4 py-3 rounded-2xl relative group-hover:shadow-2xl transition-all duration-300 ${isMe
                                            ? 'bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white rounded-br-sm shadow-lg shadow-[#06b6d4]/20'
                                            : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                                            }`}>
                                        {msg.messageType === 'image' && msg.fileUrl && (
                                            <div className="mb-2 rounded-lg overflow-hidden ring-1 ring-white/10">
                                                <img src={msg.fileUrl} alt="" className="max-w-full h-auto max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.fileUrl, '_blank')} />
                                            </div>
                                        )}
                                        {msg.messageType === 'video' && msg.fileUrl && (
                                            <div className="mb-2 rounded-lg overflow-hidden ring-1 ring-white/10">
                                                <video src={msg.fileUrl} className="max-w-full h-auto max-h-80" controls />
                                            </div>
                                        )}
                                        <p className="text-sm leading-relaxed break-words">{msg.content}</p>

                                        {/* Reaction Display */}
                                        {hasReactions && (
                                            <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex -space-x-1`}>
                                                {Array.from(new Set(msg.reactions.map(r => r.emoji))).map((emoji, i) => (
                                                    <div key={i} className="bg-[#1a1a24] border border-white/10 rounded-full px-2 py-0.5 text-[10px] shadow-xl animate-in zoom-in duration-300">
                                                        {emoji}
                                                    </div>
                                                ))}
                                                {msg.reactions.length > 1 && <span className="text-[9px] text-gray-400 bg-[#1a1a24] px-1.5 rounded-full border border-white/10 flex items-center">{msg.reactions.length}</span>}
                                            </div>
                                        )}

                                        {/* Message Actions Menu (Absolute) */}
                                        <div className={`absolute ${isMe ? '-left-12' : '-right-12'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
                                            <button onClick={() => setActiveReactionMenu(msg._id)} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors"><Smile size={16} /></button>
                                            {isMe && <button onClick={() => handleDeleteMessage(msg._id)} className="p-2 hover:bg-red-500/10 rounded-full text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-1.5 ml-1 font-medium">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                                    {/* Quick Reaction Bar */}
                                    {activeReactionMenu === msg._id && (
                                        <div className={`absolute z-30 -top-12 ${isMe ? 'right-0' : 'left-0'} bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 flex gap-2.5 shadow-2xl animate-in zoom-in slide-in-from-top-4 duration-300`}>
                                            {EMOJIS.map(emoji => (
                                                <button key={emoji.name} onClick={() => handleReaction(msg._id, emoji.char)} className="hover:scale-150 transition-transform text-xl transform active:scale-95">{emoji.char}</button>
                                            ))}
                                            <button onClick={() => setActiveReactionMenu(null)} className="text-gray-500 hover:text-white ml-1 pl-2 border-l border-white/10"><X size={16} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                {isTyping && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="bg-white/5 px-4 py-2 rounded-2xl rounded-bl-sm border border-white/5 text-gray-400 text-xs flex items-center gap-2">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-[#06b6d4] rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-[#06b6d4] rounded-full animate-bounce delay-150"></span>
                                <span className="w-1.5 h-1.5 bg-[#06b6d4] rounded-full animate-bounce delay-300"></span>
                            </div>
                            someone is typing...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Group Info Modal */}
            {showGroupStats && (
                <div className="absolute inset-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-500">
                    <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowGroupStats(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><ArrowLeft /></button>
                            <h2 className="text-xl font-bold">Group Info</h2>
                        </div>
                        {isAdmin && (
                            <button onClick={handleAddMember} className="flex items-center gap-2 px-4 py-2 bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-xl font-semibold shadow-lg shadow-[#06b6d4]/20 transition-all active:scale-95">
                                <UserPlus size={18} />
                                <span className="hidden sm:inline">Add Member</span>
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
                        <div className="text-center mb-12">
                            <div className="w-32 h-32 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#06b6d4] to-[#8b5cf6] flex items-center justify-center text-4xl font-bold text-white shadow-2xl relative group">
                                {chat.groupName?.charAt(0)}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center cursor-pointer">
                                    <Image size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold mb-2 text-white">{chat.groupName}</h3>
                            <p className="text-gray-400 font-medium">Created for world-class conversations • {chat.participants.length} members</p>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#06b6d4] rounded-full"></div>
                                    Participants
                                </h4>
                                <div className="grid gap-4">
                                    {chat.participants.map(member => (
                                        <div key={member._id} className="group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img src={member.avatar} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10" alt="" />
                                                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-[#13131a]`}></div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{member.name} {member._id === currentUser.id && <span className="text-[10px] text-gray-500 ml-1">(You)</span>}</p>
                                                    <p className="text-[11px] text-gray-500 truncate max-w-[150px]">{member.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {(chat.groupAdmin === member._id || chat.groupAdmin?._id === member._id) && (
                                                    <span className="text-[10px] bg-[#06b6d4]/10 text-[#06b6d4] px-2 py-1 rounded-md font-bold uppercase tracking-wider border border-[#06b6d4]/20">Admin</span>
                                                )}
                                                {isAdmin && member._id !== currentUser.id && (
                                                    <button onClick={() => handleRemoveMember(member._id)} className="p-2.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                        <UserMinus size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="mt-12 pt-8 border-t border-white/10">
                                    <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2"> Danger Zone </h4>
                                    <button
                                        onClick={handleDeleteGroup}
                                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-bold border border-red-500/20 transition-all active:scale-95"
                                    >
                                        <Trash size={20} />
                                        Delete Group Permanently
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 md:p-6 border-t border-white/10 bg-white/5 backdrop-blur-lg">
                <div className="flex items-center gap-3 md:gap-4 max-w-5xl mx-auto">
                    <div className="flex items-center gap-1">
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-2xl hover:bg-white/10 text-gray-400 hover:text-[#06b6d4] transition-all">
                            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
                        </button>
                    </div>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={message}
                            onChange={handeInputChange}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            className="w-full px-5 py-3 md:py-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-[#06b6d4] focus:bg-white/15 text-white placeholder-gray-500 transition-all font-medium"
                        />
                        <button onClick={() => setActiveReactionMenu(messages[messages.length - 1]?._id)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#06b6d4] transition-colors">
                            <Smile size={22} />
                        </button>
                    </div>

                    <button onClick={() => handleSend()} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white shadow-xl shadow-[#06b6d4]/30 hover:scale-105 transition-all transform active:scale-95">
                        <Send size={22} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
