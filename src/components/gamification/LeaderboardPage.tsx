import * as React from 'react';
import { Trophy, Flame, Crown } from 'lucide-react';
import { Card } from '../ui';
import {
  getLeaderboard,
  LEVEL_DEFS,
  type LeaderboardEntry,
} from '../../services/gamificationService';

interface LeaderboardPageProps {
  employeeId: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl leading-none">🥇</span>;
  if (rank === 2) return <span className="text-2xl leading-none">🥈</span>;
  if (rank === 3) return <span className="text-2xl leading-none">🥉</span>;
  return <span className="text-sm font-black text-zinc-500 tabular-nums w-8 text-center">#{rank}</span>;
}

function LevelBar({ totalXP, barColor }: { totalXP: number; barColor: string }) {
  const cur = [...LEVEL_DEFS].reverse().find(l => totalXP >= l.minXP) ?? LEVEL_DEFS[0];
  const idx = LEVEL_DEFS.indexOf(cur);
  const next = LEVEL_DEFS[idx + 1];
  const pct = next
    ? Math.min(100, Math.round(((totalXP - cur.minXP) / (next.minXP - cur.minXP)) * 100))
    : 100;
  return (
    <div className="h-1 rounded-full bg-zinc-900 overflow-hidden w-16">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function LeaderboardPage({ employeeId }: LeaderboardPageProps) {
  const [tab, setTab] = React.useState<'monthly' | 'alltime'>('monthly');
  const [loading, setLoading] = React.useState(true);
  const [lb, setLb] = React.useState<{ monthly: LeaderboardEntry[]; allTime: LeaderboardEntry[] } | null>(null);

  React.useEffect(() => {
    getLeaderboard()
      .then(setLb)
      .finally(() => setLoading(false));
  }, []);

  const entries = tab === 'monthly' ? (lb?.monthly ?? []) : (lb?.allTime ?? []);
  const myEntry = entries.find(e => e.employeeId === employeeId);
  const currentMonth = new Date(Date.now() + 7 * 3600 * 1000)
    .toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">Bảng Xếp Hạng</h1>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-1">{currentMonth}</p>
          </div>
        </div>
      </header>

      {/* My rank highlight */}
      {myEntry && (
        <Card className="flex items-center gap-4 px-5 py-4 bg-amber-500/5 border-amber-500/20 rounded-2xl">
          <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest">Vị trí của bạn</p>
            <p className="text-sm font-black text-amber-300">
              Hạng #{myEntry.rank} · {tab === 'monthly' ? myEntry.monthXP.toLocaleString() : myEntry.totalXP.toLocaleString()} XP · Streak {myEntry.streak}🔥
            </p>
          </div>
          <span className={`text-xs font-black ${myEntry.levelColor}`}>Lv.{myEntry.level} {myEntry.levelLabel}</span>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'monthly', label: '🗓 Tháng này' },
          { key: 'alltime', label: '⏳ Tất cả thời gian' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === t.key
                ? 'bg-amber-500/10 ring-1 ring-amber-500/30 text-amber-400'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ranking table */}
      <Card className="bg-[#0C0C0E] border-zinc-900 rounded-2xl overflow-hidden">
        <div className="divide-y divide-zinc-900/80">
          {entries.map((entry) => {
            const isMe = entry.employeeId === employeeId;
            const xp = tab === 'monthly' ? entry.monthXP : entry.totalXP;
            return (
              <div
                key={entry.employeeId}
                className={`flex items-center gap-3 px-5 py-4 transition-all ${
                  isMe ? 'bg-amber-500/5 border-l-2 border-l-amber-500/60' : 'hover:bg-zinc-950'
                }`}
              >
                {/* Rank */}
                <div className="w-9 flex-shrink-0 flex items-center justify-center">
                  <RankDisplay rank={entry.rank} />
                </div>

                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                  isMe ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40' : 'bg-zinc-900 text-zinc-400'
                }`}>
                  {getInitials(entry.fullName)}
                </div>

                {/* Name + dept */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black truncate ${isMe ? 'text-amber-300' : 'text-white'}`}>
                    {entry.fullName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[9px] text-zinc-600 font-bold truncate">{entry.department}</p>
                    <LevelBar totalXP={entry.totalXP} barColor={entry.barColor} />
                    <span className={`text-[8px] font-black hidden sm:block ${entry.levelColor}`}>Lv.{entry.level}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-xs font-black text-orange-400 tabular-nums">{entry.streak}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-amber-400 tabular-nums leading-none">{xp.toLocaleString()}</p>
                    <p className="text-[9px] text-zinc-600 font-bold">XP</p>
                  </div>
                </div>
              </div>
            );
          })}

          {entries.length === 0 && (
            <div className="py-16 text-center text-zinc-600 text-sm font-bold">Chưa có dữ liệu</div>
          )}
        </div>
      </Card>
    </div>
  );
}
