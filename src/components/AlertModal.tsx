interface AlertModalProps {
    open: boolean;
    type?: 'info' | 'error' | 'success';
    title: string;
    message: string;
    onClose: () => void;
}

const icons: Record<string, { icon: string; bg: string; color: string }> = {
    info: { icon: 'ℹ️', bg: 'bg-blue-500/20', color: 'text-blue-400' },
    error: { icon: '✕', bg: 'bg-red-500/20', color: 'text-red-400' },
    success: { icon: '✓', bg: 'bg-green-500/20', color: 'text-green-400' },
};

export const AlertModal = ({ open, type = 'info', title, message, onClose }: AlertModalProps) => {
    if (!open) return null;

    const style = icons[type] || icons.info;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1A1A2E] rounded-2xl w-full max-w-sm shadow-2xl border border-[#303050] overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className={`w-16 h-16 rounded-full ${style.bg} flex items-center justify-center mx-auto mb-4`}>
                        {type === 'info' ? (
                            <span className="text-3xl">ℹ️</span>
                        ) : type === 'error' ? (
                            <svg className={`w-8 h-8 ${style.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className={`w-8 h-8 ${style.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        )}
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">{title}</h3>
                    <p className="text-[#888] text-sm leading-relaxed">{message}</p>
                </div>
                <div className="border-t border-[#303050]">
                    <button onClick={onClose} className="w-full py-3.5 text-sm font-bold text-[#F5A623] hover:text-white transition">OK</button>
                </div>
            </div>
        </div>
    );
};
