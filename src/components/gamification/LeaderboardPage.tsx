import * as React from 'react';
import { Trophy, Flame, Zap } from 'lucide-react';
import { Card } from '../ui';
import {
  getLeaderboard,
  getEmployeeGamificationData,
  LEVEL_DEFS,
  type LeaderboardEntry,
  type EmployeeGamificationData,
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
  return <span className="text-sm font-black text-zinc-500 tabular-nums">#{rank}</span>;
}

function XpBar({ pct, barColor }: { pct: number; barColor: string }) {
  return (
    <div className="h-1 rounded-full bg-zinc-900 overflow-hidden w-16">
      <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function LeaderboardPage({ employeeId }: LeaderboardPageProps) {
  const [tab, setTab] = React.useState<'monthly' | 'alltime'>('monthly');
  const [loading, setLoading] = React.useState(true);
  const [lb, setLb] = React.useState<{ monthly: LeaderboardEntry[]; allTime: LeaderboardEntry[] } | null>(null);
  const [myData, setMyData] = React.useState<EmployeeGamificationData | null>(null);

  React.useEffect(() => {
    Promise.all([getLeaderboard(), getEmployeeGamificationData(employeeId)])
      .then(([lbData, my]) => {
        setLb(lbData);
        setMyData(my);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employeeId]);

  const entries = tab === 'monthly' ? (lb?.monthly ?? []) : (lb?.allTime ?? []);
  const myEntry = entries.find(e => e.employeeId === employeeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const currentMonth = new Date(Date.now() + 7 * 3600 * 1000).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">Bảng Xếp Hạng</h1>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2">
              XP · Streak · Thành tích · {currentMonth}
            </p>
          </div>
        </div>
      </header>

      {/* My stats */}
      {myData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Tổng XP</p>
            <p className="text-2xl font-black text-amber-400 tabular-nums leading-none">{myData.totalXP.toLocaleString()}</p>
            <p className="text-[9px] text-zinc-600 uppercase mt-1">điểm kinh nghiệm</p>
          </Card>
          <Card className="p-4 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Streak</p>
            <p className="text-2xl font-black text-orange-400 tabular-nums leading-none">{myData.streak} 🔥</p>
            <p className="text-[9px] text-zinc-600 uppercase mt-1">ngày liên tiếp</p>
          </Card>
          <Card className="p-4 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Cấp độ</p>
            <p className={`text-2xl font-black tabular-nums leading-none ${myData.level.color}`}>Lv.{myData.level.level}</p>
            <p className="text-[9px] text-zinc-600 uppercase mt-1">{myData.level.label}</p>
          </Card>
          <Card className="p-4 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Hạng tháng</p>
            <p className="text-2xl font-black text-blue-400 tabular-nums leading-none">
              {myEntry ? `#${myEntry.rank}` : '—'}
            </p>
            <p className="text-[9px] text-zinc-600 uppercase mt-1">tháng này</p>
          </Card>
        </div>
      )}

      {/* XP Progress to next level */}
      {myData && (
        <Card className="p-5 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-lg ${myData.level.bg} ring-1 ${myData.level.ring}`}>
                <span className={`text-xs font-black ${myData.level.color}`}>Lv.{myData.level.level} · {myData.level.label}</span>
              </div>
              {myData.level.xpForNext && (
                <span className="text-[9px] text-zinc-600 font-bold hidden sm:block">
                  → {myData.level.xpForNext.toLocaleString()} XP để lên {LEVEL_DEFS[myData.level.level]?.label}
                </span>
              )}
            </div>
            <span className="text-sm font-black text-zinc-400">{myData.totalXP.toLocaleString()} XP</span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${myData.level.barColor}`}
              style={{ width: `${myData.level.progress}%` }}
            />
          </div>
          {myData.level.xpForNext ? (
            <p className="text-[9px] text-zinc-700 mt-2 font-bold">
              Còn {(myData.level.xpForNext - myData.totalXP).toLocaleString()} XP để đạt <span className={myData.level.color}>{LEVEL_DEFS[myData.level.level]?.label}</span>
            </p>
          ) : (
            <p className="text-[9px] text-orange-600 mt-2 font-bold">Đã đạt cấp độ cao nhất 🏆</p>
          )}
        </Card>
      )}

      {/* Badges */}
      {myData && (
        <Card className="p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">
              Thành tích · {myData.badges.filter(b => b.earned).length}/{myData.badges.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {myData.badges.map(badge => (
              <div
                key={badge.id}
                title={badge.desc}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                  badge.earned
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : 'border-zinc-900 bg-zinc-950 text-zinc-700 opacity-40'
                }`}
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      <div>
        <div className="flex gap-2 mb-4">
          {([
            { key: 'monthly',  label: '🗓 Tháng này' },
            { key: 'alltime',  label: '⏳ Tất cả thời gian' },
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

        <Card className="bg-[#0C0C0E] border-zinc-900 rounded-2xl overflow-hidden">
          <div className="divide-y divide-zinc-900/80">
            {entries.map((entry) => {
              const isMe = entry.employeeId === employeeId;
              const xpShown = tab === 'monthly' ? entry.monthXP : entry.totalXP;
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

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black truncate ${isMe ? 'text-amber-300' : 'text-white'}`}>{entry.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[9px] text-zinc-600 font-bold truncate">{entry.department}</p>
                      <XpBar pct={
                        (() => {
                          const nextLv = LEVEL_DEFS[entry.level];
                          const curLv = LEVEL_DEFS[entry.level - 1];
                          if (!nextLv || !curLv) return 100;
                          return Math.min(100, Math.round(((entry.totalXP - curLv.minXP) / (nextLv.minXP - curLv.minXP)) * 100));
                        })()
                      } barColor={entry.barColor} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span className="text-xs font-black text-orange-400 tabular-nums">{entry.streak}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-amber-400 tabular-nums leading-none">{xpShown.toLocaleString()}</p>
                      <p className="text-[9px] text-zinc-600 font-bold">XP</p>
                    </div>
                    <div className={`hidden lg:block px-2 py-1 rounded-lg text-[8px] font-black uppercase ${entry.levelColor}`}>
                      Lv.{entry.level}
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
    </div>
  );
}
