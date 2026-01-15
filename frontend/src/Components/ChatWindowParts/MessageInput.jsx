import { useState, useRef, useEffect } from 'react';
import { Reply, X, Loader2, Paperclip, FileText, Image, Image as ImageIcon, Smile, Send } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import '../../styles/emoji-picker.css';
import { uploadAPI } from '../../services/api';

const MessageInput = ({ chat, onSendMessage, onTyping, replyingTo, onCancelReply }) => {
    const [message, setMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showUploadMenu, setShowUploadMenu] = useState(false);

    const [previewFile, setPreviewFile] = useState(null); // { file, type, previewUrl }
    const [caption, setCaption] = useState('');

    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Click outside handler for emoji picker and upload menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !event.target.closest('.emoji-toggle-btn')) {
                setShowEmojiPicker(false);
            }
            if (!event.target.closest('.upload-menu-container')) {
                setShowUploadMenu(false);
            }
        };

        if (showEmojiPicker || showUploadMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker, showUploadMenu]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setMessage(val);
        if (chat?._id) {
            if (val.length > 0) {
                onTyping(true);
            } else {
                onTyping(false);
            }
        }
    };

    const handleSendClick = (fileData = null, captionText = null) => {
        const textToSend = captionText !== null ? captionText : message;
        if (!textToSend.trim() && !fileData) return;

        onSendMessage(textToSend, fileData);
        setMessage('');
        setCaption('');
        setPreviewFile(null);
        onTyping(false);
        setShowEmojiPicker(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    const handleFileSelect = async (file, type) => {
        if (!file) return;

        let previewUrl = null;
        let fileType = type;

        // Auto-detect type if generic 'file' or 'media'
        if (type === 'media') {
             if (file.type.startsWith('image/')) fileType = 'image';
             else if (file.type.startsWith('video/')) fileType = 'video';
        } else if (type === 'document') {
             // Keep as document
        } else if (file.type.startsWith('image/')) {
             fileType = 'image';
        } else if (file.type.startsWith('video/')) {
             fileType = 'video';
        }

        if (fileType === 'image' || fileType === 'video') {
            previewUrl = URL.createObjectURL(file);
        }

        setPreviewFile({ file, type: fileType, previewUrl });
    };

    const uploadAndSend = async (file, type, captionText = null) => {
        console.log('File selected:', file.name, 'Type:', type);
        setIsUploading(true);

        try {
            // Upload file to server
            const response = await uploadAPI.uploadFile(file);
            console.log('Upload response:', response);

            // Determine file type and icon
            let fileType = 'file';
            let icon = 'file';
            let duration = null;

            if (file.type.startsWith('image/')) {
                fileType = 'image';
                icon = 'image';
            } else if (file.type.startsWith('video/')) {
                fileType = 'video';
                icon = 'video';
                // Extract video duration
                try {
                    const videoEl = document.createElement('video');
                    videoEl.preload = 'metadata';
                    videoEl.src = URL.createObjectURL(file);
                    await new Promise((resolve) => {
                        videoEl.onloadedmetadata = () => {
                            duration = Math.round(videoEl.duration);
                            URL.revokeObjectURL(videoEl.src);
                            resolve();
                        };
                        videoEl.onerror = () => resolve();
                    });
                } catch (e) {
                    console.error('Failed to extract video duration', e);
                }
            } else if (file.type.includes('pdf')) {
                fileType = 'document';
                icon = 'pdf';
            } else if (file.type.includes('word') || file.type.includes('document')) {
                fileType = 'document';
                icon = 'doc';
            } else if (file.type.includes('sheet') || file.type.includes('excel')) {
                fileType = 'document';
                icon = 'xls';
            } else {
                 fileType = 'document';
                 icon = 'file'; // generic
            }

            // Send message with file
            handleSendClick({
                fileUrl: response.url || response.fileUrl,
                filename: file.name,
                fileSize: file.size,
                mimeType: file.type,
                fileType,
                duration,
                icon: response.icon || icon
            }, captionText);

        } catch (error) {
            console.error('Upload failed:', error);

            // Check for security block
            if (error.response?.data?.securityBlock) {
                alert(`🔒 Security Alert\n\n${error.response.data.message}\n\nReason: ${error.response.data.reason || 'Unknown'}\n\nYour file has been blocked and removed for security reasons. Please ensure you are only sharing safe files.`);
            } else {
                alert(`Failed to upload file: ${error.response?.data?.message || error.message || 'Unknown error'}`);
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            // Clean up preview if exists
            if (previewFile?.previewUrl) {
                URL.revokeObjectURL(previewFile.previewUrl);
                setPreviewFile(null);
            }
        }
    };

    // Generic file change handler for the hidden input
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Use generic 'file' type, or try to detect
        let type = 'file';
        if (file.type.includes('image')) type = 'image';
        else if (file.type.includes('video')) type = 'media';
        else type = 'document';

        handleFileSelect(file, type);
    };

    // Render Image Preview Modal
    if (previewFile) {
        let previewContent;
        if (previewFile.type === 'image') {
            previewContent = (
                <img 
                    src={previewFile.previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
            );
        } else if (previewFile.type === 'video') {
             previewContent = (
                <video 
                    src={previewFile.previewUrl} 
                    controls
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
            );
        } else {
            // Document / Generic
            previewContent = (
                <div className="bg-[#1a1a24] p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-4 shadow-2xl max-w-sm text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-xl flex items-center justify-center">
                         <FileText size={40} className="text-[#06b6d4]" />
                    </div>
                    <div>
                        <p className="text-white font-semibold text-lg break-all">{previewFile.file.name}</p>
                        <p className="text-gray-400 text-sm mt-1">{(previewFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                    <button 
                        onClick={() => {
                            setPreviewFile(null);
                            setCaption('');
                        }}
                        className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <span className="text-white font-medium">Send {previewFile.type === 'image' ? 'Image' : previewFile.type === 'video' ? 'Video' : 'File'}</span>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* File Preview */}
                <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                    {previewContent}
                </div>

                {/* Caption Input */}
                <div className="p-4 bg-[#1a1a24] border-t border-white/10">
                    <div className="max-w-3xl mx-auto flex gap-2 sm:gap-4 items-end">
                         <div className="flex-1 relative">
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Add a caption..."
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-[#06b6d4] focus:bg-white/15 text-white placeholder-gray-500 transition-all font-medium text-sm sm:text-base resize-none min-h-[50px] max-h-[150px]"
                                rows={1}
                                autoFocus
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if(!isUploading) uploadAndSend(previewFile.file, previewFile.type, caption);
                                    }
                                }}
                            />
                        </div>
                        <button 
                            onClick={() => uploadAndSend(previewFile.file, previewFile.type, caption)}
                            disabled={isUploading}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white shadow-xl shadow-[#06b6d4]/30 hover:scale-105 transition-all transform active:scale-95 flex-shrink-0 mb-1"
                        >
                             {isUploading ? <Loader2 className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
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
                    <button onClick={onCancelReply} className="p-1 hover:bg-white/10 rounded-full">
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>
            )}
            <div className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 max-w-5xl mx-auto">
                    <div className="flex items-center gap-1 relative upload-menu-container">
                        <button
                            onClick={() => setShowUploadMenu(!showUploadMenu)}
                            disabled={isUploading}
                            className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl hover:bg-white/10 text-gray-400 hover:text-[#06b6d4] transition-all flex-shrink-0"
                        >
                            {isUploading ? <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" /> : <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>

                        {/* Upload Menu Dropdown */}
                        {showUploadMenu && (
                            <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a24] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 min-w-[180px] sm:min-w-[200px] z-50">
                                <button
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
                                        input.onchange = (e) => handleFileSelect(e.target.files[0], 'document');
                                        input.click();
                                        setShowUploadMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-white hover:bg-white/10 transition-colors"
                                >
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FileText size={16} className="sm:w-5 sm:h-5 text-purple-400" />
                                    </div>
                                    <span className="font-medium text-sm sm:text-base">Document</span>
                                </button>

                                <button
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*,video/*';
                                        input.onchange = (e) => handleFileSelect(e.target.files[0], 'media');
                                        input.click();
                                        setShowUploadMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-white hover:bg-white/10 transition-colors"
                                >
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Image size={16} className="sm:w-5 sm:h-5 text-blue-400" />
                                    </div>
                                    <span className="font-medium text-sm sm:text-base">Videos</span>
                                </button>

                                <button
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e) => handleFileSelect(e.target.files[0], 'image');
                                        input.click();
                                        setShowUploadMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-white hover:bg-white/10 transition-colors"
                                >
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                        <ImageIcon size={16} className="sm:w-5 sm:h-5 text-pink-400" />
                                    </div>
                                    <span className="font-medium text-sm sm:text-base">Images</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={message}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                            placeholder="Type a message..."
                            className="w-full px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 lg:py-4 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-[#06b6d4] focus:bg-white/15 text-white placeholder-gray-500 transition-all font-medium text-sm sm:text-base"
                        />
                        <div className="absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmojiPicker(!showEmojiPicker);
                                }}
                                className={`emoji-toggle-btn transition-colors p-1 ${showEmojiPicker ? 'text-[#06b6d4]' : 'text-gray-500 hover:text-[#06b6d4]'}`}
                            >
                                <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        {showEmojiPicker && (
                            <>
                                {/* Subtle backdrop for mobile */}
                                <div
                                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] md:hidden"
                                    onClick={() => setShowEmojiPicker(false)}
                                />

                                <div
                                    ref={emojiPickerRef}
                                    className="fixed md:absolute bottom-16 sm:bottom-20 md:bottom-full left-1/2 md:left-auto md:right-0 -translate-x-1/2 md:translate-x-0 md:mb-4 z-[9999] animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-2 duration-300 max-w-[95vw] md:max-w-none"
                                >
                                    <div className="relative backdrop-blur-2xl bg-[#1a1a24]/98 border border-white/20 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                                        {/* Custom Header with Close Button */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#06b6d4]/10 to-[#0891b2]/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] flex items-center justify-center shadow-lg shadow-[#06b6d4]/30">
                                                    <Smile size={18} className="text-white" />
                                                </div>
                                                <h3 className="text-white font-bold text-sm">Pick an Emoji</h3>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowEmojiPicker(false);
                                                }}
                                                className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all group active:scale-95"
                                            >
                                                <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                                            </button>
                                        </div>

                                        {/* Emoji Picker with Custom Styling */}
                                        <div className="emoji-picker-custom-wrapper">
                                            <EmojiPicker
                                                theme={Theme.DARK}
                                                onEmojiClick={(emojiData) => {
                                                    setMessage(prev => prev + emojiData.emoji);
                                                }}
                                                autoFocusSearch={false}
                                                searchPlaceholder="Search emojis..."
                                                width={typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(window.innerWidth - 20, 350) : 380}
                                                height={typeof window !== 'undefined' && window.innerWidth < 640 ? 380 : 420}
                                                previewConfig={{
                                                    showPreview: false
                                                }}
                                                skinTonesDisabled={false}
                                                searchDisabled={false}
                                                emojiStyle="native"
                                                lazyLoadEmojis={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button onClick={() => handleSendClick()} className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white shadow-xl shadow-[#06b6d4]/30 hover:scale-105 transition-all transform active:scale-95 flex-shrink-0">
                        <Send className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,audio/*"
                className="hidden"
            />
        </div>
    );
};

export default MessageInput;
