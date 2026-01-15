import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, ArrowUpDown, Download } from 'lucide-react';
import { getMonthlyConsumption, getConsumptionTrend, calculateDynamicThresholds, formatTrendIcon } from '../utils/alerts';

const ConsumptionStatsModal = ({ medications, transactions, onClose }) => {
    const [sortBy, setSortBy] = useState('name'); // 'name', 'cmm', 'trend'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

    // Calculate consumption stats for  all medications
    const statsData = medications.map(med => {
        const monthlyData = getMonthlyConsumption(med.id, transactions, 3);
        const trend = getConsumptionTrend(monthlyData);
        const thresholds = calculateDynamicThresholds(med.id, transactions, medications);

        return {
            id: med.id,
            name: med.name,
            isNarcotic: med.isNarcotic,
            cmm: thresholds.cmm || 0,
            trend: trend.trend,
            trendPercentage: trend.percentage,
            thresholds: thresholds,
            isDynamic: thresholds.isDynamic
        };
    });

    // Sort data
    const sortedData = [...statsData].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
            comparison = a.name.localeCompare(b.name);
        } else if (sortBy === 'cmm') {
            comparison = a.cmm - b.cmm;
        } else if (sortBy === 'trend') {
            comparison = a.trendPercentage - b.trendPercentage;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const toggleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const exportToCSV = () => {
        const headers = ['Médicament', 'CMM (amp/mois)', 'Tendance', 'Seuil Critique', 'Seuil Faible', 'Seuil Normal'];
        const rows = sortedData.map(item => [
            item.name,
            item.cmm.toFixed(1),
            `${formatTrendIcon(item.trend)} ${item.trendPercentage}%`,
            item.thresholds.critical,
            item.thresholds.low,
            item.thresholds.normal
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `consommation_moyennes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div className="card animate-enter" style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Header */}
                <div className="flex-between mb-6">
                    <div>
                        <h2 className="logo-text" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                            📊 Consommation Moyenne Mensuelle
                        </h2>
                        <p className="text-sm text-secondary">Basé sur les 3 derniers mois (moyenne pondérée)</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={exportToCSV} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                            <Download size={16} /> Exporter CSV
                        </button>
                        <button onClick={onClose} className="btn" style={{ padding: '0.5rem', backgroundColor: 'transparent' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs uppercase text-secondary border-b border-white/10">
                                <th className="pb-3 pl-2 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                                    <div className="flex items-center gap-1">
                                        Médicament
                                        {sortBy === 'name' && <ArrowUpDown size={12} />}
                                    </div>
                                </th>
                                <th className="pb-3 cursor-pointer hover:text-white" onClick={() => toggleSort('cmm')}>
                                    <div className="flex items-center gap-1">
                                        CMM (amp/mois)
                                        {sortBy === 'cmm' && <ArrowUpDown size={12} />}
                                    </div>
                                </th>
                                <th className="pb-3 cursor-pointer hover:text-white" onClick={() => toggleSort('trend')}>
                                    <div className="flex items-center gap-1">
                                        Tendance
                                        {sortBy === 'trend' && <ArrowUpDown size={12} />}
                                    </div>
                                </th>
                                <th className="pb-3 text-right">Critique</th>
                                <th className="pb-3 text-right">Faible</th>
                                <th className="pb-3 text-right pr-2">Normal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map(item => (
                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="py-3 pl-2 font-medium">
                                        {item.name}
                                        {item.isNarcotic && <span className="ml-2" title="Stupéfiant">💊</span>}
                                    </td>
                                    <td className="py-3 font-mono text-sm">
                                        <span className={item.cmm < 1 ? 'text-amber-400' : ''}>
                                            {item.cmm.toFixed(1)}
                                        </span>
                                        {!item.isDynamic && (
                                            <span className="ml-1 text-xs text-secondary" title="Seuils par défaut (< 90 jours)">*</span>
                                        )}
                                    </td>
                                    <td className="py-3">
                                        <span className={`badge ${item.trend === 'increasing' ? 'bg-amber-500/10 text-amber-500' :
                                                item.trend === 'decreasing' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-slate-500/10 text-slate-400'
                                            }`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                                            {formatTrendIcon(item.trend)} {item.trendPercentage > 0 ? '+' : ''}{item.trendPercentage}%
                                        </span>
                                    </td>
                                    <td className="py-3 text-right font-mono text-red-400">{item.thresholds.critical}</td>
                                    <td className="py-3 text-right font-mono text-amber-400">{item.thresholds.low}</td>
                                    <td className="py-3 text-right pr-2 font-mono text-emerald-400">{item.thresholds.normal}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-white/5 rounded-lg text-xs text-secondary">
                    <h4 className="font-bold mb-2 text-white">Légendes :</h4>
                    <ul className="space-y-1">
                        <li>• <strong>CMM</strong> = Consommation Moyenne Mensuelle (pondérée : mois actuel 50%, mois-1 30%, mois-2 20%)</li>
                        <li>• 💊 = Stupéfiant</li>
                        <li>• <strong>Tendance</strong> : ↗ Hausse | → Stable | ↘ Baisse</li>
                        <li>• <strong>*</strong> = Seuils par défaut (médicament ajouté depuis moins de 90 jours)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ConsumptionStatsModal;
