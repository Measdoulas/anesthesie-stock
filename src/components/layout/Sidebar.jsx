import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Package, PlusCircle, MinusCircle, BarChart3, Activity, Settings, ShieldCheck, LogOut, ClipboardList } from 'lucide-react';

const Sidebar = ({ isOpen }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Tableau de bord', to: '/' },
        { icon: Package, label: 'Inventaire', to: '/inventory' },
        { icon: PlusCircle, label: 'Entrées Stock', to: '/entry' },
        { icon: MinusCircle, label: 'Sorties Patient', to: '/exit' },
        { icon: BarChart3, label: 'Statistiques', to: '/stats' },
        { icon: ClipboardList, label: 'Audit / Contrôle', to: '/audit' },
        { icon: Settings, label: 'Paramètres', to: '/settings' },
    ];

    // Pharmacist only items
    if (user?.role === 'PHARMACIEN') {
        // Insert Validation link after 'Entrées Stock' (index 2 + 1 = 3)
        // Or just at the end before settings? Let's put it high up.
        // Actually, let's append it before Settings.
        const validationItem = { icon: ShieldCheck, label: 'Validation', to: '/validation' };
        navItems.splice(5, 0, validationItem);
    }

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', marginBottom: '2rem' }}>
                <img src="/logo.jpg" alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                <h1 className="logo-text" style={{ fontSize: '1.1rem', textAlign: 'center' }}>
                    AnesthMed<br />Hôpital Braun
                </h1>
            </div>

            <nav className="nav-menu">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="card" style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${user?.role === 'PHARMACIEN' ? 'bg-purple' : 'bg-blue'}`}></div>
                        <span className="text-xs font-bold truncate">{user?.name || 'Utilisateur'}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn w-full text-xs"
                        style={{ padding: '0.4rem', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                        <LogOut size={14} className="mr-1" /> Déconnexion
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
