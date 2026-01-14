import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Bell, Shield, Moon, Sun, LogOut, Camera, Edit2, Check, UserCheck, UserX, Loader2, Info, Smartphone, Sparkles } from 'lucide-react';
import { authAPI, friendsAPI, userAPI, getCurrentUser, uploadAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socket';

const Profile = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [user, setUser] = useState(getCurrentUser());
    const [friendRequests, setFriendRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
        bio: user?.bio || '',
        customStatus: user?.customStatus || 'Hey there! I am using ChatApp',
        phoneNumber: user?.phoneNumber || '',
        avatar: user?.avatar || ''
    });

    const fetchFriendRequests = async () => {
        try {
            const res = await friendsAPI.getRequests();
            if (res.success) setFriendRequests(res.requests);
        } catch (err) {
            console.error('Failed to fetch requests:', err);
        }
    };

    useEffect(() => {
        fetchFriendRequests();

        socketService.socket?.on('new-friend-request', (request) => {
            setFriendRequests(prev => [request, ...prev]);
        });

        return () => {
            socketService.socket?.off('new-friend-request');
        };
    }, []);

    const handleSave = async (updatedAvatar = null) => {
        setIsLoading(true);
        try {
            const dataToUpdate = {
                name: profile.name,
                bio: profile.bio,
                phoneNumber: profile.phoneNumber,
                customStatus: profile.customStatus,
                avatar: updatedAvatar || profile.avatar
            };
            const res = await userAPI.updateProfile(dataToUpdate);
            if (res.success) {
                setUser(res.user);
                localStorage.setItem('user', JSON.stringify(res.user));
                setIsEditing(false);
                setProfile(prev => ({ ...prev, avatar: res.user.avatar }));
            }
        } catch (err) {
            console.error('Update failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const res = await uploadAPI.uploadFile(file);
            if (res.success) {
                setProfile(prev => ({ ...prev, avatar: res.fileUrl }));
                // Automatically save the new avatar
                handleSave(res.fileUrl);
            }
        } catch (err) {
            alert('Avatar upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAuthAction = async (requestId, action) => {
        try {
            const res = await friendsAPI.handleRequest(requestId, action);
            if (res.success) {
                if (action === 'accept') {
                    socketService.socket.emit('friend-request-accepted', {
                        targetUserId: friendRequests.find(r => r._id === requestId).from._id,
                        conversation: res.conversation
                    });
                }
                setFriendRequests(prev => prev.filter(r => r._id !== requestId));
            }
        } catch (err) {
            console.error('Action failed:', err);
        }
    };

    const handleSignOut = async () => {
        await authAPI.logout();
        socketService.disconnect();
        navigate('/');
    };

    return (
        <div className="h-full w-full bg-[#13131a] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            <div className="max-w-4xl mx-auto p-4 md:p-8">
                <h1 className="text-3xl font-bold text-white mb-8">Account Profile</h1>

                {/* Profile Card */}
                <div className="bg-white/5 rounded-[2rem] p-8 mb-8 border border-white/10 shadow-2xl backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row items-center gap-10">
                        <div
                            onClick={handleAvatarClick}
                            className="w-40 h-40 rounded-[2.5rem] overflow-hidden ring-4 ring-[#06b6d4]/50 shadow-2xl relative group cursor-pointer"
                        >
                            <img src={profile.avatar || user?.avatar} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                {isUploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white mb-2" />}
                                <span className="text-[10px] text-white font-bold uppercase tracking-widest">Change Photo</span>
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div className="space-y-1">
                                {isEditing ? (
                                    <input
                                        value={profile.name}
                                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                                        placeholder="Full Name"
                                        className="text-3xl font-bold bg-white/10 rounded-2xl px-5 py-3 text-white outline-none border border-white/5 focus:border-[#06b6d4] transition-all w-full max-w-sm"
                                    />
                                ) : (
                                    <h2 className="text-4xl font-black text-white tracking-tight">{user?.name}</h2>
                                )}
                                <p className="text-[#06b6d4] font-medium tracking-wide opacity-80">{user?.email}</p>
                            </div>

                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                <div className={`w-2.5 h-2.5 rounded-full ${user?.status === 'online' ? 'bg-[#10b981]' : 'bg-gray-500'} animate-pulse`}></div>
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{user?.status || 'Offline'}</span>
                            </div>
                        </div>

                        <button
                            onClick={isEditing ? () => handleSave() : () => setIsEditing(true)}
                            className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all transform active:scale-95 ${isEditing
                                ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-lg shadow-[#10b981]/20'
                                : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
                                }`}
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? <Check size={20} /> : <Edit2 size={20} />)}
                            {isEditing ? 'Save Changes' : 'Edit Profile'}
                        </button>
                    </div>
                </div>

                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                    <div className="bg-white/5 rounded-[2rem] border border-[#06b6d4]/20 mb-8 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-6 bg-[#06b6d4]/10 border-b border-[#06b6d4]/10 flex justify-between items-center text-white">
                            <h3 className="text-xl font-bold flex items-center gap-3"><Bell className="text-[#06b6d4]" /> Pending Connections</h3>
                            <span className="bg-[#06b6d4] px-4 py-1 rounded-full text-sm font-black">{friendRequests.length}</span>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {friendRequests.map(req => (
                                <div key={req._id} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <img src={req.from?.avatar} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{req.from?.name}</h4>
                                            <p className="text-[10px] text-gray-400 font-medium">{req.from?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAuthAction(req._id, 'accept')} className="p-2.5 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981] hover:text-white rounded-xl transition-all"><UserCheck size={18} /></button>
                                        <button onClick={() => handleAuthAction(req._id, 'reject')} className="p-2.5 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444] hover:text-white rounded-xl transition-all"><UserX size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Bio Section */}
                    <div className="bg-white/5 rounded-[2rem] p-8 border border-white/10">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Info size={14} className="text-[#06b6d4]" /> About Me
                        </label>
                        <textarea
                            value={profile.bio}
                            readOnly={!isEditing}
                            onChange={e => setProfile({ ...profile, bio: e.target.value })}
                            placeholder="Tell us about yourself..."
                            className="w-full p-5 bg-white/5 rounded-[1.5rem] text-white outline-none border border-white/5 focus:border-[#06b6d4] h-40 resize-none transition-all placeholder-gray-600 font-medium"
                        />
                    </div>

                    {/* Status & Phone Section */}
                    <div className="bg-white/5 rounded-[2rem] p-8 border border-white/10 space-y-8">
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Sparkles size={14} className="text-[#06b6d4]" /> Current Status
                            </label>
                            <input
                                value={profile.customStatus}
                                readOnly={!isEditing}
                                onChange={e => setProfile({ ...profile, customStatus: e.target.value })}
                                placeholder="What's on your mind?"
                                className="w-full p-4 bg-white/5 rounded-[1.2rem] text-white outline-none border border-white/5 focus:border-[#06b6d4] transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Smartphone size={14} className="text-[#06b6d4]" /> Phone Number
                            </label>
                            <div className="relative">
                                <input
                                    value={profile.phoneNumber}
                                    readOnly={!isEditing}
                                    onChange={e => setProfile({ ...profile, phoneNumber: e.target.value })}
                                    placeholder="+1 234 567 890"
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 rounded-[1.2rem] text-white outline-none border border-white/5 focus:border-[#06b6d4] transition-all font-medium"
                                />
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full p-6 rounded-[2rem] bg-[#ef4444]/5 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444] hover:text-white transition-all font-black uppercase tracking-widest text-sm flex items-center justify-center gap-4 shadow-xl active:scale-95"
                >
                    <LogOut size={20} /> Deactivate Session
                </button>
            </div>
        </div>
    );
};

export default Profile;
