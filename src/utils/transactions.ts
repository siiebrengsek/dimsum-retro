export type TransactionItem = {
    productName: string;
    price: number;
    quantity: number;
};

export type Transaction = {
    id: string;
    items: TransactionItem[];
    total: number;
    paymentMethod: string;
    createdAt: string;
};

const STORAGE_KEY = 'dimsum_transactions';

export const getTransactions = (): Transaction[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const transactions = getTransactions();
    const newTransaction: Transaction = {
        ...transaction,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
    };
    transactions.unshift(newTransaction);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return newTransaction;
};

export const getTodayTransactions = (): Transaction[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getTransactions().filter((t) => new Date(t.createdAt) >= today);
};
