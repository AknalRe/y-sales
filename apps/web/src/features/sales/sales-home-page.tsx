import { Link } from 'react-router-dom';

const visits = [
  { name: 'Toko Jaya Abadi', address: 'Jl. Merdeka No. 12', status: 'Selesai', time: '09:00' },
  { name: 'Warkop Berkah', address: 'Jl. Sudirman Blok C', status: 'Selesai', time: '10:30' },
  { name: 'Toko Makmur', address: 'Pasar Baru Kios 4', status: 'Belum', time: '13:00' },
  { name: 'Warung Bu Tejo', address: 'Jl. Melati No. 8', status: 'Belum', time: '15:00' },
];

export function SalesHomePage() {
  const target = 5_000_000;
  const achieved = 2_150_000;
  const percent = (achieved / target) * 100;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#4a2922]/10 bg-white p-5 shadow-sm">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[#b55925]/10" />
        <p className="text-sm font-bold text-slate-500">Pencapaian Hari Ini</p>
        <div className="mt-2 flex items-end gap-2">
          <h2 className="text-2xl font-black text-slate-900">Rp {(achieved / 1_000_000).toFixed(2)}M</h2>
          <p className="mb-1 text-sm text-slate-400">/ Rp {(target / 1_000_000).toFixed(1)}M</p>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#b55925] transition-all duration-1000" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-right text-xs font-black text-[#b55925]">{percent.toFixed(1)}%</p>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link to="/attendance" className="rounded-3xl bg-[#4a2922] p-5 text-center font-bold text-white shadow-sm active:scale-95">
          <span className="mb-2 block text-3xl">??</span>
          Absensi Wajah
        </Link>
        <Link to="/sales/transactions" className="rounded-3xl border border-[#4a2922]/15 bg-white p-5 text-center font-bold text-[#4a2922] shadow-sm active:scale-95">
          <span className="mb-2 block text-3xl">???</span>
          Transaksi
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-black text-slate-900">Kunjungan Hari Ini</h2>
          <Link to="/sales/visit" className="text-xs font-bold text-[#b55925]">Lihat Peta</Link>
        </div>
        <div className="space-y-3">
          {visits.map((visit) => (
            <article key={visit.name} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-full text-lg ${visit.status === 'Selesai' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                  {visit.status === 'Selesai' ? '?' : '??'}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{visit.name}</h3>
                  <p className="line-clamp-1 text-xs text-slate-500">{visit.address}</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{visit.time}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}


