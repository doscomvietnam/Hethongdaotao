import * as React from 'react';
import { Flame, Star, Trophy } from 'lucide-react';
import { Card } from '../ui';
import { getEmployeeGamificationData, type EmployeeGamificationData } from '../../services/gamificationService';

interface Props {
  employeeId: string;
}

export function GamificationWidget({ employeeId }: Props) {
  const [gamData, setGamData] = React.useState<EmployeeGamificationData | null>(null);

  React.useEffect(() => {
    getEmployeeGamificationData(employeeId).then(setGamData).catch(() => {});
  }, [employeeId]);

  if (!gamData) return null;

  return (
    <Card className="p-5 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Streak */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 ring-1 ring-orange-500/30 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Streak</p>
            <p className="text-xl font-black text-orange-400 tabular-nums leading-none">{gamData.streak} <span className="text-base">🔥</span></p>
            <p className="text-[9px] text-zinc-600 font-bold">ngày liên tiếp</p>
          </div>
        </div>

        <div className="hidden sm:block w-px h-10 bg-zinc-900" />

        {/* XP */}
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-11 h-11 rounded-xl ${gamData.level.bg} ring-1 ${gamData.level.ring} flex items-center justify-center flex-shrink-0`}>
            <Star className={`w-5 h-5 ${gamData.level.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Lv.{gamData.level.level} · {gamData.level.label}</p>
            <p className={`text-xl font-black tabular-nums leading-none ${gamData.level.color}`}>{gamData.totalXP.toLocaleString()} XP</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-24 rounded-full bg-zinc-900 overflow-hidden">
                <div className={`h-full rounded-full ${gamData.level.barColor}`} style={{ width: `${gamData.level.progress}%` }} />
              </div>
              {gamData.level.xpForNext && (
                <span className="text-[8px] text-zinc-700 font-bold">{gamData.level.progress}%</span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden sm:block w-px h-10 bg-zinc-900" />

        {/* Badges */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Thành tích</p>
            <p className="text-xl font-black text-amber-400 tabular-nums leading-none">
              {gamData.badges.filter(b => b.earned).length}/{gamData.badges.length}
            </p>
            <div className="flex gap-1 mt-1">
              {gamData.badges.filter(b => b.earned).slice(0, 5).map(b => (
                <span key={b.id} title={b.label} className="text-sm">{b.icon}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
