interface ConfirmModalProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal = ({ open, title, message, confirmLabel = 'Ya, Kirim', cancelLabel = 'Batal', onConfirm, onCancel }: ConfirmModalProps) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
            <div
                className="bg-[#1A1A2E] rounded-2xl w-full max-w-sm shadow-2xl border border-[#303050] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className="text-4xl mb-4">📋</div>
                    <h3 className="text-white text-lg font-bold mb-2">{title}</h3>
                    <p className="text-[#888] text-sm leading-relaxed">{message}</p>
                </div>
                <div className="flex border-t border-[#303050]">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3.5 text-sm font-semibold text-[#888] hover:text-white transition border-r border-[#303050]"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3.5 text-sm font-bold text-[#F5A623] hover:text-white transition"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
