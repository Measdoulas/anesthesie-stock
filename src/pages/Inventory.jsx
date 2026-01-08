import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { getStockStatus, getExpirationStatus, formatStockStatus } from '../utils/alerts';
import { Search, Plus, AlertTriangle, Syringe, Filter, Trash2 } from 'lucide-react';

const Inventory = () => {
    const { medications, addMedication } = useInventory();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // Form State
    const [newMed, setNewMed] = useState({ name: '', stock: 0, isNarcotic: false, expiry: '' });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newMed.name) return;
        addMedication(newMed);
        setShowAddForm(false);
        setNewMed({ name: '', stock: 0, isNarcotic: false, expiry: '' });
    };

    const filteredMeds = medications.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Inventaire</h2>
                    <p>Gérez votre liste de médicaments et consultez les stocks</p>
                </div>
                {user?.role === 'ANESTHESISTE' && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="btn btn-primary"
                    >
                        <Plus size={20} /> Nouveau Médicament
                    </button>
                )}
            </div>

            {showAddForm && (
                <div className="card animate-enter" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                    <h3 className="mb-4">Ajouter un nouveau médicament</h3>
                    <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Nom du Médicament</label>
                            <input
                                type="text"
                                value={newMed.name}
                                onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                                className="input-field"
                                placeholder="Ex: Propofol"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Stock Initial</label>
                            <input
                                type="number"
                                value={newMed.stock}
                                onChange={e => setNewMed({ ...newMed, stock: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)' }}>
                                <input
                                    type="checkbox"
                                    checked={newMed.isNarcotic}
                                    onChange={e => setNewMed({ ...newMed, isNarcotic: e.target.checked })}
                                    style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent-danger)' }}
                                />
                                <span className="font-medium">Classé Stupéfiant</span>
                                {newMed.isNarcotic && <AlertTriangle size={16} className="text-red" />}
                            </label>
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button type="button" onClick={() => setShowAddForm(false)} className="btn" style={{ background: 'transparent', color: 'var(--text-secondary)' }}>Annuler</button>
                            <button type="submit" className="btn btn-success">Créer</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Search className="text-secondary" size={20} style={{ color: 'var(--text-secondary)' }} />
                <input
                    type="text"
                    placeholder="Rechercher un médicament..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{ border: 'none', background: 'transparent', padding: '0.5rem' }}
                />
                <Filter className="text-secondary" size={20} style={{ color: 'var(--text-secondary)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredMeds.length === 0 ? (
                    <div className="text-center" style={{ padding: '3rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}>
                        <Syringe size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                        <p>Aucun médicament trouvé.</p>
                    </div>
                ) : (
                    filteredMeds.map(med => {
                        const stockStatus = getStockStatus(med.stock);
                        const { label, color, badge } = formatStockStatus(stockStatus); // WARNING: These return Tailwind classes (e.g., text-danger). We need to map them or rely on them matching our CSS.
                        // Since we defined .text-danger, .bg-red-500/10 (NO we didn't define exact tailwind opacity classes). 
                        // We need to fix `formatStockStatus` or manually override here.

                        // Let's manually handle colors here for safety or update alerts.js later. I will use helper styles.
                        let statusColor = 'var(--text-secondary)';
                        let statusBg = 'rgba(255,255,255,0.05)';

                        if (stockStatus === 'critical') { statusColor = 'var(--accent-danger)'; statusBg = 'rgba(239, 68, 68, 0.1)'; }
                        else if (stockStatus === 'low') { statusColor = 'var(--accent-warning)'; statusBg = 'rgba(245, 158, 11, 0.1)'; }
                        else if (stockStatus === 'normal') { statusColor = 'var(--accent-secondary)'; statusBg = 'rgba(16, 185, 129, 0.1)'; }

                        return (
                            <div key={med.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: med.isNarcotic ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: med.isNarcotic ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
                                        <Syringe size={24} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <h3 style={{ fontSize: '1.1rem' }}>{med.name}</h3>
                                            {med.isNarcotic && (
                                                <span className="badge" style={{ backgroundColor: 'var(--accent-danger)', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                                    STUPÉFIANT
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs">
                                            Réf: {med.id.slice(0, 8)}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', textAlign: 'right' }}>
                                    <div>
                                        <p className="text-xs font-bold mb-1" style={{ textTransform: 'uppercase' }}>Stock</p>
                                        <span className="badge" style={{ backgroundColor: statusBg, color: statusColor, fontSize: '0.9rem' }}>
                                            {med.stock} Unités
                                        </span>
                                    </div>

                                    <div style={{ minWidth: '100px' }}>
                                        <p className="text-xs font-bold mb-1" style={{ textTransform: 'uppercase' }}>État</p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', color: statusColor }}>
                                            {stockStatus === 'critical' && <AlertTriangle size={14} />}
                                            <span className="font-medium text-sm">{label}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Inventory;
