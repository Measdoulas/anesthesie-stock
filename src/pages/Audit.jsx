import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, FileText, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

const Audit = () => {
    const { medications } = useInventory();
    const { user } = useAuth();
    const [auditData, setAuditData] = useState([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        // Initialize audit data only if empty to create a snapshot
        if (auditData.length === 0 && medications.length > 0) {
            const initialData = medications.map(med => ({
                ...med,
                physicalStock: med.stock, // Default to system stock
                gap: 0,
                comment: ''
            }));
            setAuditData(initialData);
        }
    }, [medications, auditData.length]);

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

    const generatePDF = () => {
        const doc = new jsPDF();
        const date = format(new Date(), 'dd/MM/yyyy HH:mm');

        // Header
        doc.setFontSize(20);
        doc.text("Rapport d'Inventaire", 14, 22);

        doc.setFontSize(10);
        doc.text(`Date: ${date}`, 14, 30);
        doc.text(`Auditeur: ${user?.name || 'Inconnu'}`, 14, 35);

        // Summary Stats
        const totalItems = auditData.length;
        const discrepancies = auditData.filter(i => i.gap !== 0).length;

        doc.text(`Total Références: ${totalItems}`, 14, 45);
        doc.setTextColor(discrepancies > 0 ? 200 : 0, 0, 0);
        doc.text(`Écarts constatés: ${discrepancies}`, 14, 50);
        doc.setTextColor(0, 0, 0);

        // Table
        const tableColumn = ["Médicament", "Lot", "Système", "Physique", "Écart", "Commentaire"];
        const tableRows = [];

        auditData.forEach(item => {
            const stockData = [
                item.name,
                item.batchNumber || '-',
                item.stock,
                item.physicalStock,
                item.gap > 0 ? `+${item.gap}` : item.gap,
                item.comment
            ];
            tableRows.push(stockData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 55,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }, // Blue
            // Highlight rows with gaps
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 4) {
                    const gapValue = parseInt(data.cell.raw);
                    if (gapValue !== 0) {
                        data.cell.styles.textColor = [255, 0, 0];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        doc.save(`inventaire_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    };

    const filteredData = auditData.filter(item =>
        item.name.toLowerCase().includes(filter.toLowerCase()) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(filter.toLowerCase()))
    );

    const discrepanciesCount = auditData.filter(i => i.gap !== 0).length;

    return (
        <div className="animate-enter max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="logo-text text-3xl mb-2 flex items-center gap-3">
                        <ClipboardList className="text-secondary" /> Contrôle d'Inventaire
                    </h2>
                    <p className="text-secondary">Comparaison Stocks Théoriques vs Physiques</p>
                </div>

                <button
                    onClick={generatePDF}
                    className="btn btn-primary"
                    disabled={auditData.length === 0}
                >
                    <FileText size={20} /> Générer Rapport PDF
                </button>
            </div>

            {/* Filter & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="card flex items-center gap-4 py-4">
                    <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-secondary">Total Références</p>
                        <p className="text-2xl font-bold">{auditData.length}</p>
                    </div>
                </div>

                <div className="card flex items-center gap-4 py-4" style={{ borderColor: discrepanciesCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)' }}>
                    <div className={`p-3 rounded-full ${discrepanciesCount > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-secondary">Écarts Constatés</p>
                        <p className="text-2xl font-bold">{discrepanciesCount}</p>
                    </div>
                </div>

                <div className="card py-4 flex items-center">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
                        <input
                            type="text"
                            className="input-field pl-10 w-full"
                            placeholder="Rechercher médicament..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Audit List */}
            <div className="card overflow-hidden">
                <div className="table-container">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-white/10">
                                <th className="p-4 text-secondary font-medium">Médicament</th>
                                <th className="p-4 text-secondary font-medium">Lot</th>
                                <th className="p-4 text-secondary font-medium text-center">Théorique</th>
                                <th className="p-4 text-secondary font-medium text-center">Physique (Réel)</th>
                                <th className="p-4 text-secondary font-medium text-center">Écart</th>
                                <th className="p-4 text-secondary font-medium">Commentaire</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item) => (
                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium">
                                        {item.name}
                                        {item.isNarcotic && <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Narcotique</span>}
                                    </td>
                                    <td className="p-4 text-sm text-secondary">{item.batchNumber || '-'}</td>
                                    <td className="p-4 text-center font-bold text-gray-400">{item.stock}</td>
                                    <td className="p-4 text-center">
                                        <input
                                            type="number"
                                            className="input-field text-center py-1 mx-auto"
                                            style={{ width: '80px', borderColor: item.gap !== 0 ? 'var(--accent-danger)' : '' }}
                                            value={item.physicalStock}
                                            onChange={(e) => handleStockChange(item.id, e.target.value)}
                                            min="0"
                                        />
                                    </td>
                                    <td className="p-4 text-center font-bold">
                                        <span className={item.gap === 0 ? 'text-emerald-500' : 'text-red-500'}>
                                            {item.gap > 0 ? `+${item.gap}` : item.gap}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            className="input-field py-1 text-sm"
                                            placeholder="Note op..."
                                            value={item.comment}
                                            onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-secondary">Aucun médicament trouvé pour cet audit.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Audit;
