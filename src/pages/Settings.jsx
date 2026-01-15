import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Download, Trash2, AlertTriangle, Database, User, Lock, Save, CheckCircle, Camera, Settings as SettingsIcon, Bell, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { getStockThresholds, getAlertCoefficients, saveAlertCoefficients } from '../utils/alerts';
import ConsumptionStatsModal from '../components/ConsumptionStatsModal';

const Settings = () => {
    const { medications, transactions, clearData } = useInventory();
    const { user, updateProfile, updatePassword, logout } = useAuth();

    // Profile State
    const [fullName, setFullName] = useState(user?.name || '');
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
    const [profileMsg, setProfileMsg] = useState('');
    const fileInputRef = useRef(null);

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

    // Alert Management State
    const [coefficients, setCoefficients] = useState({ normal: 2, low: 1.5, critical: 1, minAbsolute: 2 });
    const [showConsumptionStats, setShowConsumptionStats] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');

    // Legacy Preferences State (keep for backward compat)
    const [thresholds, setThresholds] = useState({ LOW: 10, CRITICAL: 5 });
    const [prefMsg, setPrefMsg] = useState('');

    useEffect(() => {
        setCoefficients(getAlertCoefficients());
        setThresholds(getStockThresholds());
        if (user) {
            setFullName(user.name);
            setAvatarPreview(user.avatar_url);
        }
    }, [user]);

    // Resizing logic for Avatar
    const resizeImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new window.Image(); // Avoid conflict with Lucide Image
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    // Square crop strategy: take the center square
                    const size = Math.min(width, height);
                    const sx = (width - size) / 2;
                    const sy = (height - size) / 2;

                    canvas.width = MAX_WIDTH;
                    canvas.height = MAX_HEIGHT;

                    const ctx = canvas.getContext('2d');
                    // Draw cropped square center to canvas
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_WIDTH, MAX_HEIGHT);

                    resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compress JPEG 80%
                };
            };
        });
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const resizedBase64 = await resizeImage(file);
            setAvatarPreview(resizedBase64);
        } catch (err) {
            console.error(err);
            alert("Erreur lors du traitement de l'image.");
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await updateProfile({ full_name: fullName, avatar_url: avatarPreview });
            setProfileMsg('Profil mis à jour avec succès !');
            setTimeout(() => setProfileMsg(''), 3000);
        } catch (error) {
            console.error(error);
            setProfileMsg('Erreur lors de la mise à jour.');
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ text: 'Les mots de passe ne correspondent pas.', type: 'error' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ text: 'Le mot de passe doit faire au moins 6 caractères.', type: 'error' });
            return;
        }

        try {
            await updatePassword(newPassword);
            setPasswordMsg({ text: 'Mot de passe modifié !', type: 'success' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            setPasswordMsg({ text: 'Erreur technique (voir console).', type: 'error' });
        }
    };

    const handleSavePreferences = () => {
        localStorage.setItem('stock_thresholds', JSON.stringify(thresholds));
        setPrefMsg('Préférences enregistrées !');
        setTimeout(() => setPrefMsg(''), 3000);
        // Tip: Reload page to propagate changes to sidebar/inventory checks if they don't listen to storage
        // A simple reload is the most robust way for this MVP without complex context listeners for "prefs"
        setTimeout(() => window.location.reload(), 1000);
    };

    const handleSaveCoefficients = () => {
        saveAlertCoefficients(coefficients);
        setAlertMsg('Coefficients enregistrés ! Rechargement...');
        setTimeout(() => window.location.reload(), 1000); // Reload to apply changes
    };

    const handleExport = () => {
        const data = {
            medications,
            transactions,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anesthmed_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-enter" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
            <div className="flex-between">
                <div>
                    <h2 className="logo-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Paramètres</h2>
                    <p>Mon profil et configuration</p>
                </div>
                <button onClick={logout} className="btn btn-ghost text-red hover:bg-red-500/10">
                    Se déconnecter
                </button>
            </div>

            {/* PROFILE SECTION */}
            <div className="card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple"></div>
                <h3 className="flex items-center gap-2 mb-6 text-xl font-bold">
                    <User className="text-purple" size={24} /> Mon Profil
                </h3>

                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
                    <div className="flex gap-8 items-start">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div style={{
                                    width: '100px', height: '100px', borderRadius: '50%',
                                    overflow: 'hidden', border: '3px solid rgba(168, 85, 247, 0.3)',
                                    backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={48} className="text-slate-500" />
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justifyContent-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="text-white" size={24} />
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            <p className="text-xs text-secondary text-center">Format carré auto</p>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="text-sm font-bold text-secondary uppercase mb-1 block">Nom Complet / Pseudo</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Ex: Dr. Martin"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-secondary uppercase mb-1 block">Rôle</label>
                                <div className="input-field bg-slate-800/50 text-slate-400 cursor-not-allowed">
                                    {user?.role === 'PHARMACIEN' ? 'Pharmacien' : 'Anesthésiste'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/5">
                        {profileMsg && <span className="text-emerald mr-4 flex items-center gap-2 animate-pulse"><CheckCircle size={16} /> {profileMsg}</span>}
                        <button type="submit" className="btn btn-primary">
                            <Save size={18} /> Mettre à jour le profil
                        </button>
                    </div>
                </form>
            </div>

            {/* ALERT MANAGEMENT SECTION */}
            <div className="card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <h3 className="flex items-center gap-2 mb-6 text-xl font-bold">
                    <BarChart3 className="text-emerald-500" size={24} /> Gestion des Alertes
                </h3>

                <div className="space-y-6">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <h4 className="font-bold text-sm mb-2 text-blue-400">📊 Alertes Intelligentes Activées</h4>
                        <p className="text-xs text-secondary leading-relaxed">
                            Les seuils sont maintenant calculés automatiquement en fonction de la <strong>consommation moyenne des 3 derniers mois</strong> (avec pondération saisonnière).
                            Ajustez les coefficients ci-dessous selon vos besoins.
                        </p>
                    </div>

                    {/* Coefficient Sliders */}
                    <div>
                        <div className="flex-between mb-2">
                            <label className="text-sm font-bold text-secondary uppercase">Stock Normal (mois)</label>
                            <span className="text-emerald font-mono font-bold">× {coefficients.normal}</span>
                        </div>
                        <input
                            type="range"
                            min="1" max="5" step="0.1"
                            value={coefficients.normal}
                            onChange={(e) => setCoefficients({ ...coefficients, normal: parseFloat(e.target.value) })}
                            className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-secondary mt-2">
                            Seuil = (Consommation Moyenne × {coefficients.normal}) mois de stock
                        </p>
                    </div>

                    <div>
                        <div className="flex-between mb-2">
                            <label className="text-sm font-bold text-secondary uppercase">Stock Faible (mois)</label>
                            <span className="text-amber font-mono font-bold">× {coefficients.low}</span>
                        </div>
                        <input
                            type="range"
                            min="1" max="3" step="0.1"
                            value={coefficients.low}
                            onChange={(e) => setCoefficients({ ...coefficients, low: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-secondary mt-2">
                            Alerte <span className="text-amber-500">Orange</span> : Consommation Moyenne × {coefficients.low} mois
                        </p>
                    </div>

                    <div>
                        <div className="flex-between mb-2">
                            <label className="text-sm font-bold text-secondary uppercase">Stock Critique (mois)</label>
                            <span className="text-red font-mono font-bold">× {coefficients.critical}</span>
                        </div>
                        <input
                            type="range"
                            min="0.5" max="2" step="0.1"
                            value={coefficients.critical}
                            onChange={(e) => setCoefficients({ ...coefficients, critical: parseFloat(e.target.value) })}
                            className="w-full accent-red-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-secondary mt-2">
                            Alerte <span className="text-red">Rouge</span> : Consommation Moyenne × {coefficients.critical} mois
                        </p>
                    </div>

                    <div>
                        <div className="flex-between mb-2">
                            <label className="text-sm font-bold text-secondary uppercase">Minimum Absolu (ampoules)</label>
                            <span className="text-purple font-mono font-bold">{coefficients.minAbsolute}</span>
                        </div>
                        <input
                            type="range"
                            min="1" max="10" step="1"
                            value={coefficients.minAbsolute}
                            onChange={(e) => setCoefficients({ ...coefficients, minAbsolute: parseInt(e.target.value) })}
                            className="w-full accent-purple-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-secondary mt-2">
                            Seuil plancher pour les médicaments à faible consommation
                        </p>
                    </div>

                    {/* Consumption Stats Button */}
                    <div className="pt-4 border-t border-white/5">
                        <button
                            onClick={() => setShowConsumptionStats(true)}
                            className="btn w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                        >
                            <BarChart3 size={18} /> Voir Moyennes de Consommation par Médicament
                        </button>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t border-white/5">
                        {alertMsg && <span className="text-emerald mr-4 flex items-center gap-2 animate-pulse"><CheckCircle size={16} /> {alertMsg}</span>}
                        <button onClick={handleSaveCoefficients} className="btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                            <Save size={18} /> Enregistrer les Coefficients
                        </button>
                    </div>
                </div>
            </div>

            {/* Consumption Stats Modal */}
            {showConsumptionStats && (
                <ConsumptionStatsModal
                    medications={medications}
                    transactions={transactions}
                    onClose={() => setShowConsumptionStats(false)}
                />
            )}

            {/* SECURITY SECTION */}
            <div className="card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <h3 className="flex items-center gap-2 mb-6 text-xl font-bold">
                    <Lock className="text-amber-500" size={24} /> Sécurité
                </h3>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-secondary uppercase mb-1 block">Nouveau Mot de Passe</label>
                            <input
                                type="password"
                                className="input-field w-full"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-secondary uppercase mb-1 block">Confirmer</label>
                            <input
                                type="password"
                                className="input-field w-full"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        {passwordMsg.text && (
                            <span className={`text-sm flex items-center gap-2 mr-4 ${passwordMsg.type === 'error' ? 'text-red' : 'text-emerald'}`}>
                                {passwordMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                                {passwordMsg.text}
                            </span>
                        )}
                        <button type="submit" className="btn btn-ghost border border-white/10 hover:bg-white/5">
                            Modifier le mot de passe
                        </button>
                    </div>
                </form>
            </div>

            {/* DATA SECTION */}
            <div className="card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald"></div>
                <h3 className="flex items-center gap-2 mb-4 text-xl font-bold">
                    <Database className="text-emerald" size={24} /> Données
                </h3>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-secondary max-w-md">
                        Téléchargez une sauvegarde complète de vos données (JSON).
                    </p>
                    <button onClick={handleExport} className="btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                        <Download size={20} /> Exporter
                    </button>
                </div>
            </div>

            {/* DANGER ZONE */}
            <div className="card border-red-500/30 bg-red-500/5 relative overflow-hidden">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-full text-red">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-red">Zone de Danger</h3>
                        <p className="text-sm text-secondary">
                            La réinitialisation effacera toutes les données locales et se déconnectera.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm("Êtes-vous SÛR de vouloir tout effacer ? Cette action est irréversible.")) {
                                clearData();
                            }
                        }}
                        className="btn bg-red-500/10 text-red hover:bg-red-500 hover:text-white border border-red-500/20"
                    >
                        <Trash2 size={20} /> Réinitialiser
                    </button>
                </div>
            </div>

            <div className="text-center text-xs text-secondary opacity-50">
                AnesthMed_HBC v2.3 • Avec Auto-Crop & Branding
            </div>
        </div>
    );
};

export default Settings;
