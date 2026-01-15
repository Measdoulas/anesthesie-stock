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
                {/* Stock Total - Keep as StatCard */}
                <StatCard
                    title="Stock Total"
                    value={medications.reduce((acc, m) => acc + (m.stock || 0), 0)}
                    icon={Package}
                    colorClass="text-blue"
                    bgClass="bg-blue-light"
                />

                {/* Stock Faible - Detailed */}
                <div className="card" style={{ padding: '1rem' }}>
                    <div className="flex-center gap-2 mb-3" style={{ justifyContent: 'flex-start' }}>
                        <div className="flex-center bg-amber-light text-amber" style={{ borderRadius: '50%', padding: '0.5rem', width: '40px', height: '40px' }}>
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-medium">Stock Faible</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{lowStockCount}</h4>
                        </div>
                    </div>
                    {lowStockCount > 0 && (
                        <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.75rem' }}>
                            {medications.filter(m => getStockStatus(m.stock) === 'low').map(med => (
                                <div key={med.id} className="flex-between" style={{ padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--text-primary)' }}>{med.name}</span>
                                    <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                        {med.stock} amp
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stock Critique - Detailed */}
                <div className="card" style={{ padding: '1rem' }}>
                    <div className="flex-center gap-2 mb-3" style={{ justifyContent: 'flex-start' }}>
                        <div className="flex-center bg-red-light text-red" style={{ borderRadius: '50%', padding: '0.5rem', width: '40px', height: '40px' }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-medium">Stock Critique</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{criticalStockCount}</h4>
                        </div>
                    </div>
                    {criticalStockCount > 0 && (
                        <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.75rem' }}>
                            {medications.filter(m => getStockStatus(m.stock) === 'critical').map(med => (
                                <div key={med.id} className="flex-between" style={{ padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--text-primary)' }}>{med.name}</span>
                                    <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                        {med.stock} amp
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Péremption Proche - Detailed */}
                <div className="card" style={{ padding: '1rem' }}>
                    <div className="flex-center gap-2 mb-3" style={{ justifyContent: 'flex-start' }}>
                        <div className="flex-center bg-purple-light text-purple" style={{ borderRadius: '50%', padding: '0.5rem', width: '40px', height: '40px' }}>
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-medium">Péremption Proche</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{expiringCount}</h4>
                        </div>
                    </div>
                    {expiringCount > 0 && (
                        <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.75rem' }}>
                            {medications.filter(m => {
                                const status = getExpirationStatus(m.expiry);
                                return status === 'critical' || status === 'warning';
                            }).map(med => (
                                <div key={med.id} className="flex-between" style={{ padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--text-primary)' }}>{med.name}</span>
                                    <span className="badge" style={{
                                        backgroundColor: getExpirationStatus(med.expiry) === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                                        color: getExpirationStatus(med.expiry) === 'critical' ? 'var(--accent-danger)' : 'var(--accent-primary)',
                                        fontSize: '0.7rem',
                                        padding: '0.1rem 0.4rem'
                                    }}>
                                        {med.expiry ? format(new Date(med.expiry), 'dd/MM', { locale: fr }) : 'N/A'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
