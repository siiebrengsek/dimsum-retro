export const getTodayDate = (): string => {
    const now = new Date();
    const gmt7 = new Date(now.getTime() + 7 * 3600000);
    return gmt7.toISOString().split('T')[0];
};
