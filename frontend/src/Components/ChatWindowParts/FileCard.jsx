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
