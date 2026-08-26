import * as React from 'react';
import { Lock, Trophy } from 'lucide-react';
import { Card } from '../ui';
import type { Employee } from '../../types';
import { getEmployeeGamificationData, type EmployeeGamificationData } from '../../services/gamificationService';
import CertificateModal from './CertificateModal';

interface BadgesPageProps {
  employee: Employee;
}

export default function BadgesPage({ employee }: BadgesPageProps) {
  const [data, setData] = React.useState<EmployeeGamificationData | null>(null);

  React.useEffect(() => {
    if (!employee.id) return;
    getEmployeeGamificationData(employee.id).then(setData).catch(() => {});
  }, [employee.id]);

  const badges = data?.badges ?? [];
  const earned = badges.filter((b) => b.earned).length;

  const [viewCert, setViewCert] = React.useState<{ courseName: string; score: number; date: string } | null>(null);
  const certById = React.useMemo(
    () => new Map((data?.certificates ?? []).map((c) => [c.badgeId, c])),
    [data],
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-8 py-2">
        <div className="flex items-center gap-4">
          <Trophy className="w-8 h-8 text-emerald-500" />
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">TỦ HUY HIỆU</h1>
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs pl-12">
          {data ? `Đã đạt ${earned}/${badges.length} huy hiệu` : 'Đang tải…'} · tích lũy bằng cách học, làm quiz, giữ chuỗi ngày
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badges.map((b) => {
          const cert = b.earned ? certById.get(b.id) : undefined;
          return (
          <Card
            key={b.id}
            onClick={cert ? () => setViewCert(cert) : undefined}
            className={`p-6 rounded-2xl text-center transition-all ${b.earned ? 'bg-[#0C0C0E] border border-emerald-500/20 hover:border-emerald-400/50' : 'bg-[#0C0C0E] border border-zinc-900 opacity-60'} ${cert ? 'cursor-pointer hover:-translate-y-0.5 hover:ring-1 hover:ring-emerald-400/40' : ''}`}
          >
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl ${b.earned ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : 'bg-zinc-900 ring-1 ring-zinc-800'}`}>
              {b.earned ? b.icon : <Lock className="w-6 h-6 text-zinc-700" />}
            </div>
            <p className="text-sm font-black text-white uppercase tracking-tight mb-1 leading-tight">{b.label}</p>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2.5 ${cert ? 'text-amber-400' : b.earned ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {cert ? '📜 Bấm để xem' : b.earned ? 'Đã đạt ✓' : 'Chưa mở'}
            </p>
            <p className="text-[10px] text-zinc-600 font-bold leading-relaxed">{b.desc}</p>
          </Card>
          );
        })}
        {badges.length === 0 && (
          <p className="col-span-full text-center text-zinc-600 py-16 font-bold uppercase tracking-widest text-xs">
            Đang tải huy hiệu…
          </p>
        )}
      </div>

      {viewCert && (
        <CertificateModal
          name={employee.full_name}
          courseName={viewCert.courseName}
          score={viewCert.score}
          date={viewCert.date}
          onClose={() => setViewCert(null)}
        />
      )}
    </div>
  );
}
