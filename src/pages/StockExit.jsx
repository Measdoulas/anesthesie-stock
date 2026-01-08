import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { UserMinus, Save, AlertTriangle, User, Activity, Plus, Trash2, ShoppingCart, Clock, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const INTERVENTION_TYPES = [
    'Cardiaque', 'Orthopédie', 'Viscérale', 'Neuro', 'ORL', 'Urologie', 'Gynéco-Obstétrique', 'Pédiatrie', 'Traumatologie', 'Autre'
];

const StockExit = () => {
    const { medications, transactions, removeStockBatch } = useInventory();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Patient Details
    const [patientInitials, setPatientInitials] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [interventionDate, setInterventionDate] = useState(new Date().toISOString().split('T')[0]);
    const [interventionType, setInterventionType] = useState('Autre');

    // Item Selection
    const [selectedMedId, setSelectedMedId] = useState('');
    const [quantity, setQuantity] = useState('');

    // Cart
    const [cart, setCart] = useState([]); // Array of { medId, name, quantity, isNarcotic }

    // UI State
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [expandedExitId, setExpandedExitId] = useState(null);

    const selectedMed = medications.find(m => m.id === selectedMedId);

    // Group transactions by patient/intervention for history
    const exitHistory = useMemo(() => {
        const exits = {};
        transactions.filter(t => t.type === 'OUT').forEach(t => {
            // Create a unique key for grouping (usually timestamp + patient info or just date if batch ID not explicit)
            // Since we didn't add explicit 'exitId' like 'receptionId', we can group by exact timestamp or try to infer.
            // For better grouping, let's group by (date + patientInitials). Ideally we should have added 'exitId' to context too.
            // Assuming transactions done in batch share exact ISO timestamp.
            const groupKey = t.date + (t.details?.patientInitials || '');

            if (!exits[groupKey]) {
                exits[groupKey] = {
                    id: groupKey,
                    date: t.date,
                    patientInitials: t.details?.patientInitials || '?',
                    patientAge: t.details?.patientAge || '?',
                    intervention: t.details?.intervention || 'Inconnue',
                    items: []
                };
            }
            exits[groupKey].items.push(t);
        });
        return Object.values(exits).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20); // Last 20
    }, [transactions]);

    const addToCart = () => {
        if (!selectedMedId || !quantity) return;

        if (cart.some(item => item.medId === selectedMedId)) {
            setErrorMsg("Ce médicament est déjà dans la liste.");
            return;
        }

        setCart([...cart, {
            medId: selectedMedId,
            name: selectedMed.name,
            quantity: parseInt(quantity),
            isNarcotic: selectedMed.isNarcotic
        }]);

        setSelectedMedId('');
        setQuantity('');
        setErrorMsg('');
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
            setErrorMsg("Veuillez ajouter au moins un médicament.");
            return;
        }

        if (!patientInitials || !patientAge) {
            setErrorMsg("Veuillez remplir les informations patient.");
            return;
        }

        try {
            removeStockBatch(cart, {
                patientInitials,
                patientAge,
                interventionDate,
                intervention: interventionType
            });

            setSuccessMsg(`Sortie validée pour ${cart.length} médicaments.`);

            setCart([]);
            setPatientInitials('');
            setPatientAge('');

            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    const toggleExitDetails = (id) => {
        setExpandedExitId(expandedExitId === id ? null : id);
    };

    return (
        <div className="animate-enter" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="text-center">
                <h2 className="logo-text" style={{ fontSize: '2rem', justifyContent: 'center', display: 'flex' }}>
                    Dossier Anesthésie
                </h2>
                <p>Saisie des sorties patients</p>
            </div>

            {successMsg && (
                <div className="bg-blue-light" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Save size={20} />
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="bg-red-light" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertTriangle size={20} />
                    {errorMsg}
                </div>
            )}

            {user?.role === 'ANESTHESISTE' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.5rem', alignItems: 'start' }}>
                    {/* Left Column */}
                    <div className="flex-col gap-6">
                        <div className="card">
                            <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                <User size={18} className="text-blue" />
                                Patient & Intervention
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="text-xs font-bold text-secondary uppercase mb-1 block">Initiales</label>
                                    <input
                                        type="text"
                                        value={patientInitials}
                                        onChange={e => setPatientInitials(e.target.value.toUpperCase())}
                                        className="input-field"
                                        placeholder="EX: JD"
                                        maxLength={4}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary uppercase mb-1 block">Âge</label>
                                    <input
                                        type="number"
                                        value={patientAge}
                                        onChange={e => setPatientAge(e.target.value)}
                                        className="input-field"
                                        placeholder="Ans"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary uppercase mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        value={interventionDate}
                                        onChange={e => setInterventionDate(e.target.value)}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-secondary uppercase mb-1 block">Type</label>
                                    <select
                                        value={interventionType}
                                        onChange={e => setInterventionType(e.target.value)}
                                        className="input-field"
                                    >
                                        {INTERVENTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ borderColor: 'var(--accent-primary)' }}>
                            <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                <Activity size={18} className="text-emerald" />
                                Ajout Médicament
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
                                            <option key={med.id} value={med.id} disabled={med.stock <= 0}>
                                                {med.name} (Dispo: {med.stock})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="text-sm font-medium mb-1 block">Quantité</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedMed ? selectedMed.stock : 999}
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addToCart}
                                        disabled={!selectedMedId || !quantity || (selectedMed && quantity > selectedMed.stock)}
                                        className="btn btn-primary"
                                        style={{ height: '44px' }}
                                    >
                                        <Plus size={20} /> Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h3 className="mb-4 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                            <ShoppingCart size={18} />
                            Panier ({cart.length})
                        </h3>

                        <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', marginBottom: '1rem', minHeight: '200px', overflowY: 'auto' }}>
                            {cart.length === 0 ? (
                                <div className="flex-center flex-col text-secondary" style={{ height: '100%', padding: '2rem', opacity: 0.5 }}>
                                    <ShoppingCart size={32} className="mb-2" />
                                    <p>Aucun article</p>
                                </div>
                            ) : (
                                <div className="flex-col gap-2">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="flex-between" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', borderLeft: item.isNarcotic ? '3px solid var(--accent-danger)' : '3px solid var(--accent-secondary)' }}>
                                            <div>
                                                <div className="font-medium flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                                    {item.name}
                                                    {item.isNarcotic && <AlertTriangle size={12} className="text-red" />}
                                                </div>
                                                <div className="text-xs text-secondary">Qté: {item.quantity}</div>
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

                        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                            <button
                                onClick={handleSubmit}
                                disabled={cart.length === 0 || !patientInitials}
                                className="btn btn-primary w-full"
                                style={{ opacity: (cart.length === 0 || !patientInitials) ? 0.5 : 1 }}
                            >
                                <UserMinus size={20} /> Valider
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card flex-center flex-col py-8 border-dashed border-2 border-slate-700">
                    <AlertTriangle size={48} className="text-secondary mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">Accès Lecture Seule</h3>
                    <p className="text-secondary max-w-md text-center">
                        En tant que Pharmacien, vous pouvez consulter l'historique des sorties mais vous ne pouvez pas saisir de nouvelles interventions.
                    </p>
                </div>
            )}

            {/* History Section */}
            <div className="flex-col gap-4 mt-8">
                <h3 className="flex-center gap-2" style={{ justifyContent: 'flex-start', fontSize: '1.5rem' }}>
                    <FileText size={24} className="text-blue" />
                    Historique des Interventions
                </h3>

                {exitHistory.length === 0 ? (
                    <div className="text-center text-secondary p-8 bg-card rounded-lg border border-dashed border-slate-700">
                        Aucune intervention récente.
                    </div>
                ) : (
                    <div className="flex-col gap-4">
                        {exitHistory.map((exit) => (
                            <div key={exit.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div
                                    className="flex-between p-4 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => toggleExitDetails(exit.id)}
                                    style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-light p-2 rounded-full">
                                            <User size={20} className="text-blue" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">
                                                Patient: {exit.patientInitials} ({exit.patientAge} ans)
                                            </div>
                                            <div className="text-sm text-secondary">
                                                {format(new Date(exit.date), 'dd MMM HH:mm', { locale: fr })} • {exit.intervention}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-secondary">
                                        <span className="text-sm font-medium bg-card px-2 py-1 rounded">
                                            {exit.items.length} produits
                                        </span>
                                        {expandedExitId === exit.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {expandedExitId === exit.id && (
                                    <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <table style={{ marginTop: '1rem' }}>
                                            <tbody>
                                                {exit.items.map(item => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td className="py-2 text-sm">{item.medName}</td>
                                                        <td className="py-2 text-sm text-right font-mono text-red">-{item.quantity}</td>
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

export default StockExit;
