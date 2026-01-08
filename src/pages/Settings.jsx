import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Download, Trash2, AlertTriangle, Database, Save, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const Settings = () => {
    const { medications, transactions, clearData } = useInventory();
    const [importData, setImportData] = useState('');
    const [showImport, setShowImport] = useState(false);

    const handleExport = () => {
        const data = {
            medications,
            transactions,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anesthmed_hbc_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-enter" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h2 className="logo-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Paramètres</h2>
                <p>Gestion des données et configuration de l'application</p>
            </div>

            <div className="card">
                <h3 className="flex-center gap-2 mb-4" style={{ justifyContent: 'flex-start' }}>
                    <Database className="text-blue" size={24} />
                    Sauvegarde des Données
                </h3>
                <p className="mb-4 text-sm" style={{ opacity: 0.8 }}>
                    Téléchargez une copie de toutes vos données (médicaments, stock, historique) au format JSON.
                    Conservez ce fichier précieusement pour restaurer vos données ultérieurement ou pour vos archives.
                </p>
                <button onClick={handleExport} className="btn btn-primary">
                    <Download size={20} /> Exporter les Données
                </button>
            </div>

            <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'linear-gradient(to bottom right, var(--bg-secondary), rgba(239, 68, 68, 0.05))' }}>
                <h3 className="flex-center gap-2 mb-4 text-red" style={{ justifyContent: 'flex-start' }}>
                    <AlertTriangle size={24} />
                    Zone de Danger
                </h3>
                <p className="mb-4 text-sm" style={{ opacity: 0.8 }}>
                    La réinitialisation effacera <strong>définitivement</strong> tous les médicaments, stocks et historiques de transactions de cet appareil.
                    Cette action est irréversible.
                </p>
                <button onClick={clearData} className="btn" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <Trash2 size={20} /> Réinitialiser l'Application
                </button>
            </div>

            <div className="text-center text-xs text-secondary mt-8">
                <p>AnesthMed_ HBC v2.1</p>
                <p style={{ opacity: 0.5 }}>Développé pour la gestion anesthésique sécurisée.</p>
            </div>
        </div>
    );
};

export default Settings;
