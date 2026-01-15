import { ArrowLeft, UserPlus, Image, UserMinus, Trash2 } from 'lucide-react';
import { conversationsAPI, userAPI } from '../../services/api';
import socketService from '../../services/socket';

const GroupInfo = ({ chat, currentUser, onClose, onUpdateChat, onBack }) => {
    const currentUserId = currentUser?.id || currentUser?._id;
    const isAdmin = chat?.isGroup && (chat?.groupAdmin === currentUserId || chat?.groupAdmin?._id === currentUserId);
    const otherParticipant = !chat.isGroup ? chat.participants.find(p => (p._id || p.id) !== currentUserId) : null;

    const handleAddMember = async () => {
        const email = prompt('Enter user email to add:');
        if (!email) return;
        try {
            const resSearch = await userAPI.searchUsers(email);
            const userToAdd = resSearch.users?.find(u => u.email === email);
            if (!userToAdd) return alert('User not found');

            const res = await conversationsAPI.addMember(chat._id, userToAdd._id || userToAdd.id);
            if (res.success) {
                alert('Member added');
                socketService.socket.emit('add-member', { userId: userToAdd._id || userToAdd.id, conversation: res.conversation });
                onUpdateChat(res.conversation);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            const res = await conversationsAPI.removeMember(chat._id, userId);
            if (res.success) {
                alert('Member removed');
                socketService.socket.emit('group-update', { conversationId: chat._id, conversation: res.conversation });
                onUpdateChat(res.conversation);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm('CRITICAL: Are you sure you want to delete this entire group? This action cannot be undone.')) return;
        try {
            const res = await conversationsAPI.deleteGroup(chat._id);
            if (res.success) {
                socketService.socket.emit('delete-group', { conversationId: chat._id });
                onUpdateChat({ _id: chat._id, isDeleted: true });
                onBack();
            }
        } catch (err) {
            alert('Failed to delete group');
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><ArrowLeft /></button>
                    <h2 className="text-xl font-bold">{chat.isGroup ? 'Group Info' : 'Contact Info'}</h2>
                </div>
                {isAdmin && (
                    <button onClick={handleAddMember} className="flex items-center gap-2 px-4 py-2 bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-xl font-semibold shadow-lg shadow-[#06b6d4]/20 transition-all active:scale-95">
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">Add Member</span>
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
                <div className="text-center mb-12">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#06b6d4] to-[#8b5cf6] flex items-center justify-center text-4xl font-bold text-white shadow-2xl relative group">
                        {chat.isGroup ? chat.groupName?.charAt(0) : otherParticipant?.name?.charAt(0)}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center cursor-pointer">
                            <Image size={24} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold mb-2 text-white">{chat.isGroup ? chat.groupName : otherParticipant?.name}</h3>
                    <p className="text-gray-400 font-medium">
                        {chat.isGroup
                            ? `Created for world-class conversations • ${chat.participants.length} members`
                            : otherParticipant?.email
                        }
                    </p>
                </div>

                <div className="space-y-8">
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-[#06b6d4] rounded-full"></div>
                            Participants
                        </h4>
                        <div className="grid gap-4">
                            {chat.participants.map(member => (
                                <div key={member._id} className="group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <img src={member.avatar} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10" alt="" />
                                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-[#13131a]`}></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{member.name} {member._id === currentUserId && <span className="text-[10px] text-gray-500 ml-1">(You)</span>}</p>
                                            <p className="text-[11px] text-gray-500 truncate max-w-[150px]">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {chat.isGroup && (chat.groupAdmin === member._id || chat.groupAdmin?._id === member._id) && (
                                            <span className="text-[10px] bg-[#06b6d4]/10 text-[#06b6d4] px-2 py-1 rounded-md font-bold uppercase tracking-wider border border-[#06b6d4]/20">Admin</span>
                                        )}
                                        {isAdmin && member._id !== currentUserId && (
                                            <button onClick={() => handleRemoveMember(member._id)} className="p-2.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                <UserMinus size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="mt-12 pt-8 border-t border-white/10">
                            <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2"> Danger Zone </h4>
                            <button
                                onClick={handleDeleteGroup}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-bold border border-red-500/20 transition-all active:scale-95"
                            >
                                <Trash2 size={20} />
                                Delete Group Permanently
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupInfo;
