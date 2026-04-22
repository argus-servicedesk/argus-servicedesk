import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const navLinks = [
  { to: '/portal', label: 'Home', end: true },
  { to: '/portal/catalog', label: 'Catalog' },
  { to: '/portal/report-issue', label: 'Report Issue' },
  { to: '/portal/knowledge-base', label: 'Knowledge Base' },
  { to: '/portal/my-requests', label: 'My Requests' },
];

export default function PortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : 'User';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Top Navbar */}
      <header
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}
        className="sticky top-0 z-50 shadow-sm"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          {/* Logo */}
          <Link
            to="/portal"
            className="text-xl font-bold tracking-tight"
            style={{ color: '#6366f1' }}
          >
            Argus
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className="relative px-3 py-2 text-sm font-medium transition-colors"
                style={({ isActive }) => ({
                  color: isActive ? '#6366f1' : '#0f172a',
                })}
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                        style={{ backgroundColor: '#6366f1' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden items-center gap-4 md:flex">
            <span className="text-sm font-medium" style={{ color: '#0f172a' }}>
              {displayName}
            </span>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: '#6366f1', color: '#ffffff' }}
            >
              <LayoutDashboard size={14} />
              Back to Dashboard
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="inline-flex items-center justify-center rounded-md p-2 md:hidden"
            style={{ color: '#0f172a' }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="border-t px-4 pb-4 pt-2 md:hidden"
            style={{ borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium"
                  style={({ isActive }) => ({
                    color: isActive ? '#6366f1' : '#0f172a',
                    backgroundColor: isActive ? '#eef2ff' : 'transparent',
                  })}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: '#e2e8f0' }}>
              <span className="text-sm font-medium" style={{ color: '#0f172a' }}>
                {displayName}
              </span>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: '#6366f1', color: '#ffffff' }}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
