const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password by default
    },
    avatar: {
        type: String,
        default: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&auto=format&fit=crop&q=60'
    },
    banner: {
        type: String,
        default: ''
    },
    avatarVisibility: {
        type: String,
        enum: ['everyone', 'contacts'],
        default: 'everyone'
    },
    bio: {
        type: String,
        default: '',
        maxlength: [200, 'Bio cannot exceed 200 characters']
    },
    status: { // System status (online/offline)
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    availabilityStatus: { // User set status
        type: String,
        enum: ['available', 'busy', 'meeting', 'away', 'dnd'],
        default: 'available'
    },
    customStatus: {
        type: String,
        default: 'Hey there! I am using ChatApp'
    },
    phoneNumber: {
        type: String,
        default: ''
    },
    secondaryEmail: {
        type: String,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid secondary email']
    },
    country: {
        type: String,
        default: ''
    },
    department: { type: String, default: '' },
    role: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    reportingManager: { type: String, default: '' },
    workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' }
    },
    loginMethod: {
        type: String,
        default: 'email'
    },
    tokenVersion: {
        type: Number,
        default: 0
    },
    activeSessions: {
        type: Number,
        default: 0
    },
    loginHistory: [{
        date: { type: Date, default: Date.now },
        ip: String,
        device: String
    }],
    lastSeen: {
        type: Date,
        default: Date.now
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    groups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error(error);
    }
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    user.id = user._id.toString(); // Add string id
    delete user.password;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
