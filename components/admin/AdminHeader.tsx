'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Mountain, Users } from 'lucide-react';

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  };

  return (
    <header className="admin-header-new">
      <div className="admin-header-container">
        <div className="admin-brand">
          <Mountain className="admin-brand-icon" size={24} />
          <span className="admin-brand-title">Trekkers Heaven Admin</span>
        </div>

        <nav className="admin-nav-tabs">
          <Link
            href="/admin/leads"
            className={`admin-nav-tab ${pathname.startsWith('/admin/leads') ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Leads</span>
          </Link>
          <Link
            href="/admin/treks"
            className={`admin-nav-tab ${pathname.startsWith('/admin/treks') ? 'active' : ''}`}
          >
            <Mountain size={18} />
            <span>Treks</span>
          </Link>
        </nav>

        <button onClick={handleLogout} className="admin-logout-btn" type="button">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
