import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { getStockStatus, getExpirationStatus } from '../utils/alerts';
import { AlertCircle, AlertTriangle, Package, Clock, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className="card flex-center" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
        <div className={`flex-center ${bgClass} ${colorClass}`} style={{ borderRadius: '50%', padding: '0.75rem', width: '50px', height: '50px' }}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-sm font-medium">{title}</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    const { medications, transactions, loading } = useInventory();

    if (loading) return <div className="text-center" style={{ padding: '2rem' }}>Chargement...</div>;

    const lowStockCount = medications.filter(m => getStockStatus(m.stock) === 'low').length;
    const criticalStockCount = medications.filter(m => getStockStatus(m.stock) === 'critical').length;
    const expiringCount = medications.filter(m => {
        const status = getExpirationStatus(m.expiry);
        return status === 'critical' || status === 'warning';
    }).length;

    const recentTransactions = transactions.slice(0, 5);

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex-between mb-6">
                <div>
                    <h2 className="logo-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                        Vue d'ensemble
                    </h2>
                    <p>Bienvenue sur AnesthMed_ HBC</p>
                </div>
                <div>
                    <span className="badge" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {medications.length} Médicaments suivis
                    </span>
                </div>
            </div>

            <div className="grid-4">
                <StatCard
                    title="Stock Total"
                    value={medications.reduce((acc, m) => acc + (m.stock || 0), 0)}
                    icon={Package}
                    colorClass="text-blue"
                    bgClass="bg-blue-light"
                />
                <StatCard
                    title="Stock Faible"
                    value={lowStockCount}
                    icon={AlertCircle}
                    colorClass="text-amber"
                    bgClass="bg-amber-light"
                />
                <StatCard
                    title="Stock Critique"
                    value={criticalStockCount}
                    icon={AlertTriangle}
                    colorClass="text-red"
                    bgClass="bg-red-light"
                />
                <StatCard
                    title="Péremption Proche"
                    value={expiringCount}
                    icon={Clock}
                    colorClass="text-purple"
                    bgClass="bg-purple-light"
                />
            </div>

            <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <div className="card">
                    <div className="flex-between mb-4">
                        <h3 className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                            <Activity className="text-emerald" size={20} />
                            Transactions Récentes
                        </h3>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '30%' }}>Médicament</th>
                                    <th style={{ width: '15%' }}>Type</th>
                                    <th style={{ width: '10%' }}>Qté</th>
                                    <th style={{ width: '20%' }}>Date</th>
                                    <th style={{ width: '25%' }}>Détails</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Aucune transaction récente</td>
                                    </tr>
                                ) : (
                                    recentTransactions.map(t => (
                                        <tr key={t.id}>
                                            <td className="font-medium" style={{ color: 'white' }}>{t.medName}</td>
                                            <td>
                                                <span className={`badge ${t.type === 'IN' ? 'bg-emerald-light' : 'bg-blue-light'}`}>
                                                    {t.type === 'IN' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                                    {t.type === 'IN' ? 'ENTRÉE' : 'SORTIE'}
                                                </span>
                                            </td>
                                            <td style={{ fontFamily: 'monospace' }}>{t.quantity}</td>
                                            <td className="text-sm">
                                                {format(new Date(t.date), 'dd MMM HH:mm', { locale: fr })}
                                            </td>
                                            <td className="text-xs" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {t.type === 'IN'
                                                    ? `Exp: ${t.details?.expiryDate || 'N/A'}`
                                                    : `${t.details?.patientInitials || '?'} - ${t.details?.intervention || '?'}`
                                                }
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(145deg, var(--bg-secondary), var(--bg-primary))' }}>
                    <h3 className="mb-4">État du Système</h3>
                    <div className="flex-col gap-4">
                        <div className="flex-between" style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                            <span className="text-sm">Dernière synchro</span>
                            <span className="text-emerald text-sm" style={{ fontFamily: 'monospace' }}>Local Storage OK</span>
                        </div>
                        {medications.some(m => m.isNarcotic && m.stock < 5) && (
                            <div className="bg-red-light" style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <h4 className="font-bold text-red mb-1 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                    <AlertTriangle size={16} /> Attention Stupéfiants
                                </h4>
                                <p className="text-xs text-red" style={{ opacity: 0.8 }}>Certains stupéfiants ont un stock critique. Vérifiez le coffre.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
