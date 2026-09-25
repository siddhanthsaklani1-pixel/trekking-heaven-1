import type { Metadata } from 'next';
import AdminHeader from '@/components/admin/AdminHeader';
import TreksTable from '@/components/admin/TreksTable';

export const metadata: Metadata = {
  title: 'Admin — Treks Management | Trekkers Heaven',
};

export default function AdminTreksPage() {
  return (
    <main className="admin-page-new">
      <AdminHeader />
      <div className="admin-container-new">
        <div className="admin-page-header">
          <h1>Trek Management</h1>
          <p>Add, edit, or delete trek details, itineraries, prices, and categories live.</p>
        </div>
        <TreksTable />
      </div>
    </main>
  );
}
