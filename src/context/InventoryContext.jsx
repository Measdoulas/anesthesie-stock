import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadData, saveData } from '../services/storage';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

const INITIAL_DATA = {
    medications: [],
    transactions: []
};

export const InventoryProvider = ({ children }) => {
    const [data, setData] = useState(INITIAL_DATA);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loaded = loadData();
        if (loaded) {
            setData(loaded);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!loading) {
            saveData(data);
        }
    }, [data, loading]);

    const addMedication = (med) => {
        const newMed = {
            ...med,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            stock: parseInt(med.stock) || 0
        };
        setData(prev => ({
            ...prev,
            medications: [...prev.medications, newMed]
        }));
    };

    const updateMedication = (id, updates) => {
        setData(prev => ({
            ...prev,
            medications: prev.medications.map(m => m.id === id ? { ...m, ...updates } : m)
        }));
    };

    const addStock = (medId, quantity, expiryDate) => {
        const qty = parseInt(quantity);
        setData(prev => {
            const med = prev.medications.find(m => m.id === medId);
            if (!med) return prev;

            const newStock = (med.stock || 0) + qty;
            const updatedMed = { ...med, stock: newStock, expiry: expiryDate || med.expiry };

            const transaction = {
                id: crypto.randomUUID(),
                medId,
                medName: med.name,
                type: 'IN',
                quantity: qty,
                date: new Date().toISOString(),
                details: { expiryDate }
            };

            return {
                medications: prev.medications.map(m => m.id === medId ? updatedMed : m),
                transactions: [transaction, ...prev.transactions]
            };
        });
    };

    const removeStock = (medId, quantity, details) => {
        const qty = parseInt(quantity);
        setData(prev => {
            const med = prev.medications.find(m => m.id === medId);
            if (!med) return prev;

            if (med.stock < qty) {
                throw new Error("Stock insuffisant");
            }

            const newStock = med.stock - qty;
            const updatedMed = { ...med, stock: newStock };

            const transaction = {
                id: crypto.randomUUID(),
                medId,
                medName: med.name,
                type: 'OUT',
                quantity: qty,
                date: new Date().toISOString(),
                details
            };

            return {
                medications: prev.medications.map(m => m.id === medId ? updatedMed : m),
                transactions: [transaction, ...prev.transactions]
            };
        });
    };

    const removeStockBatch = (items, details) => {
        // items: array of { medId, quantity }
        setData(prev => {
            // 1. Validate all stocks first
            const updates = [];
            const newTransactions = [];

            // We need a map of current stocks to handle multiple removals of same item if that happened (though UI prevents it usually)
            const currentStocks = {};
            prev.medications.forEach(m => currentStocks[m.id] = m.stock);

            for (const item of items) {
                const med = prev.medications.find(m => m.id === item.medId);
                if (!med) throw new Error(`Médicament introuvable: ${item.medId}`);

                const qty = parseInt(item.quantity);
                if (currentStocks[item.medId] < qty) {
                    throw new Error(`Stock insuffisant pour ${med.name} (Requis: ${qty}, Dispo: ${currentStocks[item.medId]})`);
                }

                currentStocks[item.medId] -= qty;

                updates.push({ medId: item.medId, newStock: currentStocks[item.medId] });
                newTransactions.push({
                    id: crypto.randomUUID(),
                    medId: item.medId,
                    medName: med.name,
                    type: 'OUT',
                    quantity: qty,
                    date: new Date().toISOString(),
                    details
                });
            }

            // 2. Apply updates
            const updatedMedications = prev.medications.map(m => {
                const update = updates.find(u => u.medId === m.id);
                return update ? { ...m, stock: update.newStock } : m;
            });

            return {
                medications: updatedMedications,
                transactions: [...newTransactions, ...prev.transactions]
            };
        });
    };

    const addStockBatch = (items, receptionDetails) => {
        // items: array of { medId, quantity, expiryDate }
        // receptionDetails: object with reception info (date, supplier, etc.) - optional

        const receptionId = crypto.randomUUID();
        const receptionDate = new Date().toISOString();

        setData(prev => {
            const updates = [];
            const newTransactions = [];

            for (const item of items) {
                const med = prev.medications.find(m => m.id === item.medId);
                if (!med) continue; // Should catch error or skip? Skip safe.

                const qty = parseInt(item.quantity);
                const newStock = (med.stock || 0) + qty; // Calculate new stock relative to CURRENT state in this loop?
                // In a batch update on same item, we need to track cumulative changes.
                // Use a temp map if we expect multiple entries for SAME med in one batch.
                // For simplicity, assuming unique med per batch or simple increment works if we map correctly.
                // Better: map previous meds to new stats.

                // Simpler approach compatible with state setter structure:
                // We need to return the NEW complete state.

                // 1. Prepare transactions
                newTransactions.push({
                    id: crypto.randomUUID(),
                    medId: item.medId,
                    medName: med.name,
                    type: 'IN',
                    quantity: qty,
                    date: receptionDate,
                    receptionId: receptionId,
                    status: 'PENDING', // NEW: Waiting for validation
                    details: {
                        expiryDate: item.expiryDate,
                        receptionId: receptionId,
                        ...receptionDetails
                    }
                });
            }

            // 2. Update medications (accumulate stock changes)
            // DO NOT update stock here anymore. It waits for validation.
            // But we might want to update expiry date? 
            // Better to update expiry only on validation to act as "Accepted into stock".
            // So for now, we just add PENDING transactions.

            // Wait, if we don't update stock, 'medications' array remains same.

            return {
                medications: prev.medications, // No change to stock yet
                transactions: [...newTransactions, ...prev.transactions]
            };
        });

        return receptionId;
    };

    const validateReception = (receptionId) => {
        setData(prev => {
            const updates = [];

            // 1. Find pending transactions for this reception
            const pendingTransactions = prev.transactions.filter(t =>
                t.receptionId === receptionId && t.status === 'PENDING'
            );

            if (pendingTransactions.length === 0) return prev;

            // 2. Calculate stock updates
            const stockUpdates = {}; // medId -> quantityToAdd

            pendingTransactions.forEach(t => {
                stockUpdates[t.medId] = (stockUpdates[t.medId] || 0) + parseInt(t.quantity);
            });

            // 3. Update medications
            const updatedMedications = prev.medications.map(med => {
                if (stockUpdates[med.id]) {
                    const newStock = (med.stock || 0) + stockUpdates[med.id];
                    // Also update expiry? Assuming the validated med is the 'freshest', we could update it.
                    // Ideally we'd grab the expiry from the transaction details.
                    // Simple logic: update expiry if present in transaction.
                    // Getting expiry from ONE of the transactions for this med (usually just one per batch per med)
                    const relevantTrans = pendingTransactions.find(t => t.medId === med.id);
                    const newExpiry = relevantTrans?.details?.expiryDate || med.expiry;

                    return { ...med, stock: newStock, expiry: newExpiry };
                }
                return med;
            });

            // 4. Update transactions status
            const updatedTransactions = prev.transactions.map(t => {
                if (t.receptionId === receptionId && t.status === 'PENDING') {
                    return { ...t, status: 'VALIDATED' };
                }
                return t;
            });

            return {
                medications: updatedMedications,
                transactions: updatedTransactions
            };
        });
    };

    const clearData = () => {
        if (window.confirm("Êtes-vous sûr de vouloir tout effacer ? Cette action est irréversible.")) {
            setData(INITIAL_DATA);
        }
    };

    return (
        <InventoryContext.Provider value={{
            medications: data.medications,
            transactions: data.transactions,
            addMedication,
            updateMedication,
            addStock,
            addStockBatch,
            validateReception,
            removeStock,
            removeStockBatch,
            clearData,
            loading
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
