import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ShieldCheck, Package, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Validation = () => {
    const { transactions, validateReception } = useInventory();
    const [successMsg, setSuccessMsg] = useState('');

    // Group PENDING transactions by receptionId
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
        return Object.values(receptions).sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first for validation queue
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
                <p>Vérification et approbation des entrées provisoires</p>
            </div>

            {successMsg && (
                <div className="bg-emerald-light mb-6" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle size={20} />
                    {successMsg}
                </div>
            )}

            {pendingReceptions.length === 0 ? (
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
            )}
        </div>
    );
};

export default Validation;
