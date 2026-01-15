import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { conversationsAPI } from '../../services/api';
import socketService from '../../services/socket';

const ForwardModal = ({ isOpen, message, currentChatId, currentUserId, onClose }) => {
    const [forwardConversations, setForwardConversations] = useState([]);
    const [isLoadingConvs, setIsLoadingConvs] = useState(true);
    const [selectedConvId, setSelectedConvId] = useState(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchConversations = async () => {
            try {
                const response = await conversationsAPI.getConversations();
                // Handle both array and object responses
                const convs = Array.isArray(response) ? response : (response.conversations || []);
                setForwardConversations(convs);
                setIsLoadingConvs(false);
            } catch (err) {
                console.error('Failed to load conversations:', err);
                setForwardConversations([]);
                setIsLoadingConvs(false);
            }
        };
        fetchConversations();
    }, [isOpen, currentChatId]);

    const handleForward = async () => {
        if (!selectedConvId) {
            alert('Please select a conversation');
            return;
        }
        try {
            socketService.sendMessage({
                conversationId: selectedConvId,
                content: message.content || 'Forwarded message',
                messageType: message.messageType || 'text',
                fileUrl: message.fileUrl,
                fileName: message.fileName,
                fileSize: message.fileSize
            });

            onClose();
            setSelectedConvId(null);

            // Show success toast
            const el = document.createElement('div');
            el.innerText = '✓ Message forwarded';
            el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:12px 24px;border-radius:12px;z-index:10000;font-weight:bold';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2000);
        } catch (err) {
            console.error('Forward failed:', err);
            alert('Failed to forward message');
        }
    };

    if (!isOpen || !message) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md bg-[#13131a] rounded-3xl border border-white/10 p-6 shadow-2xl relative animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
                <h3 className="text-2xl font-bold text-white mb-2">Forward Message</h3>
                <p className="text-gray-400 text-sm mb-4">Select a conversation</p>

                <div className="bg-white/5 rounded-xl p-3 mb-4 border border-white/10">
                    <p className="text-xs text-gray-500 mb-1">Message:</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{message.content || 'File attachment'}</p>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 mb-4">
                    {isLoadingConvs ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : forwardConversations.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No other conversations</div>
                    ) : (
                        forwardConversations.map(conv => {
                            const otherUser = conv.participants?.find(p => p._id !== currentUserId);
                            const displayName = conv.isGroup ? conv.groupName : otherUser?.name;
                            const isSelected = selectedConvId === conv._id;

                            return (
                                <button
                                    key={conv._id}
                                    onClick={() => setSelectedConvId(conv._id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected ? 'bg-[#06b6d4] text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                                >
                                    <img
                                        src={conv.isGroup ? conv.groupAvatar : otherUser?.avatar}
                                        className="w-10 h-10 rounded-full object-cover"
                                        alt=""
                                    />
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold text-sm">{displayName}</p>
                                        {conv.isGroup && <p className="text-xs opacity-75">{conv.participants?.length} members</p>}
                                    </div>
                                    {isSelected && <Check size={18} />}
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleForward}
                        disabled={!selectedConvId}
                        className="flex-1 py-3 bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Forward
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
