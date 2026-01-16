import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, FileText, AlertTriangle, CheckCircle, Search, Clock, Plus, ArrowLeft, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    const [auditData, setAuditData] = useState([]); // Snapshot state for new audit
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
        try {
            const { data, error } = await supabase
                .from('audits')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setAuditHistory(data);
        } catch (error) {
            console.error("Error fetching audit history:", error);
        }
    };

    const fetchAuditDetails = async (auditId) => {
        const { data: audit, error: auditErr } = await supabase.from('audits').select('*').eq('id', auditId).single();
        const { data: items, error: itemsErr } = await supabase.from('audit_items').select('*').eq('audit_id', auditId);

        if (audit && items) {
            setSelectedAudit({ ...audit, items });
            setViewMode('details');
        }
    };

    const startNewAudit = async () => {
        // Get last audit date for calculating expected empty vials
        let lastAuditDate = null;
        try {
            const { data: lastAudit } = await supabase
                .from('audits')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (lastAudit) {
                lastAuditDate = lastAudit.created_at;
            }
        } catch (error) {
            // No previous audit, use last 30 days as default
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            lastAuditDate = thirtyDaysAgo.toISOString();
        }

        // For each medication, calculate expected empty vials if narcotic
        const initialData = await Promise.all(
            medications.map(async (med) => {
                let expectedEmptyVials = null;

                if (med.isNarcotic && lastAuditDate) {
                    // Calculate expected vials = sum of OUT quantities since last audit
                    const { data: outTransactions } = await supabase
                        .from('transactions')
                        .select('quantity')
                        .eq('medId', med.id)
                        .eq('type', 'OUT')
                        .gte('created_at', lastAuditDate);

                    if (outTransactions && outTransactions.length > 0) {
                        expectedEmptyVials = outTransactions.reduce(
                            (sum, t) => sum + (parseInt(t.quantity) || 0),
                            0
                        );
                    } else {
                        expectedEmptyVials = 0; // No usage since last audit
                    }
                }

                return {
                    ...med,
                    physicalStock: med.stock, // Default to system stock
                    gap: 0,
                    comment: '',
                    // Empty vial tracking for narcotics
                    expectedEmptyVials: expectedEmptyVials,
                    physicalEmptyVials: med.isNarcotic ? null : null, // Will be filled by user
                    emptyVialsComment: ''
                };
            })
        );

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

    const handleEmptyVialsChange = (id, value) => {
        // Distinguish between empty field (null) and zero entered (0)
        const physical = value === '' || value === null || value === undefined ? null : parseInt(value);
        setAuditData(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    physicalEmptyVials: physical
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

            // Save to DB
            const auditId = await saveAudit(auditData, summary);

            // Fetch the saved audit to display details
            await fetchAuditDetails(auditId);

            // Auto-Generate PDF
            generatePDF(auditData, {
                ...summary,
                date: new Date().toISOString(),
                auditor: user.name || 'Moi'
            }, true);

        } catch (error) {
            console.error(error);
            alert("Erreur lors de la sauvegarde: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const generatePDF = (items, meta, isNew = false) => {
        const doc = new jsPDF();
        const dateStr = format(new Date(meta.date || new Date()), 'dd/MM/yyyy HH:mm');

        // === PROFESSIONAL HEADER WITH HOSPITAL BRANDING ===

        // Header Background
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 50, 'F');

        // Hospital Logo (left side)
        // Load logo from public folder
        const logoImg = new Image();
        logoImg.src = '/logo.jpg';

        try {
            // Add logo image (20x20mm square at position 10, 15)
            doc.addImage(logoImg, 'JPEG', 10, 15, 20, 20);
        } catch (error) {
            // Fallback: Draw a purple circle with cross if image fails
            doc.setFillColor(168, 85, 247);
            doc.circle(20, 25, 8, 'F');
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text('+', 20, 27, { align: 'center' });
        }

        // Hospital Name and Title (center/right)
        doc.setFontSize(11);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('HÔPITAL BRAUN CINKASSÉ', 38, 18);

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("RAPPORT D'AUDIT", 38, 30);

        // Subtitle - Generated date
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Généré le ${dateStr}`, 38, 38);

        // Meta Info Section
        doc.setTextColor(0);
        doc.setFontSize(11);
        doc.text(`Auditeur: ${meta.auditor || 'Utilisateur'}`, 14, 60);
        doc.text(`Statut: ${messageStatus(meta.discrepancyCount)}`, 14, 66);

        // Stats Box
        doc.setDrawColor(200);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(140, 55, 56, 20, 3, 3, 'FD');
        doc.setFontSize(10);
        doc.text(`Total Références: ${meta.totalItems || items.length}`, 145, 62);

        if (meta.discrepancyCount > 0) {
            doc.setTextColor(239, 68, 68);
            doc.text(`Écarts: ${meta.discrepancyCount}`, 145, 69);
        } else {
            doc.setTextColor(16, 185, 129);
            doc.text(`Écarts: 0 (Parfait)`, 145, 69);
        }
        doc.setTextColor(0);

        // Table Data Prep
        const tableColumn = ["Médicament", "Système", "Physique", "Écart", "Commentaire"];
        const tableRows = items.map(item => [
            item.name || item.med_name,
            item.stock !== undefined ? item.stock : item.theoretical_stock,
            item.physicalStock !== undefined ? item.physicalStock : item.physical_stock,
            (item.gap > 0 ? '+' : '') + item.gap,
            item.comment || ''
        ]);

        // AutoTable Generation
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 80,
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

        // === SECTION AMPOULES VIDES (STUPÉFIANTS) ===
        // CRITICAL: Show ALL narcotics for regulatory compliance, regardless of data entry
        console.log("DEBUG PDF: Total items:", items.length);
        console.log("DEBUG PDF: Sample item:", items[0]);
        const narcoticItems = items.filter(item => item.is_narcotic === true);
        console.log("DEBUG PDF: Narcotic items found:", narcoticItems.length, narcoticItems);

        if (narcoticItems.length > 0) {
            const currentY = doc.lastAutoTable.finalY + 15;

            // Section Header
            doc.setFillColor(168, 85, 247); // Purple for narcotics
            doc.rect(14, currentY, 182, 8, 'F');
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.text('VERIFICATION AMPOULES VIDES (STUPEFIANTS)', 16, currentY + 5.5);

            // Narcotic vials table
            const vialsColumn = ["Stupefiant", "Attendues", "Comptees", "Ecart", "Observation"];
            const vialsRows = narcoticItems.map(item => {
                const expected = item.expectedEmptyVials ?? item.expected_empty_vials ?? 0;
                const physical = item.physicalEmptyVials ?? item.physical_empty_vials;

                // Handle missing data
                const displayPhysical = (physical !== null && physical !== undefined) ? physical.toString() : 'N/A';
                const gap = (physical !== null && physical !== undefined) ? (physical - expected) : null;
                const displayGap = gap !== null ? ((gap > 0 ? '+' : '') + gap) : '-';
                const status = gap === null ? 'NON RENSEIGNE' : (gap !== 0 ? 'ECART DETECTE' : 'CONFORME');

                return [
                    item.name || item.med_name,
                    expected.toString(),
                    displayPhysical,
                    displayGap,
                    status
                ];
            });

            autoTable(doc, {
                head: [vialsColumn],
                body: vialsRows,
                startY: currentY + 10,
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [147, 51, 234], textColor: 255 }, // Purple-700
                alternateRowStyles: { fillColor: [250, 245, 255] }, // Purple-50
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 3) {
                        const val = parseInt(data.cell.raw);
                        if (val !== 0) {
                            data.cell.styles.textColor = [220, 38, 38]; // Red for discrepancy
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [22, 163, 74]; // Green for OK
                        }
                    }
                    // Highlight "Observation" column if discrepancy
                    if (data.section === 'body' && data.column.index === 4) {
                        if (data.cell.raw.includes('⚠️')) {
                            data.cell.styles.textColor = [217, 119, 6]; // Amber
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [22, 163, 74]; // Green
                        }
                    }
                }
            });

            // Compliance note
            const noteY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Note: Les ampoules vides de stupéfiants doivent être conservées et comptabilisées conformément à la réglementation.', 14, noteY);
        }

        // Signatures
        // Access finalY via doc.lastAutoTable.finalY
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
        <div className="animate-enter" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="flex-between">
                <div>
                    <h2 className="logo-text" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ClipboardList style={{ color: 'var(--text-secondary)' }} />
                        Contrôle & Audit
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestion et historique des inventaires</p>
                </div>
                {isPharmacist && (
                    <button
                        onClick={startNewAudit}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    >
                        <Plus size={20} /> Nouvel Audit
                    </button>
                )}
            </div>

            {/* History List */}
            <div className="card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                    <Clock style={{ color: '#a855f7' }} size={20} />
                    Historique des Contrôles
                </h3>

                {auditHistory.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Aucun audit enregistré pour le moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {auditHistory.map(audit => (
                            <div
                                key={audit.id}
                                onClick={() => fetchAuditDetails(audit.id)}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        padding: '0.75rem',
                                        borderRadius: '50%',
                                        backgroundColor: audit.discrepancy_count === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        color: audit.discrepancy_count === 0 ? 'var(--accent-secondary)' : 'var(--accent-warning)'
                                    }}>
                                        {audit.discrepancy_count === 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                    </div>
                                    <div>
                                        <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                                            Audit du {format(new Date(audit.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                                        </h4>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            {audit.total_items} articles contrôlés • {audit.discrepancy_count} écart(s)
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                                        Voir Détails
                                    </span>
                                    <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderNewAudit = () => (
        <div className="animate-enter" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex-between">
                <button onClick={() => setViewMode('dashboard')} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Retour
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handleSaveAudit}
                        disabled={isSaving}
                        className="btn btn-success"
                        style={{ boxShadow: '0 4px 14px 0 rgba(72,187,120,0.39)' }}
                    >
                        {isSaving ? "Enregistrement..." : "Terminer & Valider"}
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Nouvel Audit en cours</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Saisissez les quantités physiques constatées.</p>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Filtrer..."
                            className="input-field"
                            style={{ paddingLeft: '2.5rem', width: '250px' }}
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                                <th style={{ paddingBottom: '1rem', paddingLeft: '0.5rem' }}>Médicament</th>
                                <th style={{ paddingBottom: '1rem', textAlign: 'center' }}>Théorique</th>
                                <th style={{ paddingBottom: '1rem', textAlign: 'center', width: '150px' }}>Physique</th>
                                <th style={{ paddingBottom: '1rem', textAlign: 'center' }}>Écart</th>
                                <th style={{ paddingBottom: '1rem', width: '30%' }}>Commentaire</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAuditData.map(item => (
                                <React.Fragment key={item.id}>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{item.name}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.stock}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                className="input-field"
                                                style={{
                                                    textAlign: 'center', fontWeight: 'bold',
                                                    background: 'rgba(15, 23, 42, 0.5)',
                                                    borderColor: 'rgba(255,255,255,0.1)',
                                                    width: '100px',
                                                    margin: '0 auto'
                                                }}
                                                value={item.physicalStock}
                                                onChange={(e) => handleStockChange(item.id, e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                min="0"
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                            <span style={{ color: item.gap === 0 ? 'var(--accent-secondary)' : 'var(--accent-warning)' }}>
                                                {item.gap > 0 ? `+${item.gap}` : item.gap}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 0' }}>
                                            <input
                                                type="text"
                                                className="input-field"
                                                style={{
                                                    fontSize: '0.85rem',
                                                    padding: '0.4rem',
                                                    background: 'transparent',
                                                    border: '1px solid transparent'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                                                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                                                placeholder="..."
                                                value={item.comment}
                                                onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                    {/* Empty Vial Row for Narcotics */}
                                    {item.isNarcotic && (
                                        <tr key={`${item.id}-vials`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(168, 85, 247, 0.05)' }}>
                                            <td colSpan="2" style={{ padding: '0.5rem 0.5rem 0.5rem 2rem', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                                                💊 Ampoules Vides (Stupéfiant)
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                                                <input
                                                    type="number"
                                                    className="input-field"
                                                    style={{
                                                        textAlign: 'center',
                                                        fontSize: '0.85rem',
                                                        background: 'rgba(168, 85, 247, 0.1)',
                                                        borderColor: 'rgba(168, 85, 247, 0.3)',
                                                        width: '80px',
                                                        margin: '0 auto',
                                                        padding: '0.3rem'
                                                    }}
                                                    value={item.physicalEmptyVials ?? ''}
                                                    onChange={(e) => handleEmptyVialsChange(item.id, e.target.value)}
                                                    placeholder="Comptées"
                                                    min="0"
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                -
                                            </td>
                                            <td style={{ padding: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                                Ampoules vidées conservées pour contrôle
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderDetails = () => (
        <div className="animate-enter" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex-between">
                <button onClick={() => setViewMode('dashboard')} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Retour Dashboard
                </button>
                <button
                    onClick={() => generatePDF(selectedAudit.items, {
                        date: selectedAudit.created_at,
                        auditor: 'Utilisateur',
                        totalItems: selectedAudit.total_items,
                        discrepancyCount: selectedAudit.discrepancy_count
                    })}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <FileText size={20} /> Télécharger PDF
                </button>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--accent-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-secondary)' }}>
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Rapport d'Audit #{selectedAudit?.id?.slice(0, 8)}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Validé le {format(new Date(selectedAudit?.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '2rem', textAlign: 'center' }}>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Items</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedAudit?.total_items}</p>
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Écarts</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: selectedAudit?.discrepancy_count > 0 ? 'var(--accent-warning)' : 'var(--accent-secondary)' }}>
                                {selectedAudit?.discrepancy_count}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                            <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                                <th style={{ paddingBottom: '1rem', paddingLeft: '0.5rem' }}>Médicament</th>
                                <th style={{ paddingBottom: '1rem', textAlign: 'center' }}>Théorique</th>
                                <th style={{ paddingBottom: '1rem', textAlign: 'center' }}>Physique</th>
                                <th style={{ paddingBottom: '1rem', textAlign: 'center' }}>Écart</th>
                                <th style={{ paddingBottom: '1rem' }}>Commentaire</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedAudit?.items?.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{item.med_name}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.theoretical_stock}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.physical_stock}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: item.gap !== 0 ? 'var(--accent-warning)' : 'var(--accent-secondary)' }}>
                                        {item.gap > 0 ? '+' : ''}{item.gap}
                                    </td>
                                    <td style={{ padding: '0.75rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        {item.comment || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* === EMPTY VIALS SECTION FOR NARCOTICS === */}
                {/* CRITICAL: Show ALL narcotics for regulatory compliance */}
                {selectedAudit?.items?.some(item => item.is_narcotic === true) && (
                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid rgba(168, 85, 247, 0.2)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            💊 Vérification Ampoules Vides (Stupéfiants)
                        </h3>
                        <div className="table-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', background: 'rgba(168, 85, 247, 0.1)' }}>
                                        <th style={{ paddingBottom: '1rem', paddingLeft: '0.5rem', paddingTop: '0.5rem' }}>Stupéfiant</th>
                                        <th style={{ paddingBottom: '1rem', textAlign: 'center', paddingTop: '0.5rem' }}>Attendues</th>
                                        <th style={{ paddingBottom: '1rem', textAlign: 'center', paddingTop: '0.5rem' }}>Comptées</th>
                                        <th style={{ paddingBottom: '1rem', textAlign: 'center', paddingTop: '0.5rem' }}>Écart</th>
                                        <th style={{ paddingBottom: '1rem', paddingLeft: '0.5rem', paddingTop: '0.5rem' }}>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedAudit?.items?.filter(item => item.is_narcotic === true).map(item => {
                                        const expected = item.expected_empty_vials ?? 0;
                                        const physical = item.physical_empty_vials;

                                        // Handle missing data
                                        const displayPhysical = (physical !== null && physical !== undefined) ? physical : 'N/A';
                                        const gap = (physical !== null && physical !== undefined) ? (physical - expected) : null;
                                        const hasData = physical !== null && physical !== undefined;

                                        return (
                                            <tr key={`vials-${item.id}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{item.med_name}</td>
                                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{expected}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{displayPhysical}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: gap !== 0 ? 'var(--accent-warning)' : 'var(--accent-secondary)' }}>
                                                    {hasData ? (gap > 0 ? '+' : '') + gap : '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.9rem', color: gap !== 0 ? 'var(--accent-warning)' : 'var(--accent-secondary)', fontWeight: '500' }}>
                                                    {hasData ? (gap !== 0 ? '⚠️ Écart détecté' : '✓ Conforme') : 'Non renseigné'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Note: Les ampoules vides de stupéfiants doivent être conservées et comptabilisées conformément à la réglementation.
                        </p>
                    </div>
                )}
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
