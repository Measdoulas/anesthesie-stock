import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Activity } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = (role) => {
        login(role);
        navigate('/');
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
            <div className="text-center animate-enter">
                <div className="flex-center mb-4">
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <Activity size={48} className="text-emerald" />
                    </div>
                </div>
                <h1 className="logo-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>AnesthMed_ HBC</h1>
                <p className="text-secondary">Portail de Gestion Sécurisée des Médicaments</p>
            </div>

            <div className="card animate-enter" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
                <h2 className="text-center mb-6">Identification</h2>

                <div className="flex-col gap-4">
                    <button
                        onClick={() => handleLogin('ANESTHESISTE')}
                        className="btn"
                        style={{
                            justifyContent: 'flex-start',
                            padding: '1.25rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div className="bg-blue-light p-2 rounded-full mr-4">
                            <User size={24} className="text-blue" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold">Anesthésiste</div>
                            <div className="text-xs text-secondary">Gestion Stock & Sorties</div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleLogin('PHARMACIEN')}
                        className="btn"
                        style={{
                            justifyContent: 'flex-start',
                            padding: '1.25rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div className="bg-purple-light p-2 rounded-full mr-4">
                            <ShieldCheck size={24} className="text-purple" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold">Pharmacien</div>
                            <div className="text-xs text-secondary">Réception & Validation</div>
                        </div>
                    </button>
                </div>

                <div className="text-center mt-6 text-xs text-secondary">
                    <p>Accès sécurisé réservé au personnel autorisé.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
