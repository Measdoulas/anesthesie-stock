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

            <main className="main-content">
                <div className="container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
