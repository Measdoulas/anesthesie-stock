import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { subDays, isAfter, parseISO, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PieChart as PieIcon, BarChart3, Filter, Activity, TrendingUp } from 'lucide-react';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57', '#8dd1e1'];

const SimpleTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="card" style={{ padding: '0.5rem', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}>
                <p className="font-bold">{label}</p>
                <p className="text-emerald">{`${payload[0].value} Unités`}</p>
            </div>
        );
    }
    return null;
};

const Statistics = () => {
    const { transactions } = useInventory();
    const [timeFilter, setTimeFilter] = useState('30'); // days

    // Filter Transactions
    const filteredTransactions = useMemo(() => {
        const limitDate = subDays(new Date(), parseInt(timeFilter));
        return transactions.filter(t =>
            t.type === 'OUT' && isAfter(parseISO(t.date), limitDate)
        );
    }, [transactions, timeFilter]);

    // Data for Bar Chart: Top Consumed Medications
    const consumptionData = useMemo(() => {
        const summary = {};
        filteredTransactions.forEach(t => {
            summary[t.medName] = (summary[t.medName] || 0) + t.quantity;
        });
        return Object.keys(summary).map(key => ({
            name: key,
            value: summary[key]
        })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [filteredTransactions]);

    // Data for Pie Chart: Intervention Types
    const interventionData = useMemo(() => {
        const summary = {};
        filteredTransactions.forEach(t => {
            const type = t.details?.intervention || 'Autre';
            summary[type] = (summary[type] || 0) + 1;
        });
        return Object.keys(summary).map(key => ({
            name: key,
            value: summary[key]
        }));
    }, [filteredTransactions]);

    // Data for Line Chart: Temporal Evolution
    const evolutionData = useMemo(() => {
        if (filteredTransactions.length === 0) return [];

        const today = new Date();
        const startDate = subDays(today, parseInt(timeFilter));

        // Create map of days with 0 initial value
        const daysMap = {};
        try {
            eachDayOfInterval({ start: startDate, end: today }).forEach(day => {
                daysMap[format(day, 'yyyy-MM-dd')] = 0;
            });
        } catch (e) { /* prevent crash on invalid interval */ }

        // Fill with data
        filteredTransactions.forEach(t => {
            const dayKey = format(parseISO(t.date), 'yyyy-MM-dd');
            if (daysMap[dayKey] !== undefined) {
                daysMap[dayKey] += t.quantity;
            }
        });

        return Object.keys(daysMap).map(date => ({
            date: format(parseISO(date), 'dd MMM', { locale: fr }),
            value: daysMap[date]
        }));
    }, [filteredTransactions, timeFilter]);

    // Overall Stats
    const totalUnits = filteredTransactions.reduce((acc, t) => acc + t.quantity, 0);
    const totalInterventions = filteredTransactions.length;

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex-between">
                <h2 style={{ fontSize: '1.8rem' }}>Rapports et Statistiques</h2>

                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Filter size={16} style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }} />
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        style={{
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            padding: '0.5rem',
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="7">7 derniers jours</option>
                        <option value="30">30 derniers jours</option>
                        <option value="90">3 mois</option>
                    </select>
                </div>
            </div>

            <div className="grid-2">
                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))', borderColor: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p className="font-medium mb-1">Unités Consommées</p>
                        <h3 className="text-blue" style={{ fontSize: '2.5rem' }}>{totalUnits}</h3>
                    </div>
                    <Activity size={48} style={{ color: 'rgba(99, 102, 241, 0.3)' }} />
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(20, 184, 166, 0.1))', borderColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p className="font-medium mb-1">Interventions Totales</p>
                        <h3 className="text-emerald" style={{ fontSize: '2.5rem' }}>{totalInterventions}</h3>
                    </div>
                    <TrendingUp size={48} style={{ color: 'rgba(16, 185, 129, 0.3)' }} />
                </div>
            </div>

            {consumptionData.length === 0 ? (
                <div className="card text-center" style={{ padding: '4rem', borderStyle: 'dashed' }}>
                    <BarChart3 size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>Aucune donnée disponible pour cette période.</p>
                    <p className="text-xs mt-2">Enregistrez des sorties de stock pour voir apparaître les statistiques.</p>
                </div>
            ) : (
                <>
                    {/* Line Chart */}
                    <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                        <h3 className="mb-6 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                            <Activity size={20} className="text-emerald" />
                            Évolution de la Consommation
                        </h3>
                        <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={evolutionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <Tooltip content={<SimpleTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid-2">
                        {/* Bar Chart */}
                        <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                            <h3 className="mb-6 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                <BarChart3 size={20} className="text-blue" />
                                Top Médicaments Utilises
                            </h3>
                            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={consumptionData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                        <YAxis type="category" dataKey="name" width={100} stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1' }} />
                                        <Tooltip content={<SimpleTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                            <h3 className="mb-6 flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                <PieIcon size={20} className="text-purple" />
                                Par Intervention
                            </h3>
                            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={interventionData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                            paddingAngle={5}
                                        >
                                            {interventionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem' }}>
                                {interventionData.map((entry, index) => (
                                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                                        <span>{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Statistics;
