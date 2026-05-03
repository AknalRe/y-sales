import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, LockKeyhole, MapPin } from 'lucide-react';
import { useAuth } from './auth-provider';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
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
      navigate(signedInUser.isSuperAdmin ? '/platform' : '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#4a2922] px-5 py-10 text-white">
      <div className="absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-[#b55925] opacity-50 blur-3xl mix-blend-multiply animate-blob" />
      <div className="absolute right-[-8rem] top-[-6rem] h-96 w-96 rounded-full bg-[#966556] opacity-50 blur-3xl mix-blend-multiply animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-10rem] left-[20%] h-96 w-96 rounded-full bg-[#59252d] opacity-60 blur-3xl mix-blend-multiply animate-blob animation-delay-4000" />

      <section className="relative z-10 w-full max-w-md animate-float-in">
        <div className="brand-glass rounded-[2rem] p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-3xl shadow-2xl ring-1 ring-white/20">M</div>
            <h1 className="text-4xl font-black tracking-tight">YukSales</h1>
            <p className="mt-2 text-sm font-medium text-[#d8b6aa]">Sales Management System</p>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3 text-center text-xs text-white/75">
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><Camera className="mx-auto mb-1 text-orange-200" />Wajah</div>
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><MapPin className="mx-auto mb-1 text-amber-200" />GPS</div>
            <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><LockKeyhole className="mx-auto mb-1 text-rose-200" />RBAC</div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="ml-1 text-sm font-medium text-white/80">Email / HP / Kode Karyawan</span>
              <input
                id="login-identifier-input"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-[#b55925] focus:ring-2 focus:ring-[#b55925]/40"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="admin@yuksales.local"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="ml-1 text-sm font-medium text-white/80">Password</span>
              <input
                id="login-password-input"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-[#b55925] focus:ring-2 focus:ring-[#b55925]/40"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-white/70 transition hover:text-white">
                <input id="login-remember-checkbox" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/10 accent-[#b55925]" />
                Ingat saya
              </label>
              <button id="login-forgot-button" type="button" className="text-[#f09a63] transition hover:text-white">Lupa sandi?</button>
            </div>

            {error && <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}

            <button id="login-submit-button" className="brand-button flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-70" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}
              {loading ? 'Memproses...' : 'Masuk ke Sistem'}
            </button>
          </form>
        </div>
        <p className="mt-8 text-center text-xs text-white/50">© {new Date().getFullYear()} YukSales. All rights reserved.</p>
      </section>
    </main>
  );
}


