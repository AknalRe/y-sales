import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Loader2, LockKeyhole, MapPin, Moon, Sun } from 'lucide-react';
import { useAuth } from './auth-provider';
import { useTheme } from '@/hooks/use-theme';
import { getHomePathForRole } from '@yuksales/shared';
import { getCompanyBySlug } from '@/lib/api/client';

type CompanyInfo = { name: string; slug: string; logoUrl?: string | null };

export function LoginPage() {
  const navigate = useNavigate();
  const { company } = useParams<{ company?: string }>();
  const { signIn } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [companyLoading, setCompanyLoading] = useState(!!company);
  const [companyError, setCompanyError] = useState('');

  useEffect(() => {
    if (!company) { setCompanyInfo(null); setCompanyError(''); return; }
    let cancelled = false;
    setCompanyLoading(true);
    setCompanyError('');
    getCompanyBySlug(company)
      .then((res) => { if (!cancelled) setCompanyInfo(res.company); })
      .catch((err) => { if (!cancelled) setCompanyError(err instanceof Error ? err.message : 'Perusahaan tidak ditemukan'); })
      .finally(() => { if (!cancelled) setCompanyLoading(false); });
    return () => { cancelled = true; };
  }, [company]);

  const displayName = companyInfo?.name ?? 'YukTrackingSales';
  const displayInitial = displayName.charAt(0).toUpperCase();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const signedInUser = await signIn(identifier, password, company);
      navigate(getHomePathForRole(signedInUser.roleCode, signedInUser.isSuperAdmin));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  if (company && companyLoading) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-primary px-5 py-10 text-white">
        <section className="relative z-10 w-full max-w-md animate-float-in">
          <div className="brand-glass rounded-3xl p-8 text-center">
            <Loader2 className="mx-auto mb-4 animate-spin" size={32} />
            <p className="text-white/70">Memuat data perusahaan...</p>
          </div>
        </section>
      </main>
    );
  }

  if (companyError) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-primary px-5 py-10 text-white">
        <section className="relative z-10 w-full max-w-md animate-float-in">
          <div className="brand-glass rounded-3xl p-8 text-center">
            <h1 className="text-2xl font-black mb-4">Perusahaan Tidak Ditemukan</h1>
            <p className="text-white/70 mb-6">{companyError}</p>
            <a href="/login" className="brand-button inline-block rounded-2xl px-6 py-3 font-bold">Kembali ke Login</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-primary px-5 py-10 text-white">
      <button onClick={toggleTheme} className="absolute right-4 top-4 z-20 rounded-full bg-white/15 p-2.5 text-white backdrop-blur-sm ring-1 ring-white/20 transition hover:bg-white/25" type="button" title={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}>
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <section className="relative z-10 w-full max-w-md animate-float-in">
        <div className="brand-glass rounded-3xl p-8">
          <div className="mb-8 text-center">
            {companyInfo?.logoUrl ? (
              <img src={companyInfo.logoUrl} alt={displayName} className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-2xl ring-1 ring-white/20" />
            ) : (
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-3xl font-black text-white shadow-2xl ring-1 ring-white/20">
                {displayInitial}
              </div>
            )}
            <h1 className="text-4xl font-black tracking-tight text-white">{displayName}</h1>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3 text-center text-xs font-bold text-white/75">
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><Camera className="mx-auto mb-1 text-orange-200" />Bukti Foto</div>
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><MapPin className="mx-auto mb-1 text-amber-200" />GPS Radius</div>
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><LockKeyhole className="mx-auto mb-1 text-rose-200" />Approval</div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="ml-1 text-sm font-medium text-white/80">Email / HP / Kode</span>
              <input
                id="login-identifier-input"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/40"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="ml-1 text-sm font-medium text-white/80">Password</span>
              <input
                id="login-password-input"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/40"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <div className="flex items-center justify-end text-sm">
              <button id="login-forgot-button" type="button" className="text-brand-accent transition hover:text-white">Lupa sandi?</button>
            </div>

            {error && <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}

            <button id="login-submit-button" className="brand-button flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-70" disabled={loading || companyLoading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}
              {loading ? 'Memproses...' : `Masuk ke ${displayName}`}
            </button>
          </form>
        </div>
        <p className="mt-8 text-center text-xs text-white/50">© {new Date().getFullYear()} {displayName}. Operasional sales, outlet, stok, dan approval.</p>
      </section>
    </main>
  );
}


