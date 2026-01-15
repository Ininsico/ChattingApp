import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { conversationsAPI, getCurrentUser } from '../services/api';
import socketService from '../services/socket';

// Sub-components
import ChatHeader from './ChatWindowParts/ChatHeader';
import MessageList from './ChatWindowParts/MessageList';
import MessageInput from './ChatWindowParts/MessageInput';
import GroupInfo from './ChatWindowParts/GroupInfo';
import ContextMenu from './ChatWindowParts/ContextMenu';
import ForwardModal from './ChatWindowParts/ForwardModal';

const ChatWindow = ({ chat, onBack, onUpdateChat }) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Selection Mode States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState([]);

    // Search States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMatches, setSearchMatches] = useState([]); // Array of message indices
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0); // Index within searchMatches

    // UI States
    const [activeReactionMenu, setActiveReactionMenu] = useState(null);
    const [contextMenu, setContextMenu] = useState(null); // { x: number, y: number, message: object }
    const [replyingTo, setReplyingTo] = useState(null);
    const [showGroupStats, setShowGroupStats] = useState(false);

    // Local feature states (Demo/Client-side only for now)
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [starredMessages, setStarredMessages] = useState([]);

    // Forward Modal
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);

    const messagesEndRef = useRef(null);

    const currentUser = getCurrentUser();

    // Fetch Messages
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

    // Socket & Effects
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

            socketService.socket?.on('unread-update', ({ conversationId, unreadCount }) => {
                if (conversationId === chat._id) {
                    const updatedChat = { ...chat };
                    const userSettings = updatedChat.userSettings?.find(s => s.userId === currentUser?.id);
                    if (userSettings) {
                        userSettings.unreadCount = unreadCount;
                    }
                    onUpdateChat(updatedChat);
                }
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

    // Click outside handler for context menu and reactions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenu) setContextMenu(null);
            if (activeReactionMenu && !event.target.closest('.reaction-menu-container')) {
                setActiveReactionMenu(null);
            }
        };

        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                if (isSearchOpen) {
                    toggleSearch();
                } else if (contextMenu) {
                    setContextMenu(null);
                }
            }
        };

        if (contextMenu || activeReactionMenu || isSearchOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [contextMenu, activeReactionMenu, isSearchOpen]);

    // Search Logic
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
        }
    };

    // Actions
    const handleSend = (text, fileData = null) => {
        if (!text?.trim() && !fileData && !chat?._id) return;

        const messageData = {
            conversationId: chat._id,
            content: fileData
                ? (fileData.filename || `Sent a ${fileData.fileType}`)
                : text,
            messageType: fileData ? fileData.fileType : 'text',
            fileUrl: fileData ? fileData.fileUrl : null,
            fileName: fileData?.filename,
            fileSize: fileData?.fileSize,
            mimeType: fileData?.mimeType,
            fileIcon: fileData?.icon,
            replyTo: replyingTo?._id,
            isCode: text?.includes('```')
        };

        socketService.sendMessage(messageData);
        setReplyingTo(null);
        socketService.sendTypingStop(chat._id);
    };

    const handleTyping = (isTypingState) => {
        if (isTypingState) socketService.sendTypingStart(chat._id);
        else socketService.sendTypingStop(chat._id);
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
        setContextMenu(null);
        if (!window.confirm('Delete this message? This cannot be undone.')) return;

        try {
            await conversationsAPI.deleteMessage(messageId);
            setMessages(prev => prev.filter(m => m._id !== messageId));
            socketService.socket.emit('delete-message', { conversationId: chat._id, messageId });

            // Toast
            const el = document.createElement('div');
            el.innerText = '✓ Message deleted';
            el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:12px 24px;border-radius:12px;z-index:10000;font-weight:bold';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2000);
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete message: ' + (err.message || 'Unknown error'));
        }
    };

    // Selection & Bulk Delete
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
            await Promise.all(selectedMessageIds.map(id => conversationsAPI.deleteMessage(id)));
            setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m._id)));
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

    // Context Menu Handlers
    const handleContextMenu = (e, msg) => {
        if (isSelectionMode) return;
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
            if (!text || text.trim() === '') {
                alert('No text content to copy');
                setContextMenu(null);
                return;
            }
            await navigator.clipboard.writeText(text);
            const el = document.createElement('div');
            el.innerText = '✓ Copied to clipboard';
            el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:12px 24px;border-radius:12px;z-index:10000;font-weight:bold';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2000);
            setContextMenu(null);
        } catch (err) {
            console.error('Copy failed', err);
            alert('Failed to copy. Please try selecting the text manually.');
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

    const toggleStarMessage = (msgId) => {
        if (starredMessages.includes(msgId)) {
            setStarredMessages(prev => prev.filter(id => id !== msgId));
        } else {
            setStarredMessages(prev => [...prev, msgId]);
        }
        setContextMenu(null);
    };

    const handleForwardMessage = (msg) => {
        setMessageToForward(msg);
        setIsForwardModalOpen(true);
        setContextMenu(null);
    };

    const handleSaveAs = async (msg) => {
        try {
            let content = msg.content;
            let filename = 'message.txt';

            if (msg.fileUrl) {
                // Download the file
                const response = await fetch(msg.fileUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = msg.fileName || 'download';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                // Save text content
                const blob = new Blob([content], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
            setContextMenu(null);
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save message');
        }
    };

    const handleReportMessage = async (msg) => {
        const reason = prompt('Please provide a reason for reporting this message:');
        if (reason) {
            try {
                await conversationsAPI.reportConversation(chat._id, `Message reported: ${msg.content.substring(0, 50)}... Reason: ${reason}`);
                alert('Message reported. Thank you for helping keep our community safe.');
            } catch (err) {
                alert('Failed to submit report');
            }
        }
        setContextMenu(null);
    };

    // Render Logic
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

    const otherParticipant = !chat.isGroup ? chat.participants.find(p => (p._id || p.id) !== currentUser?.id) : null;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#13131a] relative">
            <ChatHeader
                chat={chat}
                currentUser={currentUser}
                otherParticipant={otherParticipant}
                onBack={onBack}
                onUpdateChat={onUpdateChat}
                onClearChat={() => setMessages([])}
                isSelectionMode={isSelectionMode}
                selectedMessageIds={selectedMessageIds}
                cancelSelectionMode={cancelSelectionMode}
                handleBulkDelete={handleBulkDelete}
                isSearchOpen={isSearchOpen}
                toggleSearch={toggleSearch}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchMatches={searchMatches}
                currentMatchIndex={currentMatchIndex}
                handleNextMatch={handleNextMatch}
                handlePrevMatch={handlePrevMatch}
                setShowGroupStats={setShowGroupStats}
            />

            <MessageList
                messages={messages}
                isLoading={isLoading}
                currentUser={currentUser}
                chat={chat}
                isSelectionMode={isSelectionMode}
                selectedMessageIds={selectedMessageIds}
                handleSelectMessage={handleSelectMessage}
                searchMatches={searchMatches}
                currentMatchIndex={currentMatchIndex}
                pinnedMessages={pinnedMessages}
                starredMessages={starredMessages}
                setReplyingTo={setReplyingTo}
                setActiveReactionMenu={setActiveReactionMenu}
                activeReactionMenu={activeReactionMenu}
                handleReaction={handleReaction}
                handleDeleteMessage={handleDeleteMessage}
                handleForwardMessage={handleForwardMessage}
                copyToClipboard={copyToClipboard}
                handleContextMenu={handleContextMenu}
                searchQuery={searchQuery}
                isTyping={isTyping}
                messagesEndRef={messagesEndRef}
            />

            <MessageInput
                chat={chat}
                onSendMessage={handleSend}
                onTyping={handleTyping}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
            />

            {showGroupStats && (
                <GroupInfo
                    chat={chat}
                    currentUser={currentUser}
                    onClose={() => setShowGroupStats(false)}
                    onUpdateChat={onUpdateChat}
                    onBack={onBack}
                />
            )}

            <ContextMenu
                contextMenu={contextMenu}
                onClose={() => setContextMenu(null)}
                onReply={(msg) => setReplyingTo(msg)}
                onCopy={(msg) => copyToClipboard(msg.fileUrl ? `${msg.fileName || 'File'}: ${msg.fileUrl}` : msg.content)}
                onForward={handleForwardMessage}
                onPin={togglePinMessage}
                onStar={toggleStarMessage}
                onSelect={(msgId) => enableSelectionMode(msgId)}
                onSaveAs={handleSaveAs}
                onReport={handleReportMessage}
                onDelete={handleDeleteMessage}
                currentUser={currentUser}
                pinnedMessages={pinnedMessages}
                starredMessages={starredMessages}
            />

            <ForwardModal
                isOpen={isForwardModalOpen}
                message={messageToForward}
                currentChatId={chat._id}
                currentUserId={currentUser?.id}
                onClose={() => { setIsForwardModalOpen(false); setMessageToForward(null); }}
            />
        </div>
    );
};

export default ChatWindow;
