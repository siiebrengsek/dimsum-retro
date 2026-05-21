interface SuccessModalProps {
    open: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export const SuccessModal = ({ open, title, message, onClose }: SuccessModalProps) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1A1A2E] rounded-2xl w-full max-w-sm shadow-2xl border border-[#303050] overflow-hidden text-center">
                <div className="p-6">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">{title}</h3>
                    <p className="text-[#888] text-sm leading-relaxed">{message}</p>
                </div>
                <div className="border-t border-[#303050]">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 text-sm font-bold text-[#F5A623] hover:text-white transition"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};
