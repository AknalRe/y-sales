import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, ShieldCheck, Users, BarChart3 } from 'lucide-react';
import { clearPlatformCompanyView, getPlatformCompanyView } from '@/lib/api/client';

export function PlatformCompanyViewBanner() {
  const navigate = useNavigate();
  const [view, setView] = useState(getPlatformCompanyView());

  useEffect(() => {
    setView(getPlatformCompanyView());
  }, []);

  if (!view) return null;

  function exitView() {
    clearPlatformCompanyView();
    navigate('/platform/companies');
  }

  return (
    <section className="platform-company-view-banner">
      <div className="platform-company-view-copy">
        <span className="platform-company-view-kicker">
          <ShieldCheck size={15} /> Mode Super Admin · Tenant View
        </span>
        <h1>
          <Building2 size={26} />
          Dashboard Company: {view.name}
        </h1>
        <p>
          Anda sedang melihat sisi operasional tenant <strong>@{view.slug}</strong>. Request tenant akan dikirim dengan konteks company ini.
        </p>
      </div>
      <div className="platform-company-view-actions">
        <Link to="/admin/users" className="platform-btn platform-btn-primary">
          <Users size={16} /> Kelola User
        </Link>
        <Link to="/admin" className="platform-btn platform-btn-ghost">
          <BarChart3 size={16} /> Dashboard Admin
        </Link>
        <button type="button" onClick={exitView} className="platform-btn platform-btn-ghost">
          <ArrowLeft size={16} /> Kembali Platform
        </button>
      </div>
    </section>
  );
}
