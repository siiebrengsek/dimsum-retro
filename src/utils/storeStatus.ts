export const getStoreStatus = () => {
    const now = new Date();
    const hours = now.getHours();
    // Jam operasional: 10:00 - 21:00
    const isOpen = hours >= 10 && hours < 21;

    return {
        isOpen,
        text: isOpen ? 'OPEN' : 'CLOSED',
        color: isOpen ? 'bg-green-500' : 'bg-red-500',
        message: !isOpen ? 'Pemesanan akan diproses saat outlet buka kembali (10:00 - 21:00)' : null
    };
};
