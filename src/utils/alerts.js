import { differenceInMonths, parseISO, isPast } from 'date-fns';

export const getStockThresholds = () => {
    const saved = localStorage.getItem('stock_thresholds');
    return saved ? JSON.parse(saved) : { LOW: 10, CRITICAL: 5 };
};

export const EXPIRATION_ALERTS = [6, 3, 2, 1]; // Mois

export const getStockStatus = (quantity) => {
    const thresholds = getStockThresholds();
    if (quantity < thresholds.CRITICAL) return 'critical';
    if (quantity <= thresholds.LOW) return 'low';
    return 'normal';
};

export const getExpirationStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const date = parseISO(expiryDate);

    if (isPast(date)) return 'expired';

    const months = differenceInMonths(date, today);

    if (months < 1) return 'critical'; // < 1 mois
    if (months <= 3) return 'warning'; // <= 3 mois
    if (months <= 6) return 'notice';  // <= 6 mois

    return 'ok';
};

export const formatStockStatus = (status) => {
    switch (status) {
        case 'critical': return { label: 'Stock Critique', color: 'text-danger', badge: 'bg-red-500/10 text-red-500' };
        case 'low': return { label: 'Stock Faible', color: 'text-warning', badge: 'bg-amber-500/10 text-amber-500' };
        case 'normal': return { label: 'Stock Normal', color: 'text-success', badge: 'bg-emerald-500/10 text-emerald-500' };
        default: return { label: 'Inconnu', color: 'text-slate-400', badge: 'bg-slate-500/10 text-slate-400' };
    }
};
