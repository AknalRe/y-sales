import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function Placeholder({ title, description, mobile = false }: { title: string; description: string; mobile?: boolean }) {
  return (
    <section className={`${mobile ? 'rounded-3xl bg-white p-5 shadow-sm' : 'brand-card rounded-3xl p-8'} animate-float-in`}>
      <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b55925]">Phase A</p>
      <h1 className="mt-3 text-3xl font-black text-[#40231e]">{title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-500">{description}</p>
      <div className="mt-6 rounded-2xl border border-dashed border-[#b55925]/30 bg-[#b55925]/5 p-5 text-sm font-semibold text-[#7a3f22]">
        UI shell sudah siap. Logic detail halaman ini masuk Phase B/C sesuai plan.
      </div>
    </section>
  );
}

export type RouteConfig = {
  path?: string;
  index?: boolean;
  element: ReactNode;
  handle: {
    label: string;
    icon: LucideIcon;
    permission?: string;
    section?: string;
    badge?: string;
    hidden?: boolean;
    mobile?: boolean;
  };
  children?: RouteConfig[];
};
