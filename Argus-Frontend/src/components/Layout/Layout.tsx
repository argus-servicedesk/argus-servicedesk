import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import Sidebar from './Sidebar';
import Header from './Header';
import { useRealtime } from '../../hooks/useRealtime';

export default function Layout() {
  useRealtime();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen relative" style={{ background: '#f4f6f8' }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={clsx(
          'transition-all duration-300 relative z-10',
          // Desktop: offset by sidebar width. Mobile: no offset
          collapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]'
        )}
      >
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="p-4 sm:p-6 min-h-[calc(100vh-3.5rem)]">
          <Outlet key={location.pathname} />
        </main>
      </div>
    </div>
  );
}
