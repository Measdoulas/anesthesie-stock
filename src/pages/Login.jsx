import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Activity } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError('Échec de la connexion. Vérifiez vos identifiants.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
            <div className="text-center animate-enter">
                <div className="flex-center mb-6">
                    <img src="/logo.jpg" alt="Logo Hôpital" style={{ width: '120px', height: '120px', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '4px solid rgba(255,255,255,0.1)' }} />
                </div>
                <h1 className="logo-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', textShadow: '0 0 20px rgba(168, 85, 247, 0.4)' }}>AnesthMed_ HBC</h1>
                <p className="text-secondary tracking-wider font-light">Portail de Gestion Sécurisée des Médicaments</p>
            </div>

            <div className="card animate-enter" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
                <h2 className="text-center mb-6">Connexion Sécurisée</h2>

                {error && (
                    <div className="bg-red-900/30 text-red-200 p-3 rounded mb-4 text-sm text-center border border-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-col gap-4">
                    <div>
                        <label className="text-sm font-bold text-secondary uppercase mb-1 block">Email</label>
                        <div className="relative">
                            <User size={18} className="absolute left-3 top-3 text-secondary" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field pl-10"
                                placeholder="nom@hopital.com"
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-secondary uppercase mb-1 block">Mot de passe</label>
                        <div className="relative">
                            <ShieldCheck size={18} className="absolute left-3 top-3 text-secondary" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pl-10"
                                placeholder="••••••••"
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full mt-2"
                    >
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                <div className="text-center mt-6 text-xs text-secondary">
                    <p>Accès restreint aux professionnels de santé.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
