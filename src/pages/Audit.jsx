import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, FileText, AlertTriangle, CheckCircle, Search, Clock, Plus, ArrowLeft, ChevronRight, Calculator } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../supabaseClient';

const Audit = () => {
    const { medications, saveAudit } = useInventory();
    const { user } = useAuth();

    // View Mode: 'dashboard', 'new', 'details'
    const [viewMode, setViewMode] = useState('dashboard');
    const [auditHistory, setAuditHistory] = useState([]);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [auditData, setAuditData] = useState([]);
    const [filter, setFilter] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isPharmacist = user?.role === 'PHARMACIEN';

    // Fetch History on Mount
    useEffect(() => {
        if (viewMode === 'dashboard') {
            fetchHistory();
        }
    }, [viewMode]);

    const fetchHistory = async () => {
        const { data, error } = await supabase
            .from('audits')
            .select('*, profiles(full_name)') // join profiles if possible or just use user_id
            .order('created_at', { ascending: false });
        if (data) setAuditHistory(data);
    };

    const fetchAuditDetails = async (auditId) => {
        const { data: audit, error: auditErr } = await supabase.from('audits').select('*').eq('id', auditId).single();
        const { data: items, error: itemsErr } = await supabase.from('audit_items').select('*').eq('audit_id', auditId);

        if (audit && items) {
            setSelectedAudit({ ...audit, items });
            setViewMode('details');
        }
    };

    const startNewAudit = () => {
        // Init snapshot
        const initialData = medications.map(med => ({
            ...med,
            physicalStock: med.stock, // Default to system stock
            gap: 0,
            comment: ''
        }));
        setAuditData(initialData);
        setViewMode('new');
    };

    const handleStockChange = (id, value) => {
        const physical = parseInt(value) || 0;
        setAuditData(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    physicalStock: physical,
                    gap: physical - item.stock
                };
            }
            return item;
        }));
    };

    const handleCommentChange = (id, value) => {
        setAuditData(prev => prev.map(item =>
            item.id === id ? { ...item, comment: value } : item
        ));
    };

    const handleSaveAudit = async () => {
        if (!window.confirm("Confirmer la validation de l'inventaire ?\nCela enregistrera le rapport officiellement.")) return;

        setIsSaving(true);
        try {
            const discrepancies = auditData.filter(i => i.gap !== 0).length;
            const summary = {
                totalItems: auditData.length,
                discrepancyCount: discrepancies
            };

            const auditId = await saveAudit(auditData, summary);
            await fetchAuditDetails(auditId); // Switch to details view
            generatePDF(auditData, { ...summary, date: new Date().toISOString(), auditor: user.name || 'Moi' }, true);
        } catch (error) {
            alert("Erreur lors de la sauvegarde: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const generatePDF = (items, meta, isNew = false) => {
        const doc = new jsPDF();
        const dateStr = format(new Date(meta.date || new Date()), 'dd/MM/yyyy HH:mm');

        // Brand / Header
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 40, 'F');

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("RAPPORT D'INVENTAIRE", 105, 18, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Généré le: ${dateStr}`, 105, 28, { align: "center" });

        // Meta Info
        doc.setTextColor(0);
        doc.setFontSize(11);
        doc.text(`Auditeur: ${meta.auditor || 'Utilisateur'}`, 14, 50);
        doc.text(`Statut: ${messageStatus(meta.discrepancyCount)}`, 14, 56);

        // Stats Box
        doc.setDrawColor(200);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(140, 45, 56, 20, 3, 3, 'FD');
        doc.setFontSize(10);
        doc.text(`Total Références: ${meta.totalItems || items.length}`, 145, 52);

        if (meta.discrepancyCount > 0) {
            doc.setTextColor(239, 68, 68);
            doc.text(`Écarts: ${meta.discrepancyCount}`, 145, 59);
        } else {
            doc.setTextColor(16, 185, 129);
            doc.text(`Écarts: 0 (Parfait)`, 145, 59);
        }
        doc.setTextColor(0);

        // Table
        const tableColumn = ["Médicament", "Système", "Physique", "Écart", "Commentaire"];
        const tableRows = items.map(item => [
            item.name || item.med_name,
            item.stock !== undefined ? item.stock : item.theoretical_stock,
            item.physicalStock !== undefined ? item.physicalStock : item.physical_stock,
            (item.gap > 0 ? '+' : '') + item.gap,
            item.comment || ''
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 70,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [71, 85, 105], textColor: 255 },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 3) {
                    const val = parseInt(data.cell.raw);
                    if (val !== 0) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [22, 163, 74];
                    }
                }
            }
        });

        // Signatures
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setDrawColor(100);
        doc.setLineWidth(0.5);

        doc.line(20, finalY, 80, finalY);
        doc.text("Signature Pharmacien", 20, finalY + 5);

        doc.line(130, finalY, 190, finalY);
        doc.text("Signature Anesthésiste", 130, finalY + 5);

        doc.save(`audit_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    };

    const messageStatus = (count) => count === 0 ? "CONFORME" : "NON-CONFORME";

    const filteredAuditData = auditData.filter(item =>
        item.name.toLowerCase().includes(filter.toLowerCase())
    );

    // --- RENDERERS ---

    const renderDashboard = () => (
        <div className="animate-enter max-w-5xl mx-auto space-y-8">
            <div className="flex-between">
                <div>
                    <h2 className="logo-text text-3xl mb-2 flex items-center gap-3">
                        <ClipboardList className="text-secondary" />
                        Contrôle & Audit
                    </h2>
                    <p className="text-secondary">Gestion et historique des inventaires</p>
                </div>
                {isPharmacist && (
                    <button onClick={startNewAudit} className="btn btn-primary shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform">
                        <Plus size={20} /> Nouvel Audit
                    </button>
                )}
            </div>

            {/* History List */}
            <div className="card">
                <h3 className="mb-6 flex items-center gap-2 text-lg">
                    <Clock className="text-purple" size={20} />
                    Historique des Contrôles
                </h3>

                {auditHistory.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700/50 rounded-lg">
                        <p className="text-secondary">Aucun audit enregistré.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {auditHistory.map(audit => (
                            <div
                                key={audit.id}
                                onClick={() => fetchAuditDetails(audit.id)}
                                className="group flex-between p-4 bg-slate-800/30 rounded-xl border border-white/5 hover:border-purple/30 hover:bg-slate-800 transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${audit.discrepancy_count === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {audit.discrepancy_count === 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">Audit du {format(new Date(audit.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</h4>
                                        <p className="text-sm text-secondary">
                                            {audit.total_items} articles contrôlés • {audit.discrepancy_count} écart(s)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/5 text-secondary group-hover:bg-purple/20 group-hover:text-purple transition-colors">
                                        Voir Détails
                                    </span>
                                    <ChevronRight size={16} className="text-secondary group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderNewAudit = () => (
        <div className="animate-enter max-w-6xl mx-auto space-y-6">
            <div className="flex-between">
                <button onClick={() => setViewMode('dashboard')} className="btn btn-ghost flex items-center gap-2 text-secondary hover:text-white">
                    <ArrowLeft size={20} /> Retour
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handleSaveAudit}
                        disabled={isSaving}
                        className="btn btn-success shadow-lg shadow-emerald-500/20"
                    >
                        {isSaving ? "Enregistrement..." : "Terminer & Valider"}
                    </button>
                </div>
            </div>

            <div className="card p-6 border-l-4 border-blue-500">
                <div className="flex-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Nouvel Audit en cours</h2>
                        <p className="text-secondary">Saisissez les quantités physiques constatées.</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                        <input
                            type="text"
                            placeholder="Filtrer..."
                            className="input-field pl-10 w-64"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-secondary border-b border-white/10">
                                <th className="pb-3 pl-2">Médicament</th>
                                <th className="pb-3 text-center">Théorique</th>
                                <th className="pb-3 text-center w-32">Physique</th>
                                <th className="pb-3 text-center">Écart</th>
                                <th className="pb-3 w-1/3">Commentaire</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAuditData.map(item => (
                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="py-3 pl-2 font-medium">{item.name}</td>
                                    <td className="py-3 text-center text-secondary">{item.stock}</td>
                                    <td className="py-3 text-center">
                                        <input
                                            type="number"
                                            className="input-field py-1 text-center font-bold text-white bg-slate-900 border-slate-700 focus:border-blue-500"
                                            value={item.physicalStock}
                                            onChange={(e) => handleStockChange(item.id, e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            min="0"
                                        />
                                    </td>
                                    <td className="py-3 text-center font-bold">
                                        <span className={item.gap === 0 ? 'text-emerald-500' : 'text-red-500'}>
                                            {item.gap > 0 ? `+${item.gap}` : item.gap}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <input
                                            type="text"
                                            className="input-field py-1 text-sm bg-transparent border-transparent hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900 transition-all"
                                            placeholder="..."
                                            value={item.comment}
                                            onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderDetails = () => (
        <div className="animate-enter max-w-5xl mx-auto space-y-6">
            <div className="flex-between">
                <button onClick={() => setViewMode('dashboard')} className="btn btn-ghost flex items-center gap-2">
                    <ArrowLeft size={20} /> Retour Dashboard
                </button>
                <button
                    onClick={() => generatePDF(selectedAudit.items, {
                        date: selectedAudit.created_at,
                        auditor: 'Utilisateur', // or fetch from profile join if available
                        totalItems: selectedAudit.total_items,
                        discrepancyCount: selectedAudit.discrepancy_count
                    })}
                    className="btn btn-primary"
                >
                    <FileText size={20} /> Télécharger PDF
                </button>
            </div>

            <div className="card border-t-4 border-emerald-500">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                    <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400">
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Rapport d'Audit #{selectedAudit?.id?.slice(0, 8)}</h2>
                        <p className="text-secondary">
                            Validé le {format(new Date(selectedAudit?.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </p>
                    </div>
                    <div className="ml-auto flex gap-8 text-center">
                        <div>
                            <p className="text-secondary text-sm uppercase font-bold">Items</p>
                            <p className="text-2xl font-bold">{selectedAudit?.total_items}</p>
                        </div>
                        <div>
                            <p className="text-secondary text-sm uppercase font-bold">Écarts</p>
                            <p className={`text-2xl font-bold ${selectedAudit?.discrepancy_count > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {selectedAudit?.discrepancy_count}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Read Only Table */}
                <div className="table-container max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-slate-800 z-10">
                            <tr className="text-left text-secondary font-medium">
                                <th className="pb-4 pl-2">Médicament</th>
                                <th className="pb-4 text-center">Théorique</th>
                                <th className="pb-4 text-center">Physique</th>
                                <th className="pb-4 text-center">Écart</th>
                                <th className="pb-4">Commentaire</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedAudit?.items?.map(item => (
                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="py-3 pl-2 font-medium">{item.med_name}</td>
                                    <td className="py-3 text-center text-secondary">{item.theoretical_stock}</td>
                                    <td className="py-3 text-center font-bold">{item.physical_stock}</td>
                                    <td className={`py-3 text-center font-bold ${item.gap !== 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {item.gap > 0 ? '+' : ''}{item.gap}
                                    </td>
                                    <td className="py-3 text-sm text-secondary italic">
                                        {item.comment || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4">
            {viewMode === 'dashboard' && renderDashboard()}
            {viewMode === 'new' && renderNewAudit()}
            {viewMode === 'details' && selectedAudit && renderDetails()}
        </div>
    );
};

export default Audit;
