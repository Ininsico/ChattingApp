import { useState, useRef, useEffect } from 'react';
import {
    ArrowLeft, Search, MoreVertical, X, Trash2,
    BellOff, ChevronRight, ExternalLink, MessageSquareX,
    Info, Flag, ChevronUp, ChevronDown
} from 'lucide-react';
import { conversationsAPI } from '../../services/api';

const ChatHeader = ({
    chat,
    currentUser,
    otherParticipant,
    onBack,
    onUpdateChat,
    onClearChat, // Callback to clear messages in parent
    isSelectionMode,
    selectedMessageIds,
    cancelSelectionMode,
    handleBulkDelete,
    isSearchOpen,
    toggleSearch,
    searchQuery,
    setSearchQuery,
    searchMatches,
    currentMatchIndex,
    handleNextMatch,
    handlePrevMatch,
    setShowGroupStats
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showMuteOptions, setShowMuteOptions] = useState(false);
    const menuRef = useRef(null);
    const searchInputRef = useRef(null);

    // Auto-focus search input
    useEffect(() => {
        if (isSearchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isSearchOpen]);

    // Click outside menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
                setShowMuteOptions(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

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
        } catch {
            console.error('Failed to update mute settings');
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
            const res = await conversationsAPI.updateSettings(chat._id, 'unread', true);
            if (res.success) {
                const updatedChat = { ...chat };
                if (!updatedChat.userSettings) updatedChat.userSettings = [];

                const userIndex = updatedChat.userSettings.findIndex(s => s.userId === currentUser?.id || s.userId?._id === currentUser?.id);
                if (userIndex > -1) {
                    updatedChat.userSettings[userIndex] = { ...updatedChat.userSettings[userIndex], isUnread: true };
                } else {
                    updatedChat.userSettings.push({ userId: currentUser?.id, isUnread: true });
                }

                onUpdateChat(updatedChat);
                setIsMenuOpen(false);
                if (onBack) onBack();
            }
        } catch (err) {
            console.error(err);
            alert('Failed to mark as unread');
        }
    };

    const handleClearChatClick = async () => {
        if (!window.confirm("Clear chat history? This will only remove messages from your view.")) return;
        try {
            await conversationsAPI.updateSettings(chat._id, 'clear', null);
            onClearChat(); // Call parent to clear messages state

            // Update the conversation preview to show no last message
            const updatedChat = {
                ...chat,
                lastMessage: { content: 'Chat cleared' }
            };
            onUpdateChat(updatedChat);

            setIsMenuOpen(false);
        } catch {
            alert('Failed to clear chat');
        }
    };

    const handleReport = async () => {
        const reason = prompt("Please provide a reason for reporting this conversation:");
        if (reason) {
            try {
                await conversationsAPI.reportConversation(chat._id, reason);
                alert("Report submitted. Thank you for helping keep our community safe.");
            } catch {
                alert('Failed to clear chat');
            }
        }
        setIsMenuOpen(false);
    };

    if (isSelectionMode) {
        return (
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
        );
    }

    return (
        <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col gap-2 bg-white/5 z-10">
            <div className="flex justify-between items-center relative">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                    <button onClick={onBack} className="md:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all flex-shrink-0">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                    <div className="relative cursor-pointer flex-shrink-0" onClick={() => chat.isGroup && setShowGroupStats(true)}>
                        <img src={chat.isGroup ? `https://ui-avatars.com/api/?name=${chat.groupName}&background=random` : otherParticipant?.avatar} alt="" className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full object-cover ring-2 ring-white/10" />
                        {!chat.isGroup && <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 ${otherParticipant?.status === 'online' ? 'bg-[#10b981]' : 'bg-gray-500'} rounded-full border-2 border-[#13131a]`}></div>}
                    </div>
                    <div className="cursor-pointer min-w-0 flex-1" onClick={() => chat.isGroup && setShowGroupStats(true)}>
                        <h3 className="font-semibold text-white text-sm sm:text-base truncate">{chat.isGroup ? chat.groupName : otherParticipant?.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{chat.isGroup ? `${chat.participants.length} members` : (otherParticipant?.status === 'online' ? 'Active now' : 'Offline')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                        onClick={toggleSearch}
                        className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all ${isSearchOpen ? 'bg-[#06b6d4] text-white' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                    >
                        <Search size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all ${isMenuOpen ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                        >
                            <MoreVertical size={18} className="sm:w-5 sm:h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 top-12 w-64 sm:w-72 bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right max-h-[80vh] overflow-y-auto">
                                <div className="p-1.5 space-y-0.5">
                                    <div className="relative group">
                                        <button
                                            onClick={() => setShowMuteOptions(!showMuteOptions)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors"
                                        >
                                            <BellOff size={16} className="flex-shrink-0" />
                                            <span className="flex-1 truncate">Mute Notifications</span>
                                            <ChevronRight size={14} className={`transition-transform flex-shrink-0 ${showMuteOptions ? 'rotate-90' : ''}`} />
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
                                        <ExternalLink size={16} className="flex-shrink-0" />
                                        <span className="truncate">Open in New Window</span>
                                    </button>

                                    <button onClick={handleMarkUnread} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors">
                                        <MessageSquareX size={16} className="flex-shrink-0" />
                                        <span className="truncate">Mark as Unread</span>
                                    </button>

                                    <button onClick={handleClearChatClick} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors">
                                        <Trash2 size={16} className="flex-shrink-0" />
                                        <span className="truncate">Clear Chat (Local Only)</span>
                                    </button>

                                    <button onClick={() => { setShowGroupStats(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left text-sm text-gray-300 hover:text-white transition-colors">
                                        <Info size={16} className="flex-shrink-0" />
                                        <span className="truncate">View {chat.isGroup ? 'Group' : 'Contact'} Info</span>
                                    </button>
                                </div>

                                <div className="h-px bg-white/10 mx-3 my-1"></div>

                                <div className="p-1.5">
                                    <button onClick={handleReport} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-xl text-left text-sm text-red-500 transition-colors bg-red-500/5 mt-0.5">
                                        <Flag size={16} className="flex-shrink-0" />
                                        <span className="truncate">Report Issue</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            {isSearchOpen && (
                <div className="mt-2 flex items-center gap-1.5 sm:gap-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex-1 relative min-w-0">
                        <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-7 sm:pl-9 pr-2 sm:pr-4 py-1.5 sm:py-2 rounded-lg bg-black/20 border border-white/10 text-white text-xs sm:text-sm outline-none focus:border-[#06b6d4] transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 bg-black/20 rounded-lg border border-white/10 p-0.5 sm:p-1 flex-shrink-0">
                        <span className="text-[10px] sm:text-xs text-gray-400 px-1 sm:px-2 min-w-[2.5rem] sm:min-w-[3rem] text-center font-mono">
                            {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                        </span>
                        <button onClick={handlePrevMatch} className="p-0.5 sm:p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-50" disabled={searchMatches.length === 0}>
                            <ChevronUp size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={handleNextMatch} className="p-0.5 sm:p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-50" disabled={searchMatches.length === 0}>
                            <ChevronDown size={14} className="sm:w-4 sm:h-4" />
                        </button>
                    </div>
                    <button onClick={toggleSearch} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white flex-shrink-0">
                        <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatHeader;
