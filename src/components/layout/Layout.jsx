import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

const Layout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    return (
        <div className="app-container">
            {/* Mobile Toggle Button */}
            <button
                className="mobile-toggle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar with mobile state */}
            <div className={`sidebar-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
                <Sidebar isOpen={isMobileMenuOpen} />
            </div>

            {/* Overlay for mobile when menu is open */}
            {isMobileMenuOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40,
                        backdropFilter: 'blur(2px)'
                    }}
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <main className="main-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <div className="container" style={{ flex: 1 }}>
                    <Outlet />
                </div>
                <footer style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    marginTop: '2rem'
                }}>
                    <p style={{ marginBottom: '0.25rem' }}>
                        &copy; {new Date().getFullYear()} <strong>Dr. Anesthésiste</strong>. Tous droits de propriété intellectuelle réservés.
                    </p>
                    <p style={{ opacity: 0.7 }}>
                        Licence d'utilisation exclusive accordée au <strong>Centre Hospitalier Braun de Cinkassé</strong>.
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default Layout;
