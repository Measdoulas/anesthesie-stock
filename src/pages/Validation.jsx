import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ShieldCheck, Package, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Validation = () => {
    const { transactions, validateReception } = useInventory();
    const [successMsg, setSuccessMsg] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

    // Group PENDING transactions
    const pendingReceptions = React.useMemo(() => {
        const receptions = {};
        transactions.filter(t => t.status === 'PENDING').forEach(t => {
            const recId = t.receptionId;
            if (!receptions[recId]) {
                receptions[recId] = {
                    id: recId,
                    date: t.date,
                    supplier: t.details?.supplier || 'N/A',
                    items: []
                };
            }
            receptions[recId].items.push(t);
        });
        return Object.values(receptions).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [transactions]);

    // Group VALIDATED transactions (History)
    const historyReceptions = React.useMemo(() => {
        const receptions = {};
        transactions.filter(t => t.type === 'IN' && t.status === 'VALIDATED').forEach(t => {
            const recId = t.receptionId;
            if (!receptions[recId]) {
                receptions[recId] = {
                    id: recId,
                    date: t.date,
                    supplier: t.details?.supplier || 'N/A',
                    items: []
                };
            }
            receptions[recId].items.push(t);
        });
        // Newest first for history
        return Object.values(receptions).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions]);

    const handleValidate = (receptionId) => {
        if (window.confirm("Confirmer la validation et l'entrée en stock de cette commande ?")) {
            validateReception(receptionId);
            setSuccessMsg("Réception validée et stock mis à jour !");
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    return (
        <div className="animate-enter" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="text-center mb-8">
                <div className="flex-center mb-2">
                    <ShieldCheck size={40} className="text-purple" />
                </div>
                <h2 className="logo-text" style={{ fontSize: '2rem' }}>
                    Validation Pharmacien
                </h2>
                <p>Contrôle des réceptions et historique</p>
            </div>

            {successMsg && (
                <div className="bg-emerald-light mb-6" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle size={20} />
                    {successMsg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-3 px-4 font-bold transition-colors relative ${activeTab === 'pending' ? 'text-purple' : 'text-secondary hover:text-white'}`}
                >
                    En Attente ({pendingReceptions.length})
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 px-4 font-bold transition-colors relative ${activeTab === 'history' ? 'text-purple' : 'text-secondary hover:text-white'}`}
                >
                    Historique Validé
                    {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple"></div>}
                </button>
            </div>

            {activeTab === 'pending' ? (
                // PENDING VIEW
                pendingReceptions.length === 0 ? (
                    <div className="card text-center py-12 border-dashed border-2 border-slate-700">
                        <CheckCircle size={48} className="text-emerald mx-auto mb-4" />
                        <h3 className="text-xl mb-2">Tout est à jour</h3>
                        <p className="text-secondary">Aucune réception en attente de validation.</p>
                    </div>
                ) : (
                    <div className="flex-col gap-6">
                        {pendingReceptions.map(reception => (
                            <div key={reception.id} className="card relative overflow-hidden">
                                {/* Header */}
                                <div className="flex-between mb-4 pb-4 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-light p-3 rounded-full">
                                            <Package size={24} className="text-purple" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">Réception du {format(new Date(reception.date), 'dd MMMM yyyy', { locale: fr })}</span>
                                                <span className="badge bg-amber-500/10 text-amber-500 border-amber-500/20">En Attente</span>
                                            </div>
                                            <div className="text-sm text-secondary mt-1">
                                                Réf: {reception.supplier} • {reception.items.length} articles
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => handleValidate(reception.id)}
                                            className="btn btn-primary bg-purple hover:bg-purple-600 border-purple-500"
                                            style={{ padding: '0.75rem 1.5rem' }}
                                        >
                                            <CheckCircle size={20} className="mr-2" />
                                            Valider Entrée
                                        </button>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-xs uppercase text-secondary">
                                                <th className="pb-3 pl-2">Médicament</th>
                                                <th className="pb-3 text-right">Quantité</th>
                                                <th className="pb-3 text-right">Péremption</th>
                                                <th className="pb-3 text-right pr-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reception.items.map(item => (
                                                <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                    <td className="py-3 pl-2 font-medium">{item.medName}</td>
                                                    <td className="py-3 text-right font-mono text-purple-400">+{item.quantity}</td>
                                                    <td className="py-3 text-right text-secondary">
                                                        {item.details?.expiryDate ? (
                                                            <span className="flex items-center justify-end gap-1">
                                                                <Calendar size={14} />
                                                                {item.details.expiryDate}
                                                            </span>
                                                        ) : 'N/A'}
                                                    </td>
                                                    <td className="py-3 text-right pr-2">
                                                        <div className="flex items-center justify-end gap-1 text-amber-500 text-xs">
                                                            <Clock size={14} />
                                                            À Valider
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                // HISTORY VIEW
                historyReceptions.length === 0 ? (
                    <div className="card text-center py-12 border-dashed border-2 border-slate-700">
                        <Clock size={48} className="text-secondary mx-auto mb-4" />
                        <h3 className="text-xl mb-2">Aucun historique</h3>
                        <p className="text-secondary">Aucune validation effectuée pour le moment.</p>
                    </div>
                ) : (
                    <div className="flex-col gap-6">
                        {historyReceptions.map(reception => (
                            <div key={reception.id} className="card relative overflow-hidden" style={{ opacity: 0.8 }}>
                                {/* Header */}
                                <div className="flex-between mb-4 pb-4 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-emerald-light p-3 rounded-full">
                                            <CheckCircle size={24} className="text-emerald" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">Validé le {format(new Date(reception.date), 'dd MMMM yyyy', { locale: fr })}</span>
                                                <span className="badge bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Validé</span>
                                            </div>
                                            <div className="text-sm text-secondary mt-1">
                                                Réf: {reception.supplier} • {reception.items.length} articles
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-xs uppercase text-secondary">
                                                <th className="pb-3 pl-2">Médicament</th>
                                                <th className="pb-3 text-right">Quantité</th>
                                                <th className="pb-3 text-right">Péremption</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reception.items.map(item => (
                                                <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                    <td className="py-3 pl-2 font-medium">{item.medName}</td>
                                                    <td className="py-3 text-right font-mono text-emerald-400">+{item.quantity}</td>
                                                    <td className="py-3 text-right text-secondary">
                                                        {item.details?.expiryDate || 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default Validation;
