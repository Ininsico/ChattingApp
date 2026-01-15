import React, { useState, useEffect, useRef } from 'react';
import { 
    User, Mail, Phone, MapPin, Briefcase, Hash, Users, Clock, 
    Shield, LogOut, Camera, Image as ImageIcon, Globe, Activity,
    Save, X, Edit2, Loader2, Smartphone, Monitor, Trash2
} from 'lucide-react';
import { userAPI, authAPI, uploadAPI } from '../services/api';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({});

    // File Refs
    const avatarInputRef = useRef(null);
    const bannerInputRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await userAPI.getProfile();
            if (res.success) {
                setUser(res.user);
                setFormData(res.user);
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRemoveMedia = async (type) => {
        if (!window.confirm(`Are you sure you want to remove your ${type}?`)) return;
        
        try {
            setIsSaving(true);
            // Construct update with empty str/default for the specific field
            // Default avatar URL is effectively "removed" or reset.
            // Let's assume sending '' resets it to default in backend OR we set default here.
            // Backend schema default is 'https://images.unsplash.com/...' for avatar.
            // If I send '', backend might save ''.
            // Better key: 'avatar': 'DEFAULT_URL' or just empty string and let frontend handle fallback?
            // Actually, for banner, '' is fine. For avatar, let's use the default URL from schema as fallback constant or just '' if backend handles it?
            // User schema has a default. On update with '', mongoose string type stores ''.
            // So I should set it to the default URL manually if removing avatar.
            
            const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&auto=format&fit=crop&q=60';
            const value = type === 'avatar' ? DEFAULT_AVATAR : '';
            
            const updatedData = { ...formData, [type]: value };
            
            const res = await userAPI.updateProfile(updatedData);
            if (res.success) {
                setUser(res.user);
                setFormData(res.user);
            }
        } catch(err) {
            alert('Failed to remove media');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsSaving(true);
            const res = await uploadAPI.uploadFile(file);
            if (res.success) {
                const updatedData = { ...formData, [type]: res.fileUrl };
                // Immediately save media changes
                const updateRes = await userAPI.updateProfile(updatedData);
                if (updateRes.success) {
                    setUser(updateRes.user);
                    setFormData(updateRes.user);
                }
            }
        } catch (err) {
            console.error(`Failed to upload ${type}:`, err);
            alert(`Failed to upload ${type}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await userAPI.updateProfile(formData);
            if (res.success) {
                setUser(res.user);
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Failed to save profile:', err);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoutAll = async () => {
        if (!window.confirm('Are you sure you want to sign out from ALL devices?')) return;
        try {
            await authAPI.logoutAll();
            window.location.href = '/';
        } catch (err) {
            console.error('Logout all failed:', err);
            alert('Failed to logout from all devices');
        }
    };

    if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-[#06b6d4]" /></div>;

    const InputField = ({ label, name, value, icon: Icon, type = "text", disabled = false, placeholder = "" }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                {Icon && <Icon size={12} />} {label}
            </label>
            <input
                type={type}
                name={name}
                value={value || ''}
                onChange={handleInputChange}
                disabled={disabled || !isEditing}
                placeholder={placeholder}
                className={`w-full bg-[#1a1a24] border ${disabled ? 'border-transparent opacity-60 cursor-not-allowed' : 'border-white/10 hover:border-white/20 focus:border-[#06b6d4]'} rounded-xl px-4 py-2.5 text-white outline-none transition-all duration-200`}
            />
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#13131a] overflow-hidden">
            {/* Header / Media Section */}
            <div className="relative h-48 md:h-64 flex-shrink-0 group">
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-[#13131a]" />
                {user.banner ? (
                    <img src={user.banner} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-[#06b6d4]/20 to-[#8b5cf6]/20" />
                )}
                
                {/* Banner Actions */}
                <input type="file" ref={bannerInputRef} onChange={(e) => handleFileUpload(e, 'banner')} className="hidden" accept="image/*" />
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {user.banner && (
                        <button 
                            onClick={() => handleRemoveMedia('banner')}
                            className="bg-black/50 hover:bg-black/70 hover:text-red-400 text-white p-2 rounded-xl backdrop-blur-sm transition-colors"
                            title="Remove Banner"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button 
                        onClick={() => bannerInputRef.current?.click()}
                        className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-xl backdrop-blur-sm transition-colors"
                        title="Change Banner"
                    >
                        <ImageIcon size={20} />
                    </button>
                </div>

                {/* Avatar */}
                <div className="absolute -bottom-16 left-6 md:left-10 flex items-end">
                    <div className="relative group/avatar">
                        <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-32 h-32 rounded-3xl object-cover border-4 border-[#13131a] shadow-2xl bg-[#1a1a24]" 
                        />
                        <input type="file" ref={avatarInputRef} onChange={(e) => handleFileUpload(e, 'avatar')} className="hidden" accept="image/*" />
                        
                        {/* Avatar Overlay */}
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-3xl opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-[2px] gap-2">
                             <button 
                                onClick={() => avatarInputRef.current?.click()}
                                className="text-white hover:text-[#06b6d4] transition-colors p-2"
                                title="Change Avatar"
                            >
                                <Camera size={24} />
                            </button>
                            {/* Only show remove if it's not the default avatar loosely checked or just allow reset */}
                             <button 
                                onClick={() => handleRemoveMedia('avatar')}
                                className="text-white hover:text-red-400 transition-colors p-2"
                                title="Remove Avatar"
                            >
                                <Trash2 size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Edit Toggle */}
                <div className="absolute bottom-4 right-6 flex gap-3">
                    {isEditing ? (
                        <>
                            <button onClick={() => { setIsEditing(false); setFormData(user); }} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-md transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold shadow-lg shadow-[#06b6d4]/20 transition-all flex items-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-md border border-white/10 flex items-center gap-2 transition-colors">
                            <Edit2 size={18} /> Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Info */}
            <div className="flex-1 overflow-y-auto pt-20 px-6 pb-12 scrollbar-thin scrollbar-thumb-white/10">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* Identity & Bio */}
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
                        <p className="text-gray-400 max-w-2xl">{user.bio || "No bio added yet."}</p>
                        {isEditing && (
                            <div className="mt-4 max-w-xl">
                                <InputField label="Display Name" name="name" value={formData.name} Icon={User} />
                                <div className="mt-4 space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bio</label>
                                    <textarea 
                                        name="bio"
                                        value={formData.bio || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#06b6d4]"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {isEditing && (
                             <div className="mt-4 max-w-xs">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Avatar Visibility</label>
                                <select 
                                    name="avatarVisibility" 
                                    value={formData.avatarVisibility} 
                                    onChange={handleInputChange}
                                    className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none"
                                >
                                    <option value="everyone">Everyone</option>
                                    <option value="contacts">Contacts Only</option>
                                </select>
                             </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Primary Contact Details */}
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#06b6d4]/20 text-[#06b6d4] flex items-center justify-center"><Mail size={18} /></span>
                                Contact Details
                            </h2>
                            <div className="space-y-5">
                                <InputField label="Primary Email" value={formData.email} Icon={Mail} disabled={true} />
                                <InputField label="Secondary Email" name="secondaryEmail" value={formData.secondaryEmail} Icon={Mail} placeholder="backup@example.com" />
                                <InputField label="Phone Number" name="phoneNumber" value={formData.phoneNumber} Icon={Phone} />
                                <InputField label="Country / Region" name="country" value={formData.country} Icon={Globe} />
                            </div>
                        </div>

                        {/* Professional Information */}
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#8b5cf6]/20 text-[#8b5cf6] flex items-center justify-center"><Briefcase size={18} /></span>
                                Professional Info
                            </h2>
                            <div className="space-y-5">
                                <InputField label="Department" name="department" value={formData.department} Icon={Users} />
                                <InputField label="Role / Designation" name="role" value={formData.role} Icon={Briefcase} />
                                <InputField label="Employee ID" name="employeeId" value={formData.employeeId} Icon={Hash} disabled={true} placeholder="N/A" />
                                <InputField label="Reporting Manager" name="reportingManager" value={formData.reportingManager} Icon={User} />
                            </div>
                        </div>

                        {/* Availability & Status */}
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#10b981]/20 text-[#10b981] flex items-center justify-center"><Activity size={18} /></span>
                                Availability
                            </h2>
                            <div className="space-y-5">
                                {isEditing ? (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                                        <select 
                                            name="availabilityStatus" 
                                            value={formData.availabilityStatus} 
                                            onChange={handleInputChange}
                                            className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#06b6d4]"
                                        >
                                            <option value="available">Available</option>
                                            <option value="busy">Busy</option>
                                            <option value="meeting">In a Meeting</option>
                                            <option value="away">Away</option>
                                            <option value="dnd">Do Not Disturb</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-[#1a1a24] rounded-xl border border-white/10">
                                        <div className={`w-3 h-3 rounded-full ${
                                            formData.availabilityStatus === 'available' ? 'bg-green-500' :
                                            formData.availabilityStatus === 'busy' || formData.availabilityStatus === 'dnd' ? 'bg-red-500' :
                                            formData.availabilityStatus === 'away' ? 'bg-yellow-500' : 'bg-blue-500'
                                        }`} />
                                        <span className="capitalize font-medium text-white">{formData.availabilityStatus || 'Available'}</span>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Custom Status</label>
                                    <input
                                        type="text"
                                        name="customStatus"
                                        value={formData.customStatus || ''}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#06b6d4]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Work Start" name="workingHours.start" value={formData.workingHours?.start} Icon={Clock} type="time" />
                                    <InputField label="Work End" name="workingHours.end" value={formData.workingHours?.end} Icon={Clock} type="time" />
                                </div>
                            </div>
                        </div>

                        {/* Security & Trust */}
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#ef4444]/20 text-[#ef4444] flex items-center justify-center"><Shield size={18} /></span>
                                Security & Trust
                            </h2>
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[#1a1a24] rounded-xl border border-white/10">
                                        <div className="text-xs text-gray-500 mb-1">Account Status</div>
                                        <div className="font-bold text-[#10b981] flex items-center gap-2"><div className="w-2 h-2 bg-[#10b981] rounded-full"></div> Active</div>
                                    </div>
                                    <div className="p-4 bg-[#1a1a24] rounded-xl border border-white/10">
                                        <div className="text-xs text-gray-500 mb-1">Login Method</div>
                                        <div className="font-bold text-white capitalize">{formData.loginMethod || 'Email'}</div>
                                    </div>
                                </div>

                                <div className="p-4 bg-[#1a1a24] rounded-xl border border-white/10 space-y-3">
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                        <span>Last Login</span>
                                        <span className="text-[#06b6d4]">{formData.activeSessions || 1} Active Sessions</span>
                                    </div>
                                    {formData.loginHistory && formData.loginHistory.length > 0 ? (
                                        <div className="space-y-2">
                                            {formData.loginHistory.slice(-1).map((login, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 text-white">
                                                        <Monitor size={14} className="text-gray-500" /> 
                                                        {login.device || 'Unknown Device'}
                                                    </div>
                                                    <div className="text-gray-500">{new Date(login.date).toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">No history available</div>
                                    )}
                                </div>

                                <button 
                                    onClick={handleLogoutAll}
                                    className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold border border-red-500/20 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <LogOut size={18} /> Sign out from all devices
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-8"></div> {/* Spacer */}
                </div>
            </div>
        </div>
    );
};

export default Profile;
