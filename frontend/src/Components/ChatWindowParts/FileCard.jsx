import { Download } from 'lucide-react';
import { uploadAPI } from '../../services/api';

const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const FileCard = ({ msg, currentUser }) => {
    if (!msg.fileUrl) return null;

    const handleDownload = async () => {
        try {
            const blob = await uploadAPI.downloadFile(msg._id);
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
            if (err.response) {
                if (err.response.status === 404) {
                    alert('Video is no longer available for download. It may have been deleted or moved.');
                } else if (err.response.status === 403) {
                    alert('Access denied. You do not have permission to download this video.');
                } else if (err.response.data?.securityBlock) {
                    alert('Security Alert: This file has been blocked for security reasons.');
                } else {
                    alert(`Failed to download: ${err.response.data?.message || 'Unknown error'}`);
                }
            } else {
                alert('Connection error. Please check your internet connection.');
            }
        }
    };

    // Render based on file type
    if (msg.messageType === 'image') {
        return (
            <div className="rounded-lg overflow-hidden ring-1 ring-white/10 bg-black/20">
                <img
                    src={msg.fileUrl}
                    alt={msg.fileName || 'Image'}
                    className="max-w-full h-auto max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity bg-transparent"
                    onClick={() => window.open(msg.fileUrl, '_blank')}
                />
            </div>
        );
    }

    if (msg.messageType === 'video') {
        const isMe = msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;
        const formatDuration = (seconds) => {
            if (!seconds) return '';
            const m = Math.floor(seconds / 60);
            const s = Math.round(seconds % 60);
            return `${m}:${s < 10 ? '0' + s : s}`;
        };

        return (
            <div className={`rounded-xl overflow-hidden border ${isMe
                ? 'bg-white/10 border-white/20'
                : 'bg-black/20 border-white/10'
                } max-w-sm`}>
                <div className="relative bg-black/50">
                    <video
                        src={msg.fileUrl}
                        className="max-w-full h-auto max-h-60 mx-auto"
                        controls
                    />
                </div>
                <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-white text-sm truncate flex-1 mr-2" title={msg.fileName}>
                            {msg.fileName || 'Video'}
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                        <span>{formatFileSize(msg.fileSize)}</span>
                        {msg.duration && (
                            <span>{formatDuration(msg.duration)}</span>
                        )}
                        {!msg.duration && msg.mimeType && (
                            <span>{msg.mimeType.split('/')[1].toUpperCase()}</span>
                        )}
                    </div>
                    <button
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#06b6d4]/20 hover:bg-[#06b6d4]/30 text-[#06b6d4] hover:text-white border border-[#06b6d4]/30 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    >
                        <Download size={14} />
                        Download Video
                    </button>
                </div>
            </div>
        );
    }

    // Document, archive, audio, or generic file card
    const fileIcon = msg.fileIcon || '📎';
    const isMe = msg.sender?._id === currentUser?.id || msg.sender === currentUser?.id;

    return (
        <div className={`rounded-xl p-4 border ${isMe
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

export default FileCard;
