import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, LockKeyhole, MapPin, Moon, Sun } from 'lucide-react';
import { useAuth } from './auth-provider';
import { useTheme } from '@/hooks/use-theme';
import { getHomePathForRole } from '@yuksales/shared';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const signedInUser = await signIn(identifier, password);
      navigate(getHomePathForRole(signedInUser.roleCode, signedInUser.isSuperAdmin));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-primary px-5 py-10 text-white">
      <button onClick={toggleTheme} className="absolute right-4 top-4 z-20 rounded-full bg-white/15 p-2.5 text-white backdrop-blur-sm ring-1 ring-white/20 transition hover:bg-white/25" type="button" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <section className="relative z-10 w-full max-w-md animate-float-in">
        <div className="brand-glass rounded-3xl p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-3xl font-black text-white shadow-2xl ring-1 ring-white/20">Y</div>
            <h1 className="text-4xl font-black tracking-tight text-white">Yuksales</h1>
            <p className="mt-2 text-sm font-medium text-brand-secondary">Sales Management System</p>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3 text-center text-xs font-bold text-white/75">
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><Camera className="mx-auto mb-1 text-orange-200" />Wajah</div>
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><MapPin className="mx-auto mb-1 text-amber-200" />GPS</div>
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><LockKeyhole className="mx-auto mb-1 text-rose-200" />RBAC</div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="ml-1 text-sm font-medium text-white/80">Email / HP / Kode Karyawan</span>
              <input
                id="login-identifier-input"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/40"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="admin / sales@yuksales.com"
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-white/70 transition hover:text-white">
                <input id="login-remember-checkbox" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/10 accent-brand-accent" />
                Ingat saya
              </label>
              <button id="login-forgot-button" type="button" className="text-brand-accent transition hover:text-white">Lupa sandi?</button>
            </div>

            {error && <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}

            <button id="login-submit-button" className="brand-button flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-70" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}
              {loading ? 'Memproses...' : 'Masuk ke Sistem'}
            </button>
          </form>
        </div>
        <p className="mt-8 text-center text-xs text-white/50">© {new Date().getFullYear()} Yuksales. All rights reserved.</p>
      </section>
    </main>
  );
}


