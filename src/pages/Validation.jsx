import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ShieldCheck, Package, Clock, CheckCircle, AlertCircle, Calendar, XCircle, Trash2, AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Validation = () => {
    const { transactions, validateReception, invalidateReception, validateIncident } = useInventory();
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'incidents', 'history'

    // Group PENDING transactions (Receptions)
    const pendingReceptions = React.useMemo(() => {
        const receptions = {};
        transactions.filter(t => t.status === 'PENDING' && t.type === 'IN').forEach(t => {
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

    // Pending Incidents (Defective/Expired)
    const pendingIncidents = React.useMemo(() => {
        return transactions.filter(t => t.status === 'PENDING' && t.category === 'INCIDENT')
            .sort((a, b) => new Date(b.date) - new Date(a.date));
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

    const handleValidate = async (receptionId) => {
        if (window.confirm("Confirmer la validation et l'entrée en stock de cette commande ?")) {
            try {
                await validateReception(receptionId);
                setSuccessMsg("Réception validée et stock mis à jour !");
                setErrorMsg('');
                setTimeout(() => setSuccessMsg(''), 3000);
            } catch (err) {
                setErrorMsg("Erreur validation: " + err.message);
            }
        }
    };

    const handleInvalidate = async (receptionId) => {
        if (window.confirm("ATTENTION: Voulez-vous vraiment REFUSER cette réception ?\nElle sera supprimée définitivement.")) {
            try {
                await invalidateReception(receptionId);
                setSuccessMsg("Réception refusée et supprimée.");
                setErrorMsg('');
                setTimeout(() => setSuccessMsg(''), 3000);
            } catch (err) {
                setErrorMsg("Erreur refus: " + err.message);
            }
        }
    };

    const handleIncidentAction = async (id, action) => {
        const confirmMsg = action === 'VALIDATE'
            ? "Confirmer la perte ? Ce stock sera déduit définitivement."
            : "Rejeter le signalement ? Le stock ne sera pas modifié.";

        if (window.confirm(confirmMsg)) {
            try {
                await validateIncident(id, action);
                setSuccessMsg(action === 'VALIDATE' ? "Incident validé (Stock déduit)" : "Incident rejeté");
                setTimeout(() => setSuccessMsg(''), 3000);
            } catch (err) {
                setErrorMsg("Erreur: " + err.message);
            }
        }
    };

    const TabButton = ({ id, label, icon: Icon, color, count }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '999px',
                fontWeight: '700',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: activeTab === id ? color : 'transparent',
                color: activeTab === id ? 'white' : 'var(--text-secondary)',
                boxShadow: activeTab === id ? `0 4px 12px ${color}66` : 'none' // Hex transparency hack
            }}
        >
            <Icon size={18} />
            {label}
            {count !== undefined && count > 0 && (
                <span style={{
                    backgroundColor: 'white',
                    color: color,
                    fontSize: '0.75rem',
                    padding: '0.1rem 0.5rem',
                    borderRadius: '4px',
                    marginLeft: '0.5rem',
                    fontWeight: '800'
                }}>{count}</span>
            )}
        </button>
    );

    return (
        <div className="animate-enter" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="text-center mb-8">
                <div className="flex-center mb-2">
                    <ShieldCheck size={40} className="text-purple" />
                </div>
                <h2 className="logo-text" style={{ fontSize: '2rem' }}>
                    Validation Pharmacien
                </h2>
                <p>Contrôle des réceptions et gestion des incidents</p>
            </div>

            {successMsg && (
                <div className="bg-emerald-light mb-6" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle size={20} />
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <AlertCircle size={20} />
                    {errorMsg}
                </div>
            )}

            {/* Premium Tabs */}
            <div className="flex justify-center mb-8">
                <div style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    padding: '0.4rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    gap: '0.5rem'
                }}>
                    <TabButton id="pending" label="Réceptions" icon={Clock} color="#a855f7" count={pendingReceptions.length} />
                    <TabButton id="incidents" label="Avaries" icon={AlertTriangle} color="#f59e0b" count={pendingIncidents.length} />
                    <TabButton id="history" label="Historique" icon={CheckCircle} color="#10b981" />
                </div>
            </div>

            {activeTab === 'pending' && (
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
                                    <div className="flex gap-2">
                                        <button onClick={() => handleInvalidate(reception.id)} className="btn btn-danger" title="Refuser / Supprimer">
                                            <XCircle size={20} />
                                        </button>
                                        <button onClick={() => handleValidate(reception.id)} className="btn btn-primary bg-purple hover:bg-purple-600 border-purple-500">
                                            <CheckCircle size={20} className="mr-2" /> Valider Entrée
                                        </button>
                                    </div>
                                </div>
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
                                                <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                                    <td className="py-3 pl-2 font-medium">{item.medName}</td>
                                                    <td className="py-3 text-right font-mono text-purple-400">+{item.quantity}</td>
                                                    <td className="py-3 text-right text-secondary">{item.details?.expiryDate || 'N/A'}</td>
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

            {activeTab === 'incidents' && (
                pendingIncidents.length === 0 ? (
                    <div className="card text-center py-12 border-dashed border-2 border-slate-700">
                        <ShieldCheck size={48} className="text-emerald mx-auto mb-4" />
                        <h3 className="text-xl mb-2">Aucun incident</h3>
                        <p className="text-secondary">Aucune avarie ou péremption à traiter.</p>
                    </div>
                ) : (
                    <div className="flex-col gap-4">
                        {pendingIncidents.map(incident => (
                            <div key={incident.id} className="card flex-between p-4 border-l-4 border-amber-500">
                                <div className="flex items-center gap-4">
                                    <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{incident.medName}</h4>
                                        <div className="flex items-center gap-2 text-sm text-secondary">
                                            <span className="badge" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                                                {incident.details?.reason || 'Incident'}
                                            </span>
                                            <span>• Quantité: <b>{incident.quantity}</b></span>
                                            <span>• Le: {format(new Date(incident.date), 'dd/MM/yyyy HH:mm')}</span>
                                        </div>
                                        {incident.details?.comment && (
                                            <p className="text-sm mt-1 italic text-slate-400">"{incident.details.comment}"</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleIncidentAction(incident.id, 'REJECT')}
                                        className="btn btn-ghost hover:text-white"
                                        title="Rejeter (Fausse alerte)"
                                    >
                                        Rejeter
                                    </button>
                                    <button
                                        onClick={() => handleIncidentAction(incident.id, 'VALIDATE')}
                                        className="btn btn-danger"
                                        title="Valider la perte de stock"
                                    >
                                        Valider Perte
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {activeTab === 'history' && (
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
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-xs uppercase text-secondary">
                                                <th className="pb-3 pl-2">Médicament</th>
                                                <th className="pb-3 text-right">Quantité</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reception.items.map(item => (
                                                <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                                    <td className="py-3 pl-2 font-medium">{item.medName}</td>
                                                    <td className="py-3 text-right font-mono text-emerald-400">+{item.quantity}</td>
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
