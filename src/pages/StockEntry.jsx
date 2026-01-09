import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Save, AlertCircle, ShoppingCart, Plus, Trash2, Package, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const StockEntry = () => {
    const { medications, transactions, addStockBatch } = useInventory();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Reception Details
    const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplier, setSupplier] = useState('');

    // Item Selection
    const [selectedMedId, setSelectedMedId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [expiryDate, setExpiryDate] = useState('');

    // Cart
    const [cart, setCart] = useState([]);

    // UI State
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [expandedReceptionId, setExpandedReceptionId] = useState(null);

    const selectedMed = medications.find(m => m.id === selectedMedId);

    // Group transactions by receptionId for history
    const receptionHistory = React.useMemo(() => {
        const receptions = {};
        transactions.filter(t => t.type === 'IN').forEach(t => {
            const recId = t.receptionId || t.date; // Fallback to date if old data
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
        return Object.values(receptions).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions]);

    const addToCart = () => {
        if (!selectedMedId || !quantity || !expiryDate) return;

        setCart([...cart, {
            medId: selectedMedId,
            name: selectedMed.name,
            quantity: parseInt(quantity),
            expiryDate: expiryDate,
            isNarcotic: selectedMed.isNarcotic
        }]);

        setQuantity('');
        setExpiryDate('');
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (cart.length === 0) {
            setErrorMsg("Veuillez ajouter au moins un médicament à la réception.");
            return;
        }

        try {
            const receptionId = addStockBatch(cart, {
                receptionDate,
                supplier
            });

            const recIdStr = String(receptionId);
            setSuccessMsg(`Réception enregistrée avec succès (ID: ${recIdStr.slice(0, 8)})`);
            setCart([]);
            setSupplier('');

            // Clear success msg after 3s
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg("Erreur lors de l'enregistrement: " + err.message);
        }
    };

    const toggleReceptionDetails = (id) => {
        setExpandedReceptionId(expandedReceptionId === id ? null : id);
    };

    return (
        <div className="animate-enter" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="text-center">
                <h2 className="logo-text" style={{ fontSize: '2rem', justifyContent: 'center', display: 'flex' }}>
                    Réception de Commande
                </h2>
                <p>Enregistrement groupé des livraisons</p>
            </div>

            {successMsg && (
                <div className="bg-emerald-light" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Save size={20} />
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="bg-red-light" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertCircle size={20} />
                    {errorMsg}
                </div>
            )}

            {/* Form Section */}
            {medications.length === 0 ? (
                <div className="card text-center" style={{ padding: '2rem', border: '1px solid var(--accent-warning)' }}>
                    <AlertCircle className="text-amber" size={40} style={{ margin: '0 auto 1rem auto' }} />
                    <h3 className="text-amber mb-2">Inventaire Vide</h3>
                    <p className="mb-4">Créez des médicaments avant de saisir du stock.</p>
                    <button onClick={() => navigate('/inventory')} className="btn btn-primary" style={{ margin: '0 auto' }}>Aller à l'Inventaire</button>
                </div>
            ) : (
                user?.role === 'ANESTHESISTE' ? (
                    <div className="grid-responsive">
                        {/* Left: Input */}
                        <div className="flex-col gap-6">
                            <div className="card">
                                <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                    <Package size={18} className="text-blue" />
                                    Détails Commande
                                </h3>
                                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="text-xs font-bold text-secondary uppercase mb-1 block">Date</label>
                                        <input
                                            type="date"
                                            value={receptionDate}
                                            onChange={e => setReceptionDate(e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-secondary uppercase mb-1 block">Réf / Fournisseur</label>
                                        <input
                                            type="text"
                                            value={supplier}
                                            onChange={e => setSupplier(e.target.value)}
                                            className="input-field"
                                            placeholder="Optionnel"
                                        />
                                    </div>
                                </div>

                                <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.05)' }} />

                                <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                    <PlusCircle size={18} className="text-emerald" />
                                    Ajouter Article
                                </h3>

                                <div className="flex-col gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Médicament</label>
                                        <select
                                            value={selectedMedId}
                                            onChange={(e) => setSelectedMedId(e.target.value)}
                                            className="input-field"
                                        >
                                            <option value="">Sélectionner...</option>
                                            {medications.map(med => (
                                                <option key={med.id} value={med.id}>
                                                    {med.name} (Stock: {med.stock})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Quantité</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                className="input-field"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Péremption</label>
                                            <input
                                                type="date"
                                                value={expiryDate}
                                                onChange={(e) => setExpiryDate(e.target.value)}
                                                className="input-field"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addToCart}
                                        disabled={!selectedMedId || !quantity || !expiryDate}
                                        className="btn btn-success"
                                    >
                                        <Plus size={20} /> Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right: Cart */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                <ShoppingCart size={18} />
                                En attente ({cart.length})
                            </h3>

                            <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', marginBottom: '1rem', minHeight: '200px' }}>
                                {cart.length === 0 ? (
                                    <div className="flex-center flex-col text-secondary" style={{ height: '100%', padding: '2rem', opacity: 0.5 }}>
                                        <Package size={32} className="mb-2" />
                                        <p>Panier vide</p>
                                    </div>
                                ) : (
                                    <div className="flex-col gap-2">
                                        {cart.map((item, idx) => (
                                            <div key={idx} className="flex-between" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', borderLeft: item.isNarcotic ? '3px solid var(--accent-danger)' : '3px solid var(--accent-secondary)' }}>
                                                <div>
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-xs text-secondary">Qté: {item.quantity} | Exp: {item.expiryDate}</div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(idx)}
                                                    className="btn"
                                                    style={{ padding: '0.4rem', color: 'var(--text-secondary)' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={cart.length === 0}
                                className="btn btn-primary w-full"
                                style={{ opacity: cart.length === 0 ? 0.5 : 1 }}
                            >
                                <Save size={20} /> Valider Réception
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card flex-center flex-col py-8 border-dashed border-2 border-slate-700">
                        <AlertCircle size={48} className="text-secondary mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2">Accès Lecture Seule</h3>
                        <p className="text-secondary max-w-md text-center">
                            En tant que Pharmacien, vous pouvez consulter l'historique des réceptions.
                            Pour valider de nouvelles entrées, veuillez utiliser l'onglet "Validation".
                        </p>
                    </div>
                )
            )}

            {/* History Section */}
            <div className="flex-col gap-4 mt-8">
                <h3 className="flex-center gap-2" style={{ justifyContent: 'flex-start', fontSize: '1.5rem' }}>
                    <Clock size={24} className="text-purple" />
                    Historique des Réceptions
                </h3>

                {receptionHistory.length === 0 ? (
                    <div className="text-center text-secondary p-8 bg-card rounded-lg border border-dashed border-slate-700">
                        Aucun historique de réception disponible.
                    </div>
                ) : (
                    <div className="flex-col gap-4">
                        {receptionHistory.map((reception) => (
                            <div key={reception.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div
                                    className="flex-between p-4 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => toggleReceptionDetails(reception.id)}
                                    style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-light p-2 rounded-full">
                                            <Package size={20} className="text-purple" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">
                                                {format(new Date(reception.date), 'dd MMMM yyyy', { locale: fr })}
                                            </div>
                                            <div className="text-sm text-secondary">
                                                {reception.items.length} articles • Réf: {reception.supplier || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-secondary">
                                        {expandedReceptionId === reception.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {expandedReceptionId === reception.id && (
                                    <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <table style={{ marginTop: '1rem' }}>
                                            <thead>
                                                <tr>
                                                    <th className="text-left text-xs uppercase text-secondary pb-2">Médicament</th>
                                                    <th className="text-right text-xs uppercase text-secondary pb-2">Qté</th>
                                                    <th className="text-right text-xs uppercase text-secondary pb-2">Péremption</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reception.items.map(item => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td className="py-2 text-sm">{item.medName}</td>
                                                        <td className="py-2 text-sm text-right font-mono text-emerald">{item.quantity}</td>
                                                        <td className="py-2 text-sm text-right text-secondary">
                                                            {item.details?.expiryDate || 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockEntry;
