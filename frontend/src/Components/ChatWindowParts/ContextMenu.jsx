import { Reply, Copy, Forward, Pin, Star, CheckSquare, Download, Flag, Trash2 } from 'lucide-react';

const ContextMenu = ({
    contextMenu,
    onClose,
    onReply,
    onCopy,
    onForward,
    onPin,
    onStar,
    onSelect,
    onSaveAs,
    onReport,
    onDelete,
    currentUser,
    pinnedMessages,
    starredMessages
}) => {
    if (!contextMenu) return null;

    // Smart positioning: appear next to the message
    const menuHeight = 380;
    const menuWidth = 200;
    const spaceBelow = window.innerHeight - contextMenu.y;
    const spaceRight = window.innerWidth - contextMenu.x;

    // Position menu to the right if space, otherwise left
    let left = contextMenu.x + 10;
    if (spaceRight < menuWidth + 20) {
        left = contextMenu.x - menuWidth - 10;
    }

    // Position menu below if space, otherwise above
    let top = contextMenu.y;
    if (spaceBelow < menuHeight) {
        top = Math.max(10, contextMenu.y - menuHeight + 50);
    }

    return (
        <div
            className="context-menu-container fixed z-[9999] bg-[#1a1a24]/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-52 overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
                top: `${top}px`,
                left: `${left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
        >
            <div className="p-1 space-y-0.5">
                <button onClick={() => {
                    onReply(contextMenu.message);
                    onClose();
                }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Reply size={14} /> Reply
                </button>
                <button onClick={() => {
                    onCopy(contextMenu.message);
                }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Copy size={14} /> Copy {contextMenu.message.fileUrl ? 'Link' : 'Text'}
                </button>
                <button onClick={() => {
                    onForward(contextMenu.message);
                }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Forward size={14} /> Forward
                </button>
                <button onClick={() => {
                    onPin(contextMenu.message._id);
                }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Pin size={14} /> {pinnedMessages.includes(contextMenu.message._id) ? 'Unpin' : 'Pin'}
                </button>
                <button onClick={() => {
                    onStar(contextMenu.message._id);
                }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Star size={14} className={starredMessages.includes(contextMenu.message._id) ? 'fill-yellow-400 text-yellow-400' : ''} /> {starredMessages.includes(contextMenu.message._id) ? 'Unstar' : 'Star'}
                </button>
                <button onClick={() => {
                    onSelect(contextMenu.message._id);
                }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <CheckSquare size={14} /> Select
                </button>
                <button onClick={() => {
                    onSaveAs(contextMenu.message);
                }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <Download size={14} /> Save as
                </button>

                <div className="h-px bg-white/10 my-1"></div>

                <button onClick={() => {
                    onReport(contextMenu.message);
                }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Flag size={14} /> Report
                </button>
                {((contextMenu.message.sender?._id === currentUser?.id) || (contextMenu.message.sender === currentUser?.id)) && (
                    <button onClick={() => {
                        onDelete(contextMenu.message._id);
                    }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={14} /> Delete
                    </button>
                )}
            </div>
        </div>
    );
};

export default ContextMenu;
