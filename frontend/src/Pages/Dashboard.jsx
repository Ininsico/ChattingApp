import React, { useEffect } from "react";
import useChatStore from "../store/useChatStore";
import { MessageSquare, Users, User, LogOut, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DirectMessages from "../Components/DirectMessages";
import GroupMessages from "../Components/GroupMessages";
import Profile from "../Components/Profile";
import socketService from "../services/socket";
import { authAPI, getCurrentUser } from "../services/api";

const Dashboard = () => {
    const {
        activeTab,
        setActiveTab,
        setCurrentUser,
        handleNewMessage
    } = useChatStore();

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Initial Setup & Socket Connection
    useEffect(() => {
        document.documentElement.classList.add('dark');

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        // Initialize User
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }

        socketService.connect(token);

        // Bind Store handlers to Socket Events
        socketService.onNewMessage(handleNewMessage);

        return () => {
            socketService.disconnect();
            socketService.off('new-message');
        };
    }, [navigate, handleNewMessage, setCurrentUser]);

    // Handle URL Params for deep linking
    useEffect(() => {
        const cid = searchParams.get('cid');
        const type = searchParams.get('type');
        if (cid && type) {
            setActiveTab(type === 'group' ? 'groups' : 'direct');
        }
    }, [searchParams, setActiveTab]);


    const handleSignOut = async () => {
        await authAPI.logout();
        socketService.disconnect();
        navigate('/');
    };

    const renderContent = () => {
        const initialChatId = searchParams.get('cid');
        switch (activeTab) {
            case 'direct': return <DirectMessages initialChatId={activeTab === 'direct' ? initialChatId : null} />;
            case 'groups': return <GroupMessages initialChatId={activeTab === 'groups' ? initialChatId : null} />;
            case 'profile': return <Profile />;
            default: return <DirectMessages />;
        }
    };

    return (
        <div className="h-[100dvh] w-full bg-[#0a0a0f] text-white flex flex-col md:flex-row overflow-hidden relative">

            {/* Clean Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#6366f1]/5 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#06b6d4]/5 rounded-full blur-[150px]"></div>
            </div>

            {/* Sidebar Navigation - Desktop */}
            <nav className="hidden md:flex w-20 z-20 flex-col items-center py-8 relative backdrop-blur-2xl bg-[#13131a] border-r border-white/10 shadow-2xl">
                <div className="mb-12 group cursor-pointer">
                    <div className="w-12 h-12 bg-[#6366f1] rounded-2xl flex items-center justify-center shadow-lg shadow-[#6366f1]/30 group-hover:shadow-[#6366f1]/50 transition-all duration-300 group-hover:scale-110">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="flex-1 w-full flex flex-col items-center space-y-6">
                    <TabButton
                        active={activeTab === 'direct'}
                        onClick={() => setActiveTab('direct')}
                        icon={<MessageSquare size={22} />}
                        label="Chats"
                        color="#06b6d4"
                    />
                    <TabButton
                        active={activeTab === 'groups'}
                        onClick={() => setActiveTab('groups')}
                        icon={<Users size={22} />}
                        label="Groups"
                        color="#8b5cf6"
                    />
                    <TabButton
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                        icon={<User size={22} />}
                        label="Profile"
                        color="#06b6d4"
                    />
                </div>

                <div className="mt-auto flex flex-col items-center space-y-4">
                    <button
                        onClick={handleSignOut}
                        className="w-11 h-11 flex items-center justify-center text-[#ef4444] hover:text-white hover:bg-[#ef4444]/20 rounded-xl transition-all duration-300"
                        title="Sign Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            {/* Bottom Navigation - Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#13131a]/95 border-t border-white/10 shadow-2xl">
                <div className="flex items-center justify-around px-4 py-3">
                    <MobileTabButton
                        active={activeTab === 'direct'}
                        onClick={() => setActiveTab('direct')}
                        icon={<MessageSquare size={20} />}
                        label="Chats"
                        color="#06b6d4"
                    />
                    <MobileTabButton
                        active={activeTab === 'groups'}
                        onClick={() => setActiveTab('groups')}
                        icon={<Users size={20} />}
                        label="Groups"
                        color="#8b5cf6"
                    />
                    <MobileTabButton
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                        icon={<User size={20} />}
                        label="Profile"
                        color="#06b6d4"
                    />
                    <button
                        onClick={handleSignOut}
                        className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-[#ef4444] hover:text-white transition-all duration-300"
                    >
                        <LogOut size={20} />
                        <span className="text-[10px] font-medium">Logout</span>
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 h-full relative z-10 flex flex-col p-1.5 sm:p-3 md:p-4 lg:p-6 pb-16 sm:pb-20 md:pb-6">
                <div className="flex-1 overflow-hidden">
                    <div className="w-full h-full backdrop-blur-xl bg-[#13131a] rounded-xl sm:rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex relative">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label, color }) => (
    <button
        onClick={onClick}
        className={`relative group flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${active
            ? `text-white shadow-lg`
            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
        style={active ? { backgroundColor: color, boxShadow: `0 0 30px ${color}40` } : {}}
    >
        <div className={`transition-all duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
        </div>

        <span className="absolute left-20 bg-[#1a1a24] text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-[60] pointer-events-none shadow-xl border border-white/20 group-hover:translate-x-1">
            {label}
        </span>

        {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full" style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }}></div>
        )}
    </button>
);

const MobileTabButton = ({ active, onClick, icon, label, color }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ${active
            ? 'text-white'
            : 'text-gray-500'
            }`}
        style={active ? { backgroundColor: color } : {}}
    >
        <div className={`transition-all duration-300 ${active ? 'scale-110' : ''}`}>
            {icon}
        </div>
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

export default Dashboard;