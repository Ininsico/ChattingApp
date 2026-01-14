const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
        trim: true
    },
    groupAvatar: {
        type: String
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Method to check if user is participant
conversationSchema.methods.isParticipant = function (userId) {
    return this.participants.some(p => p.toString() === userId.toString());
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
