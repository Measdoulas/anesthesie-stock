import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Download, Trash2, AlertTriangle, Database, User, Lock, Save, CheckCircle, Image } from 'lucide-react';
import { format } from 'date-fns';

const Settings = () => {
    const { medications, transactions, clearData } = useInventory();
    const { user, updateProfile, updatePassword } = useAuth();

    // Profile State
    const [fullName, setFullName] = useState(user?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
    const [profileMsg, setProfileMsg] = useState('');

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await updateProfile({ full_name: fullName, avatar_url: avatarUrl });
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
            setPasswordMsg({ text: 'Erreur lors du changement de mot de passe.', type: 'error' });
        }
    };

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
                <p>Mon profil et configuration</p>
            </div>

            {/* PROFILE SECTION */}
            <div className="card">
                <h3 className="flex-center gap-2 mb-6" style={{ justifyContent: 'flex-start' }}>
                    <User className="text-purple" size={24} />
                    Mon Profil
                </h3>

                <form onSubmit={handleUpdateProfile} className="flex-col gap-4">
                    <div className="flex gap-6 items-start">
                        {/* Avatar Preview */}
                        <div className="flex-col items-center gap-2">
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)',
                                backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={40} className="text-secondary" />
                                )}
                            </div>
                        </div>

                        <div className="flex-col gap-4 flex-1">
                            <div>
                                <label className="text-sm font-bold text-secondary uppercase mb-1 block">Nom Complet / Pseudo</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Ex: Dr. Martin"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-secondary uppercase mb-1 block">URL Photo (Avatar)</label>
                                <div className="relative">
                                    <Image size={18} className="absolute left-3 top-3 text-secondary" />
                                    <input
                                        type="text"
                                        className="input-field pl-10"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        placeholder="https://..."
                                        style={{ paddingLeft: '2.5rem' }}
                                    />
                                </div>
                                <p className="text-xs text-secondary mt-1">Collez une URL d'image directe.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 mt-2">
                        {profileMsg && <span className="text-emerald text-sm flex items-center gap-1"><CheckCircle size={14} /> {profileMsg}</span>}
                        <button type="submit" className="btn btn-primary">
                            <Save size={18} /> Enregistrer
                        </button>
                    </div>
                </form>
            </div>

            {/* SECURITY SECTION */}
            <div className="card">
                <h3 className="flex-center gap-2 mb-6" style={{ justifyContent: 'flex-start' }}>
                    <Lock className="text-amber-500" size={24} />
                    Sécurité
                </h3>

                <form onSubmit={handleUpdatePassword} className="flex-col gap-4">
                    <div className="grid-responsive" style={{ paddingTop: 0 }}>
                        <div>
                            <label className="text-sm font-bold text-secondary uppercase mb-1 block">Nouveau Mot de Passe</label>
                            <input
                                type="password"
                                className="input-field"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-secondary uppercase mb-1 block">Confirmer</label>
                            <input
                                type="password"
                                className="input-field"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 mt-2">
                        {passwordMsg.text && (
                            <span className={`text-sm flex items-center gap-1 ${passwordMsg.type === 'error' ? 'text-red' : 'text-emerald'}`}>
                                {passwordMsg.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                {passwordMsg.text}
                            </span>
                        )}
                        <button type="submit" className="btn" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                            Modifier le mot de passe
                        </button>
                    </div>
                </form>
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
                <p>AnesthMed_ HBC v2.2</p>
                <p style={{ opacity: 0.5 }}>Développé pour la gestion anesthésique sécurisée.</p>
            </div>
        </div>
    );
};

export default Settings;
