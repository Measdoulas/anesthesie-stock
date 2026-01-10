import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
    const { user } = useAuth();
    const [medications, setMedications] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Move fetchData outside to be reusable
    const fetchData = async () => {
        // Don't set loading to true here to avoid UI flicker on background refresh
        // setLoading(true); 
        const [medsRes, transRes] = await Promise.all([
            supabase.from('medications').select('*').order('name'),
            supabase.from('transactions').select('*').order('created_at', { ascending: false })
        ]);

        if (medsRes.data) setMedications(medsRes.data);
        if (transRes.data) setTransactions(transRes.data);
        setLoading(false);
    };

    // Initial Fetch & Realtime Subscription
    useEffect(() => {
        if (!user) {
            setMedications([]);
            setTransactions([]);
            return;
        }

        setLoading(true); // Set loading only on mount
        fetchData();

        // Realtime subscriptions
        const medsSub = supabase
            .channel('meds-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, (payload) => {
                fetchData(); // Simplest robust strategy: Refetch all on change
            })
            .subscribe();

        const transSub = supabase
            .channel('trans-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                fetchData(); // Simplest robust strategy: Refetch all on change
            })
            .subscribe();

        return () => {
            medsSub.unsubscribe();
            transSub.unsubscribe();
        };
    }, [user]);

    const addMedication = async (med) => {
        const { error } = await supabase.from('medications').insert([{
            name: med.name,
            stock: parseInt(med.stock) || 0,
            isNarcotic: med.isNarcotic,
            expiry: med.expiry || null // Optional for base med
        }]);
        if (error) throw error;
        await fetchData();
    };

    const updateMedication = async (id, updates) => {
        const { error } = await supabase.from('medications').update(updates).eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    const deleteMedication = async (id) => {
        const { error } = await supabase.from('medications').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    const removeStockBatch = async (items, details) => {
        // items: array of { medId, quantity }
        // For atomic consistency, we ideally use a Stored Procedure or RPC.
        // For MVP, we'll do client-side sequence but be aware of race conditions (RLS helps a bit).

        // 1. Check stocks locally first for quick feedback (optional but good UX)
        // 2. Insert OUT transactions
        // 3. Update Stocks.

        // Note: In Supabase, it's safer to use an RPC for batch stock deduction to ensure no negative stock race condition.
        // But let's keep it simple for now: Loop updates.

        const timestamp = new Date().toISOString();
        const userId = user.id;

        // Prepare Transactions
        const transactionRows = items.map(item => {
            const med = medications.find(m => m.id === item.medId);
            return {
                type: 'OUT',
                medId: item.medId,
                medName: med?.name || 'Unknown',
                quantity: parseInt(item.quantity),
                date: timestamp,
                status: 'VALIDATED', // Direct exit
                details: details,
                userId: userId
            };
        });

        const { error: transError } = await supabase.from('transactions').insert(transactionRows);
        if (transError) throw transError;

        // Update Stocks
        for (const item of items) {
            const med = medications.find(m => m.id === item.medId);
            if (!med) continue;

            const newStock = med.stock - parseInt(item.quantity);
            // Optimistic check
            if (newStock < 0) console.warn("Stock might be negative!");

            await supabase.from('medications').update({ stock: newStock }).eq('id', item.medId);
        }
        await fetchData();
    };

    const addStockBatch = async (items, receptionDetails) => {
        const receptionId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const userId = user.id;

        const transactionRows = items.map(item => {
            const med = medications.find(m => m.id === item.medId);
            return {
                type: 'IN',
                medId: item.medId,
                medName: med?.name || 'Unknown',
                quantity: parseInt(item.quantity),
                date: timestamp,
                status: 'PENDING',
                receptionId: receptionId,
                details: {
                    expiryDate: item.expiryDate,
                    receptionId: receptionId,
                    ...receptionDetails
                },
                userId: userId
            };
        });

        const { error } = await supabase.from('transactions').insert(transactionRows);
        if (error) throw error;

        await fetchData();
        return receptionId;
    };

    const validateReception = async (receptionId) => {
        // 1. Get pending transactions
        const pending = transactions.filter(t => t.receptionId === receptionId && t.status === 'PENDING');
        if (pending.length === 0) return;

        // 2. Update Stocks
        for (const t of pending) {
            const med = medications.find(m => m.id === t.medId);
            if (!med) continue;

            const qty = parseInt(t.quantity);
            const newStock = (med.stock || 0) + qty;
            // Update expiry if presents
            const newExpiry = t.details?.expiryDate || med.expiry;

            await supabase.from('medications').update({
                stock: newStock,
                expiry: newExpiry
            }).eq('id', t.medId);
        }

        // 3. Mark transactions as VALIDATED
        const { error } = await supabase
            .from('transactions')
            .update({ status: 'VALIDATED' })
            .eq('receptionId', receptionId);

        if (error) throw error;
        if (error) throw error;
        await fetchData();
    };

    const invalidateReception = async (receptionId) => {
        // Soft delete: Update status to REJECTED for audit trail and robustness
        const { error } = await supabase
            .from('transactions')
            .update({ status: 'REJECTED' })
            .eq('receptionId', receptionId)
            .eq('status', 'PENDING');

        if (error) throw error;
        await fetchData();
    };

    const saveAudit = async (auditData, summary) => {
        // 1. Create Audit Record
        const { data: audit, error: auditError } = await supabase
            .from('audits')
            .insert([{
                user_id: user.id,
                status: 'VALIDATED',
                total_items: summary.totalItems,
                discrepancy_count: summary.discrepancyCount
            }])
            .select()
            .single();

        if (auditError) throw auditError;

        // 2. Create Audit Items
        const itemsToInsert = auditData.map(item => ({
            audit_id: audit.id,
            med_id: item.id,
            med_name: item.name,
            theoretical_stock: item.stock,
            physical_stock: item.physicalStock,
            gap: item.gap,
            comment: item.comment
        }));

        const { error: itemsError } = await supabase.from('audit_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        return audit.id;
    };

    const reportIncident = async (medId, quantity, reason, comment) => {
        const med = medications.find(m => m.id === medId);
        if (!med) throw new Error("Médicament non trouvé");

        const { error } = await supabase.from('transactions').insert([{
            type: 'OUT', // Technically an OUT, but PENDING validation
            status: 'PENDING',
            category: 'INCIDENT', // Special flag
            medId: medId,
            medName: med.name,
            quantity: quantity,
            date: new Date().toISOString(),
            userId: user.id,
            details: { reason, comment }
        }]);

        if (error) throw error;
        await fetchData();
    };

    const validateIncident = async (transactionId, action) => {
        // action: 'VALIDATE' or 'REJECT'
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        if (action === 'REJECT') {
            await supabase.from('transactions').update({ status: 'REJECTED' }).eq('id', transactionId);
            await fetchData();
            return;
        }

        // Validate -> Deduct Stock
        const med = medications.find(m => m.id === transaction.medId);
        if (med) {
            const newStock = med.stock - transaction.quantity;
            await supabase.from('medications').update({ stock: newStock }).eq('id', transaction.medId);
        }

        await supabase.from('transactions').update({ status: 'VALIDATED' }).eq('id', transactionId);
        await fetchData();
    };

    // Backwards compatibility functions (aliases) - mapped to simple versions or errors
    const addStock = () => console.error("Use addStockBatch");
    const removeStock = () => console.error("Use removeStockBatch");
    const clearData = async () => {
        try {
            localStorage.clear(); // Clears thresholds and other local prefs
            await supabase.auth.signOut();
            window.location.href = '/'; // Force reload to login
        } catch (e) {
            console.error("Reset failed", e);
            window.location.reload();
        }
    };

    return (
        <InventoryContext.Provider value={{
            medications,
            transactions,
            loading,
            addMedication,
            updateMedication,
            addStockBatch,
            removeStockBatch,
            validateReception,
            invalidateReception, // New: Reject reception
            reportIncident, // New: Report defective/expired
            validateIncident, // New: Validate incident (deduct stock)
            saveAudit, // New: Save Inventory Audit
            deleteMedication, // Exposed for Pharmacist/Admin
            /* Legacy/Unused exposed to prevent crash if still called somewhere before cleanup */
            addStock,
            removeStock,
            clearData
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
