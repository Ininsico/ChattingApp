import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowLeft, Search, MoreVertical, Send, Image, Paperclip, Loader2, 
    UserPlus, UserMinus, Trash2, Smile, X, ChevronUp, ChevronDown,
    Bell, BellOff, ExternalLink, MessageSquareX, Flag, Info, ChevronRight, Check,
    Reply, Forward, Pin, Star, Copy, CheckSquare, Code, MousePointer2, Download, FileText, FileArchive, File, Music
} from 'lucide-react';
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
    const [contextMenu, setContextMenu] = useState(null); // { x: number, y: number, message: object }
    const [replyingTo, setReplyingTo] = useState(null);
    const [pinnedMessages, setPinnedMessages] = useState([]); // Local state for demo
    const [showGroupStats, setShowGroupStats] = useState(false);
    
    // Selection Mode States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);

    // Search States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMatches, setSearchMatches] = useState([]); // Array of message indices
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0); // Index within searchMatches

    // Menu States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showMuteOptions, setShowMuteOptions] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const searchInputRef = useRef(null);
    const menuRef = useRef(null);

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
        if (!isSearchOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, isSearchOpen]);

    // Click outside menu to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
                setShowMuteOptions(false);
            }
            if (contextMenu) setContextMenu(null);
            if (activeReactionMenu && !event.target.closest('.reaction-menu-container')) {
                setActiveReactionMenu(null);
            }
        };

        if (isMenuOpen || contextMenu || activeReactionMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen, contextMenu, activeReactionMenu]);

    // Search Functionality
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchMatches([]);
            setCurrentMatchIndex(0);
            return;
        }

        const matches = messages.reduce((acc, msg, index) => {
            if (msg.messageType === 'text' && msg.content && msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
                acc.push(index);
            }
            return acc;
        }, []);

        setSearchMatches(matches);
        setCurrentMatchIndex(matches.length > 0 ? matches.length - 1 : 0);
        
        if (matches.length > 0) {
             scrollToMessage(matches[matches.length - 1]);
        }
    }, [searchQuery, messages]);

    const scrollToMessage = (msgIndex) => {
        const msg = messages[msgIndex];
        if (msg) {
            const el = document.getElementById(`msg-${msg._id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const handleNextMatch = () => {
        if (searchMatches.length === 0) return;
        const nextIndex = currentMatchIndex + 1 >= searchMatches.length ? 0 : currentMatchIndex + 1;
        setCurrentMatchIndex(nextIndex);
        scrollToMessage(searchMatches[nextIndex]);
    };

    const handlePrevMatch = () => {
        if (searchMatches.length === 0) return;
        const prevIndex = currentMatchIndex - 1 < 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
        setCurrentMatchIndex(prevIndex);
        scrollToMessage(searchMatches[prevIndex]);
    };

    const toggleSearch = () => {
        if (isSearchOpen) {
            setIsSearchOpen(false);
            setSearchQuery('');
            setSearchMatches([]);
        } else {
            setIsSearchOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    };

    const highlightText = (text, query) => {
        if (!query.trim()) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) => 
                    part.toLowerCase() === query.toLowerCase() ? (
                        <span key={i} className="bg-yellow-500/50 text-white px-0.5 rounded animate-pulse font-bold">{part}</span>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    const handleSend = (fileData = null) => {
        if (!message.trim() && !fileData && !chat?._id) return;

        const messageData = {
            conversationId: chat._id,
            content: fileData 
                ? (fileData.filename || `Sent a ${fileData.fileType}`) 
                : message,
            messageType: fileData ? fileData.fileType : 'text',
            fileUrl: fileData ? fileData.fileUrl : null,
            fileName: fileData?.filename,
            fileSize: fileData?.fileSize,
            mimeType: fileData?.mimeType,
            fileIcon: fileData?.icon,
            replyTo: replyingTo?._id,
            isCode: message.includes('```')
        };

        socketService.sendMessage(messageData);
        setMessage('');
        setReplyingTo(null);
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
        setContextMenu(null);
    };

    // Selection & Bulk Delete Logic
    const enableSelectionMode = (initialMsgId) => {
        setIsSelectionMode(true);
        setSelectedMessageIds([initialMsgId]);
        setContextMenu(null);
    };

    const handleSelectMessage = (msgId) => {
        setSelectedMessageIds(prev => {
            if (prev.includes(msgId)) {
                return prev.filter(id => id !== msgId);
            }
            return [...prev, msgId];
        });
    };

    const handleBulkDelete = async () => {
        if (selectedMessageIds.length === 0) return;
        if (!window.confirm(`Delete ${selectedMessageIds.length} messages? This cannot be undone.`)) return;

        setIsLoading(true);
        try {
            // We'll process these in parallel for now
            await Promise.all(selectedMessageIds.map(id => conversationsAPI.deleteMessage(id)));
            
            // Remove from local state
            setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m._id)));
            
            // Emit socket events for each
            selectedMessageIds.forEach(id => {
                socketService.socket.emit('delete-message', { conversationId: chat._id, messageId: id });
            });

            setIsSelectionMode(false);
            setSelectedMessageIds([]);
        } catch (err) {
            console.error('Bulk delete failed:', err);
            alert('Some messages could not be deleted.');
        } finally {
            setIsLoading(false);
        }
    };

    const cancelSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedMessageIds([]);
    };

    const handleContextMenu = (e, msg) => {
        if (isSelectionMode) return; // Disable context menu in selection mode
        e.preventDefault();
        setContextMenu({
            x: e.pageX,
            y: e.pageY,
            message: msg
        });
        setActiveReactionMenu(null);
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            // Simple visual feedback could be improved with a toast system later
            const el = document.createElement('div');
            el.innerText = 'Copied to clipboard';
            el.style.position = 'fixed';
            el.style.bottom = '20px';
            el.style.left = '50%';
            el.style.transform = 'translateX(-50%)';
            el.style.backgroundColor = '#06b6d4';
            el.style.color = 'white';
            el.style.padding = '8px 16px';
            el.style.borderRadius = '20px';
            el.style.zIndex = '10000';
            el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2000);
            setContextMenu(null);
        } catch (err) {
            console.error('Copy failed', err);
            alert('Failed to copy text. Please try selecting manually.');
        }
    };

    const togglePinMessage = (msgId) => {
        if (pinnedMessages.includes(msgId)) {
            setPinnedMessages(prev => prev.filter(id => id !== msgId));
        } else {
            setPinnedMessages(prev => [...prev, msgId]);
        }
        setContextMenu(null);
    };

    const renderMessageContent = (content, query) => {
        if (!content) return null;
        
        // Check for code blocks
        const codeBlockRegex = /```([\s\S]*?)```/g;
        if (codeBlockRegex.test(content)) {
            const parts = content.split(codeBlockRegex);
            return (
                <div className="space-y-2 select-text">
                    {parts.map((part, index) => {
                        if (index % 2 === 1) { // Code block
                            return (
                                <div key={index} className="relative group/code text-left my-2">
                                    <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10 w-fit">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(part.trim()); }}
                                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-mono flex items-center gap-1 text-gray-300 hover:text-white"
                                        >
                                            <Copy size={12} /> Copy
                                        </button>
                                    </div>
                                    <pre className="bg-[#0d0d12] border border-white/10 rounded-lg p-3 overflow-x-auto text-sm font-mono text-gray-300 select-text">
                                        <code>{part.trim()}</code>
                                    </pre>
                                </div>
                            );
                        }
                        return part.trim() && <p key={index} className="whitespace-pre-wrap select-text">{highlightText(part, query)}</p>;
                    })}
                </div>
            );
        }

        return <p className="text-sm leading-relaxed break-words whitespace-pre-wrap select-text">{highlightText(content, query)}</p>;
    };

    // Menu Actions
    const handleMute = async (duration) => {
        try {
            let mutedUntil = null;
            const now = new Date();
            if (duration === '1h') mutedUntil = new Date(now.setHours(now.getHours() + 1));
            if (duration === '8h') mutedUntil = new Date(now.setHours(now.getHours() + 8));
            if (duration === '24h') mutedUntil = new Date(now.setHours(now.getHours() + 24));
            if (duration === 'always') mutedUntil = new Date(9999, 0, 1);
        
            await conversationsAPI.updateSettings(chat._id, 'mute', mutedUntil);
            alert(mutedUntil ? `Chat muted until ${mutedUntil.toLocaleString()}` : 'Chat unmuted');
            setIsMenuOpen(false);
            setShowMuteOptions(false);
        } catch (err) {
            console.error(err);
            alert('Failed to update mute settings');
        }
    };

    const handleOpenNewWindow = () => {
        const url = `${window.location.origin}/chat?cid=${chat._id}&type=${chat.isGroup ? 'group' : 'direct'}`;
        window.open(url, '_blank', 'width=1000,height=800');
        setIsMenuOpen(false);
    };

    const handleMarkUnread = async () => {
        try {
            await conversationsAPI.updateSettings(chat._id, 'unread', true);
            setIsMenuOpen(false);
            if (onBack) onBack();
        } catch(err) {
            console.error(err);
            alert('Failed to mark as unread');
        }
    };

    const handleClearChat = async () => {
        if (!window.confirm("Clear chat history? This will only remove messages from your view.")) return;
        try {
            await conversationsAPI.updateSettings(chat._id, 'clear', null);
            setMessages([]);
            setIsMenuOpen(false);
        } catch(err) {
            alert('Failed to clear chat');
        }
    };

    const handleReport = async () => {
        const reason = prompt("Please provide a reason for reporting this conversation:");
        if (reason) {
            try {
                await conversationsAPI.reportConversation(chat._id, reason);
                alert("Report submitted. Thank you helping keep our community safe.");
            } catch(err) {
                alert('Failed to submit report');
            }
        }
        setIsMenuOpen(false);
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
                handleSend({
                    fileUrl: res.fileUrl,
                    fileType: res.fileType,
                    filename: res.filename,
                    fileSize: res.fileSize,
                    mimeType: res.mimeType,
                    icon: res.icon
                });
            }
        } catch (err) {
            console.error('Upload failed:', err);
            
            // Check for security block
            if (err.response?.data?.securityBlock) {
                alert(`🔒 Security Alert\n\n${err.response.data.message}\n\nReason: ${err.response.data.reason || 'Unknown'}\n\nYour file has been blocked and removed for security reasons. Please ensure you are only sharing safe files.`);
            } else {
                alert(`Failed to upload file: ${err.response?.data?.message || err.message || 'Unknown error'}`);
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const renderFileCard = (msg) => {
        if (!msg.fileUrl) return null;

        const handleDownload = async () => {
            try {
                const response = await fetch(`/api/upload/download/${msg._id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Download failed');
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = msg.fileName || 'download';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (err) {
                console.error('Download error:', err);
                alert('Failed to download file');
            }
        };

        // Render based on file type
        if (msg.messageType === 'image') {
            return (
                <div className="mb-2 rounded-lg overflow-hidden ring-1 ring-white/10">
                    <img 
                        src={msg.fileUrl} 
                        alt={msg.fileName || 'Image'} 
                        className="max-w-full h-auto max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => window.open(msg.fileUrl, '_blank')} 
                    />
                </div>
            );
        }

        if (msg.messageType === 'video') {
            return (
                <div className="mb-2 rounded-lg overflow-hidden ring-1 ring-white/10">
                    <video src={msg.fileUrl} className="max-w-full h-auto max-h-80" controls />
                </div>
            );
        }

        // Document, archive, audio, or generic file card
        const fileIcon = msg.fileIcon || '📎';
        const isMe = msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;

        return (
            <div className={`rounded-xl p-4 border ${
                isMe 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-black/20 border-white/10'
            } max-w-sm`}>
                <div className="flex items-start gap-3">
                    <div className="text-4xl flex-shrink-0">{fileIcon}</div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate mb-1">
                            {msg.fileName || 'File'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {formatFileSize(msg.fileSize)}
                            {msg.mimeType && ` • ${msg.mimeType.split('/')[1].toUpperCase()}`}
                        </p>
                        <button 
                            onClick={handleDownload}
                            className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-lg text-xs font-semibold transition-all active:scale-95"
                        >
                            <Download size={14} />
                            Download
                        </button>
                    </div>
                </div>
            </div>
        );
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
                        <Info className="w-12 h-12 text-gray-500" />
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
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,audio/*" 
                className="hidden" 
            />

            {/* Header */}
            {isSelectionMode ? (
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#06b6d4]/10 z-10 animate-in slide-in-from-top-2">
                     <div className="flex items-center gap-4">
                        <button onClick={cancelSelectionMode} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-all">
                            <X size={20} />
                        </button>
                        <div>
                            <h3 className="font-bold text-white text-lg">{selectedMessageIds.length} Selected</h3>
                        </div>
                     </div>
                     <button 
                        onClick={handleBulkDelete}
                        disabled={selectedMessageIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                     >
                        <Trash2 size={18} />
                        <span>Delete</span>
                     </button>
                </div>
            ) : (
                <div className="p-4 border-b border-white/10 flex flex-col gap-2 bg-white/5 z-10">
                    <div className="flex justify-between items-center relative">
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
                            <button 
                                onClick={toggleSearch} 
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isSearchOpen ? 'bg-[#06b6d4] text-white' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                            >
                                <Search size={20} />
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button 
                                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isMenuOpen ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                                >
                                    <MoreVertical size={20} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {isMenuOpen && (
                                    <div className="absolute right-0 top-12 w-72 bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
                                        <div className="p-1.5 space-y-0.5">
                                            <div className="relative group">
                                                <button 
                                                    onClick={() => setShowMuteOptions(!showMuteOptions)} 
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors"
                                                >
                                                    <BellOff size={16} />
                                                    <span className="flex-1">Mute Notifications</span>
                                                    <ChevronRight size={14} className={`transition-transform ${showMuteOptions ? 'rotate-90' : ''}`} />
                                                </button>
                                                
                                                {showMuteOptions && (
                                                    <div className="mt-1 ml-4 border-l border-white/10 pl-2 space-y-1 animate-in slide-in-from-left-2 duration-200">
                                                        <button onClick={() => handleMute('1h')} className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-[#06b6d4] hover:bg-white/5 rounded-lg transition-colors">1 Hour</button>
                                                        <button onClick={() => handleMute('8h')} className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-[#06b6d4] hover:bg-white/5 rounded-lg transition-colors">8 Hours</button>
                                                        <button onClick={() => handleMute('24h')} className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-[#06b6d4] hover:bg-white/5 rounded-lg transition-colors">24 Hours</button>
                                                        <button onClick={() => handleMute('always')} className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-[#06b6d4] hover:bg-white/5 rounded-lg transition-colors">Until I turn it back on</button>
                                                    </div>
                                                )}
                                            </div>

                                            <button onClick={handleOpenNewWindow} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors">
                                                <ExternalLink size={16} />
                                                Open in New Window
                                            </button>

                                            <button onClick={handleMarkUnread} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors">
                                                <MessageSquareX size={16} />
                                                Mark as Unread
                                            </button>

                                            <button onClick={handleClearChat} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors">
                                                <Trash2 size={16} />
                                                Clear Chat (Local Only)
                                            </button>

                                            <button onClick={() => { setShowGroupStats(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors">
                                                <Info size={16} />
                                                View {chat.isGroup ? 'Group' : 'Contact'} Info
                                            </button>
                                        </div>

                                        <div className="h-px bg-white/10 mx-3 my-1"></div>

                                        <div className="p-1.5">
                                            <button onClick={handleReport} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-xl text-left text-sm text-red-500 transition-colors bg-red-500/5 mt-0.5">
                                                <Flag size={16} />
                                                Report Issue
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    {isSearchOpen && (
                        <div className="mt-2 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search in this chat..."
                                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm outline-none focus:border-[#06b6d4] transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-1 bg-black/20 rounded-lg border border-white/10 p-1">
                                <span className="text-xs text-gray-400 px-2 min-w-[3rem] text-center font-mono">
                                    {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                                </span>
                                <button onClick={handlePrevMatch} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-50" disabled={searchMatches.length === 0}>
                                    <ChevronUp size={16} />
                                </button>
                                <button onClick={handleNextMatch} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-50" disabled={searchMatches.length === 0}>
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            <button onClick={toggleSearch} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-20">No messages yet. Say hello!</div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;
                        const hasReactions = msg.reactions?.length > 0;
                        const isMatched = searchMatches.includes(index);
                        const isCurrentMatch = searchMatches[currentMatchIndex] === index;

                        const isSelected = selectedMessageIds.includes(msg._id);

                        return (
                            <div 
                                key={msg._id} 
                                id={`msg-${msg._id}`}
                                onClick={() => isSelectionMode && handleSelectMessage(msg._id)}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative mb-6 transition-all duration-500 ${isCurrentMatch ? 'scale-[1.02]' : ''} ${isSelectionMode ? 'cursor-pointer hover:bg-white/5 -mx-4 px-4 py-2' : ''}`}
                            >
                                {isSelectionMode && (
                                    <div className={`flex items-center justify-center mr-4 ${isMe ? 'order-3 ml-4 mr-0' : ''}`}>
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#06b6d4] border-[#06b6d4]' : 'border-gray-500 bg-transparent'}`}>
                                            {isSelected && <Check size={16} className="text-white" />}
                                        </div>
                                    </div>
                                )}

                                <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'order-2' : 'order-1'} relative ${isSelectionMode ? 'pointer-events-none' : ''}`}>
                                    {!isMe && chat.isGroup && <p className="text-[10px] text-gray-500 mb-1 ml-1">{msg.sender?.name}</p>}
                                    <div
                                        onContextMenu={(e) => !isSelectionMode && handleContextMenu(e, msg)}
                                        className={`px-4 py-3 rounded-2xl relative group-hover:shadow-2xl transition-all duration-300 ${isMe
                                            ? 'bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white rounded-br-sm shadow-lg shadow-[#06b6d4]/20'
                                            : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                                            } ${isCurrentMatch ? 'ring-2 ring-yellow-400 shadow-yellow-400/20' : ''} ${pinnedMessages.includes(msg._id) ? 'ring-1 ring-[#06b6d4] bg-[#06b6d4]/10' : ''}`}>
                                        
                                        {pinnedMessages.includes(msg._id) && (
                                            <div className="absolute -top-2 -right-2 bg-[#06b6d4] text-white p-0.5 rounded-full shadow-lg z-10">
                                                <Pin size={10} />
                                            </div>
                                        )}

                                        {/* File attachment rendering */}
                                        {msg.fileUrl && renderFileCard(msg)}
                                        
                                        {msg.replyTo && ( // Visual indicator for replies (mockup logic as we don't fetch linked msg yet fully, but structure is here)
                                           <div className={`mb-2 pl-3 border-l-2 ${isMe ? 'border-white/30' : 'border-[#06b6d4]'} opacity-75 text-xs`}>
                                               Replying to a message...
                                           </div>
                                        )}

                                        {/* Text content (only if not a file-only message or has additional text) */}
                                        {(!msg.fileUrl || (msg.content && !msg.content.startsWith('Sent a'))) && renderMessageContent(msg.content, searchQuery)}

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
                                            <button onClick={(e) => handleContextMenu(e, msg)} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors md:hidden"><MoreVertical size={16} /></button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-1.5 ml-1 font-medium">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                                    {/* Quick Reaction Bar */}
                                    {activeReactionMenu === msg._id && (
                                        <div className={`reaction-menu-container absolute z-30 -top-12 ${isMe ? 'right-0' : 'left-0'} bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 flex gap-2.5 shadow-2xl animate-in zoom-in slide-in-from-top-4 duration-300`}>
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
                            <h2 className="text-xl font-bold">{chat.isGroup ? 'Group Info' : 'Contact Info'}</h2>
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
                                {chat.isGroup ? chat.groupName?.charAt(0) : otherParticipant?.name?.charAt(0)}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center cursor-pointer">
                                    <Image size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold mb-2 text-white">{chat.isGroup ? chat.groupName : otherParticipant?.name}</h3>
                            <p className="text-gray-400 font-medium">
                                {chat.isGroup 
                                    ? `Created for world-class conversations • ${chat.participants.length} members`
                                    : otherParticipant?.email
                                }
                            </p>
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
                                                {chat.isGroup && (chat.groupAdmin === member._id || chat.groupAdmin?._id === member._id) && (
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
                                        <Trash2 size={20} />
                                        Delete Group Permanently
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="border-t border-white/10 bg-white/5 backdrop-blur-lg">
                {replyingTo && (
                    <div className="px-6 py-2 bg-[#1a1a24] border-b border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <Reply size={16} className="text-[#06b6d4]" />
                            <div className="text-sm">
                                <span className="text-[#06b6d4] font-semibold">Replying to {replyingTo.sender?.name || 'user'}</span>
                                <p className="text-gray-500 truncate max-w-[200px] md:max-w-md">{replyingTo.content}</p>
                            </div>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full">
                            <X size={16} className="text-gray-500" />
                        </button>
                    </div>
                )}
                <div className="p-4 md:p-6">
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
            {/* Context Menu Portal */}
            {contextMenu && (
                <div 
                    className="fixed z-[9999] bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl w-48 overflow-hidden animate-in zoom-in-95 duration-200"
                    style={{ top: Math.min(contextMenu.y, window.innerHeight - 300), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-1 space-y-0.5">
                        <button onClick={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <Reply size={14} /> Reply
                        </button>
                        <button onClick={() => { copyToClipboard(contextMenu.message.content); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <Copy size={14} /> Copy
                        </button>
                        <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <Forward size={14} /> Forward
                        </button>
                        <button onClick={() => togglePinMessage(contextMenu.message._id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <Pin size={14} /> {pinnedMessages.includes(contextMenu.message._id) ? 'Unpin' : 'Pin'}
                        </button>
                        <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <Star size={14} /> Star
                        </button>
                        <button onClick={() => { enableSelectionMode(contextMenu.message._id); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <CheckSquare size={14} /> Select (Bulk Actions)
                        </button>
                        
                        <div className="h-px bg-white/10 my-1"></div>
                        
                        <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Flag size={14} /> Report
                        </button>
                        {((contextMenu.message.sender?._id === currentUser?.id) || (contextMenu.message.sender === currentUser?.id)) && (
                            <button onClick={() => handleDeleteMessage(contextMenu.message._id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 size={14} /> Delete
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
