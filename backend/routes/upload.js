const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Allowed file types with their categories
const ALLOWED_MIMETYPES = {
    // Images
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'image/svg+xml': 'image',

    // Videos
    'video/mp4': 'video',
    'video/mpeg': 'video',
    'video/webm': 'video',
    'video/quicktime': 'video',

    // Documents
    'application/pdf': 'document',
    'application/msword': 'document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'application/vnd.ms-excel': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
    'application/vnd.ms-powerpoint': 'document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
    'text/plain': 'document',
    'text/csv': 'document',

    // Archives
    'application/zip': 'archive',
    'application/x-zip-compressed': 'archive',
    'application/x-rar-compressed': 'archive',
    'application/x-7z-compressed': 'archive',

    // Audio
    'audio/mpeg': 'audio',
    'audio/wav': 'audio',
    'audio/ogg': 'audio',
};

// File extension mapping
const FILE_ICONS = {
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'xls': '📊',
    'xlsx': '📊',
    'ppt': '📊',
    'pptx': '📊',
    'txt': '📃',
    'csv': '📋',
    'zip': '🗜️',
    'rar': '🗜️',
    '7z': '🗜️',
};

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).substring(0, 50); // Limit filename length
        cb(null, `${uniqueSuffix}-${name}${ext}`);
    }
});

// Enhanced file filter
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES[file.mimetype]) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Supported types: images, videos, documents, and archives.`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit (configurable)
    }
});

// Simulated virus scanning function
// In production, integrate with ClamAV, VirusTotal API, or similar
const scanFileForVirus = async (filePath, filename) => {
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulated detection: reject files with suspicious patterns in name
    const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js.exe'];
    const isSuspicious = suspiciousPatterns.some(pattern => filename.toLowerCase().includes(pattern));

    if (isSuspicious) {
        // Log security event
        console.error(`[SECURITY] Blocked suspicious file: ${filename} from upload`);
        return {
            safe: false,
            reason: 'File detected as potentially malicious'
        };
    }

    // In production, use real AV scanning:
    // const ClamScan = require('clamscan');
    // const clamscan = await new ClamScan().init();
    // const { isInfected, viruses } = await clamscan.scanFile(filePath);
    // return { safe: !isInfected, reason: viruses ? viruses.join(', ') : null };

    return { safe: true, reason: null };
};

// Helper to determine file category
const getFileCategory = (mimetype) => {
    return ALLOWED_MIMETYPES[mimetype] || 'file';
};

// Helper to get file icon
const getFileIcon = (filename) => {
    const ext = path.extname(filename).toLowerCase().substring(1);
    return FILE_ICONS[ext] || '📎';
};

// @desc    Upload file with virus scanning
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.single('file'), async (req, res) => {
    let filePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        filePath = req.file.path;
        const filename = req.file.originalname;

        // Perform virus scan
        const scanResult = await scanFileForVirus(filePath, filename);

        if (!scanResult.safe) {
            // Delete the infected file immediately
            try {
                await fs.unlink(filePath);
            } catch (unlinkErr) {
                console.error('Failed to delete infected file:', unlinkErr);
            }

            // Log security event (in production, save to database for audit)
            console.error(`[SECURITY ALERT] Blocked file upload: ${filename} - Reason: ${scanResult.reason} - User: ${req.user.id}`);

            return res.status(403).json({
                success: false,
                message: 'File rejected for security reasons',
                reason: scanResult.reason,
                securityBlock: true
            });
        }

        // File is safe, construct response
        // Encode filename to ensure valid URL
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(req.file.filename)}`;
        const fileCategory = getFileCategory(req.file.mimetype);
        const fileIcon = getFileIcon(filename);

        res.json({
            success: true,
            fileUrl,
            fileType: fileCategory,
            filename: filename,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            icon: fileIcon,
            uploadedBy: req.user.id,
            uploadedAt: new Date()
        });

    } catch (error) {
        // Clean up file on error
        if (filePath) {
            try {
                await fs.unlink(filePath);
            } catch (unlinkErr) {
                console.error('Failed to delete file after error:', unlinkErr);
            }
        }

        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Download file (with permission check)
// @route   GET /api/upload/download/:messageId
// @access  Private
router.get('/download/:messageId', protect, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        // Check if user is participant in the conversation
        const conversation = await Conversation.findById(message.conversationId);

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some(
            p => p.toString() === req.user.id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Access denied. You are not a participant in this conversation.' });
        }

        // Extract filename from fileUrl
        if (!message.fileUrl) {
            return res.status(400).json({ success: false, message: 'No file attached to this message' });
        }

        // Robust filename extraction handling both encoded and unencoded URLs
        // We use split/pop to avoid 'Invalid URL' errors if the DB contains unencoded spaces
        let filename;
        try {
            // Try standard URL parsing first (handles encoded URLs correctly)
            const urlObj = new URL(message.fileUrl);
            filename = path.posix.basename(urlObj.pathname);
        } catch (e) {
            // Fallback for unencoded URLs or other format issues: just take the last part
            const parts = message.fileUrl.split('/');
            filename = parts[parts.length - 1];
        }

        // Always decode to get the actual file system name
        filename = decodeURIComponent(filename);

        const filePath = path.join(__dirname, '..', 'uploads', filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (err) {
            console.error(`File not found at path: ${filePath}`);
            return res.status(404).json({ success: false, message: 'File not found on server' });
        }

        // Send file
        res.download(filePath, message.fileName || filename);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
