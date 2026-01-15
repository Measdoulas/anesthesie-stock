import { differenceInMonths, parseISO, isPast, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// ========== CONFIGURATION ==========

// Get alert coefficients from localStorage (customizable in Settings)
export const getAlertCoefficients = () => {
    const saved = localStorage.getItem('alert_coefficients');
    return saved ? JSON.parse(saved) : {
        normal: 2.0,      // 2 months of stock
        low: 1.5,         // 1.5 months
        critical: 1.0,    // 1 month
        minAbsolute: 2    // Minimum threshold in units
    };
};

// Save custom coefficients
export const saveAlertCoefficients = (coefficients) => {
    localStorage.setItem('alert_coefficients', JSON.stringify(coefficients));
};

// Legacy static thresholds (fallback only)
export const getStockThresholds = () => {
    const saved = localStorage.getItem('stock_thresholds');
    return saved ? JSON.parse(saved) : { LOW: 10, CRITICAL: 5 };
};

export const EXPIRATION_ALERTS = [6, 3, 2, 1]; // Mois

// ========== CONSUMPTION CALCULATION ==========

/**
 * Get monthly consumption for a medication over the last N months
 * Returns array: [currentMonth, month-1, month-2, ...]
 */
export const getMonthlyConsumption = (medId, transactions, monthsBack = 3) => {
    const today = new Date();
    const monthlyData = [];

    for (let i = 0; i < monthsBack; i++) {
        const monthStart = startOfMonth(subMonths(today, i));
        const monthEnd = endOfMonth(subMonths(today, i));

        const monthTransactions = transactions.filter(t =>
            t.medId === medId &&
            t.type === 'OUT' &&
            t.status === 'VALIDATED' &&
            isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
        );

        const quantity = monthTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);

        monthlyData.push({
            month: monthStart,
            quantity: quantity,
            transactionCount: monthTransactions.length
        });
    }

    return monthlyData;
};

/**
 * Calculate consumption trend (increasing, stable, decreasing)
 */
export const getConsumptionTrend = (monthlyData) => {
    if (monthlyData.length < 2) return { trend: 'unknown', percentage: 0 };

    const current = monthlyData[0].quantity;
    const previous = (monthlyData[1].quantity + monthlyData[2]?.quantity || 0) / (monthlyData[2] ? 2 : 1);

    if (previous === 0) return { trend: 'stable', percentage: 0 };

    const percentageChange = ((current - previous) / previous) * 100;

    if (percentageChange > 10) return { trend: 'increasing', percentage: Math.round(percentageChange) };
    if (percentageChange < -10) return { trend: 'decreasing', percentage: Math.round(percentageChange) };
    return { trend: 'stable', percentage: Math.round(percentageChange) };
};

/**
 * Calculate dynamic thresholds based on consumption history
 * Uses weighted average for seasonal variation handling
 */
export const calculateDynamicThresholds = (medId, transactions, medications) => {
    const medication = medications.find(m => m.id === medId);
    if (!medication) return getDefaultThresholds();

    // Check medication age
    const createdDate = new Date(medication.created_at);
    const ageInDays = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);

    // Use default thresholds for new medications (< 90 days)
    if (ageInDays < 90) {
        return getDefaultThresholds();
    }

    // Get monthly consumption data
    const monthlyData = getMonthlyConsumption(medId, transactions, 3);

    // If no consumption history, use default
    if (monthlyData.every(m => m.quantity === 0)) {
        return getDefaultThresholds();
    }

    // Weighted average: Recent month = 50%, Month-1 = 30%, Month-2 = 20%

    const weights = [0.5, 0.3, 0.2];
    const CMM = monthlyData.reduce((sum, data, idx) => {
        const weight = weights[idx] || 0;
        return sum + (data.quantity * weight);
    }, 0);

    // Get coefficients from settings
    const coefficients = getAlertCoefficients();

    // Calculate thresholds with rounding UP (Math.ceil) - no half vials!
    const thresholds = {
        normal: Math.ceil(CMM * coefficients.normal),
        low: Math.ceil(CMM * coefficients.low),
        critical: Math.ceil(CMM * coefficients.critical)
    };

    // Apply minimum absolute thresholds
    const minAbs = coefficients.minAbsolute;
    return {
        normal: Math.max(thresholds.normal, minAbs * 2),
        low: Math.max(thresholds.low, Math.ceil(minAbs * 1.5)),
        critical: Math.max(thresholds.critical, minAbs),
        isDynamic: true, // Flag to indicate this is calculated, not static
        cmm: Math.round(CMM * 10) / 10 // Store CMM for display
    };
};

/**
 * Get default static thresholds (for new meds or fallback)
 */
export const getDefaultThresholds = () => {
    return {
        normal: 20,
        low: 10,
        critical: 5,
        isDynamic: false,
        cmm: 0
    };
};

// ========== STOCK STATUS ==========

/**
 * Get stock status using DYNAMIC thresholds if available
 * Falls back to static if dynamic not possible
 */
export const getStockStatus = (quantity, medId = null, transactions = null, medications = null) => {
    let thresholds;

    // Try to use dynamic thresholds
    if (medId && transactions && medications) {
        thresholds = calculateDynamicThresholds(medId, transactions, medications);
    } else {
        // Fallback to static
        const static_thresholds = getStockThresholds();
        thresholds = {
            critical: static_thresholds.CRITICAL,
            low: static_thresholds.LOW
        };
    }

    if (quantity < thresholds.critical) return 'critical';
    if (quantity <= thresholds.low) return 'low';
    return 'normal';
};

// ========== EXPIRATION STATUS ==========

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

// ========== FORMATTING ==========

export const formatStockStatus = (status) => {
    switch (status) {
        case 'critical': return { label: 'Stock Critique', color: 'text-danger', badge: 'bg-red-500/10 text-red-500' };
        case 'low': return { label: 'Stock Faible', color: 'text-warning', badge: 'bg-amber-500/10 text-amber-500' };
        case 'normal': return { label: 'Stock Normal', color: 'text-success', badge: 'bg-emerald-500/10 text-emerald-500' };
        default: return { label: 'Inconnu', color: 'text-slate-400', badge: 'bg-slate-500/10 text-slate-400' };
    }
};

export const formatTrendIcon = (trend) => {
    switch (trend) {
        case 'increasing': return '↗';
        case 'stable': return '→';
        case 'decreasing': return '↘';
        default: return '?';
    }
};
