import { Check, CheckCheck, Pin, Star, Reply, Smile, Copy, Forward, Trash2, X, Code } from 'lucide-react';
import FileCard from './FileCard';

const EMOJIS = [
    { name: 'heart', char: '❤️' },
    { name: 'like', char: '👍' },
    { name: 'laugh', char: '😂' },
    { name: 'wow', char: '😮' },
    { name: 'sad', char: '😢' },
    { name: 'angry', char: '😡' }
];

const highlightText = (text, query) => {
    if (!query || !query.trim()) return text;
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(part.trim());
                                        }}
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

const MessageItem = ({
    msg,
    currentUser,
    chat,
    isSelectionMode,
    isSelected,
    handleSelectMessage,
    isMatched,
    isCurrentMatch,
    pinnedMessages,
    starredMessages,
    setReplyingTo,
    setActiveReactionMenu,
    activeReactionMenu,
    handleReaction,
    handleDeleteMessage,
    handleForwardMessage,
    copyToClipboard,
    handleContextMenu,
    searchQuery,
    messages // Needed for reply lookup
}) => {
    const isMe = msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;
    const hasReactions = msg.reactions?.length > 0;

    const getReadStatus = () => {
        if (!isMe || !chat) return null;
        
        if (!chat.userSettings) return 'sent';

        if (!chat.isGroup) {
            const otherSettings = chat.userSettings.find(s => {
                 const sId = s.userId?._id || s.userId;
                 return sId !== currentUser?.id;
            });
            if (!otherSettings) return 'sent';
            
            const lastRead = new Date(otherSettings.lastReadAt);
            const msgTime = new Date(msg.createdAt);
            
            return lastRead >= msgTime ? 'read' : 'sent';
        }
        
        return 'sent'; // Fallback for groups
    };

    const readStatus = getReadStatus();

    return (
        <div
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

            <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] ${isMe ? 'order-2' : 'order-1'} relative ${isSelectionMode ? 'pointer-events-none' : ''}`}>
                {!isMe && chat.isGroup && <p className="text-[10px] text-gray-500 mb-1 ml-1">{msg.sender?.name}</p>}
                <div
                    onContextMenu={(e) => !isSelectionMode && handleContextMenu(e, msg)}
                    className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl relative group-hover:shadow-2xl transition-all duration-300 ${isMe
                        ? 'bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white rounded-br-sm shadow-lg shadow-[#06b6d4]/20'
                        : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                        } ${isCurrentMatch ? 'ring-2 ring-yellow-400 shadow-yellow-400/20' : ''} ${pinnedMessages.includes(msg._id) ? 'ring-1 ring-[#06b6d4] bg-[#06b6d4]/10' : ''}`}
                >
                    {pinnedMessages.includes(msg._id) && (
                        <div className="absolute -top-2 -right-2 bg-[#06b6d4] text-white p-0.5 rounded-full shadow-lg z-10">
                            <Pin size={10} />
                        </div>
                    )}

                    {starredMessages.includes(msg._id) && (
                        <div className="absolute -top-2 -right-8 bg-yellow-500 text-white p-0.5 rounded-full shadow-lg z-10">
                            <Star size={10} className="fill-white" />
                        </div>
                    )}

                    {msg.fileUrl && <FileCard msg={msg} currentUser={currentUser} />}

                    {msg.replyTo && (() => {
                        // Find the replied message
                        const repliedMsg = messages ? messages.find(m => m._id === msg.replyTo) : null;
                        return (
                            <div className={`mb-2 pl-3 border-l-2 ${isMe ? 'border-white/30' : 'border-[#06b6d4]'} bg-black/20 rounded-lg p-2 text-xs`}>
                                <p className="text-[#06b6d4] font-semibold mb-0.5">{repliedMsg?.sender?.name || 'User'}</p>
                                <p className="text-gray-400 line-clamp-2">{repliedMsg?.content || 'Message'}</p>
                            </div>
                        );
                    })()}

                    {/* Text content (only if not a file-only message or has additional text) */}
                    {(!msg.fileUrl || (msg.content && !msg.content.startsWith('Sent a'))) && (
                        <div className={msg.fileUrl ? "mt-2" : ""}>
                            {renderMessageContent(msg.content, searchQuery)}
                        </div>
                    )}

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

                    {/* Message Actions - Horizontal, positioned based on sender */}
                    <div className={`hidden md:flex absolute ${isMe ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full mr-2'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <div className="flex items-center gap-1 bg-[#1a1a24] rounded-lg p-1 border border-white/10 shadow-xl">
                            {/* Reply */}
                            <button
                                onClick={() => {
                                    setReplyingTo(msg);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-[#06b6d4] transition-colors"
                                title="Reply"
                            >
                                <Reply size={14} />
                            </button>

                            {/* React */}
                            <button
                                onClick={() => setActiveReactionMenu(msg._id)}
                                className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-[#06b6d4] transition-colors"
                                title="React"
                            >
                                <Smile size={14} />
                            </button>

                            {/* Copy */}
                            <button
                                onClick={() => {
                                    const textToCopy = msg.fileUrl
                                        ? `${msg.fileName || 'File'}: ${msg.fileUrl}`
                                        : msg.content;
                                    copyToClipboard(textToCopy);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-[#06b6d4] transition-colors"
                                title="Copy"
                            >
                                <Copy size={14} />
                            </button>

                            {/* Forward */}
                            <button
                                onClick={() => {
                                    handleForwardMessage(msg);
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-[#06b6d4] transition-colors"
                                title="Forward"
                            >
                                <Forward size={14} />
                            </button>

                            {/* Delete (only for own messages) */}
                            {((msg.sender?._id === currentUser?.id) || (msg.sender === currentUser?.id)) && (
                                <button
                                    onClick={() => {
                                        handleDeleteMessage(msg._id);
                                    }}
                                    className="p-1.5 hover:bg-red-500/20 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className={`flex items-center gap-1 mt-1.5 ml-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <p className="text-[10px] text-gray-600 font-medium">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {isMe && readStatus && (
                        <span className="" title={readStatus === 'read' ? "Read" : "Sent"}>
                            {readStatus === 'read' ? (
                                <CheckCheck size={14} className="text-[#06b6d4]" />
                            ) : (
                                <Check size={14} className="text-gray-400" />
                            )}
                        </span>
                    )}
                </div>

                {/* Quick Reaction Bar */}
                {
                    activeReactionMenu === msg._id && (
                        <div className={`reaction-menu-container absolute z-30 -top-12 ${isMe ? 'right-0' : 'left-0'} bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 flex gap-2.5 shadow-2xl animate-in zoom-in slide-in-from-top-4 duration-300`}>
                            {EMOJIS.map(emoji => (
                                <button key={emoji.name} onClick={() => handleReaction(msg._id, emoji.char)} className="hover:scale-150 transition-transform text-xl transform active:scale-95">{emoji.char}</button>
                            ))}
                            <button onClick={() => setActiveReactionMenu(null)} className="text-gray-500 hover:text-white ml-1 pl-2 border-l border-white/10"><X size={16} /></button>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default MessageItem;
