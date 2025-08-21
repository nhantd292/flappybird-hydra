'use client';
import { useEffect, useRef, useState } from 'react';
import { datumFromHex } from '@/lib/datumProcess';

type PlayerRaw = {
    name?: string;
    score?: number | string;
    best_score?: number | string;
    utc_time?: string;
};

type Player = Required<Pick<PlayerRaw, 'name'>> &
    Partial<Pick<PlayerRaw, 'score' | 'best_score' | 'utc_time'>> & {
        effectiveScore: number; // best_score ?? score ?? 0
    };

/** UTXO item từ API: chỉ cần inlineDatumRaw */
type SnapshotUtxo = { inlineDatumRaw?: string | null };
type SnapshotResponse = { data?: Record<string, SnapshotUtxo> };

export default function Leaderboard() {
    const [players, setPlayers] = useState<Player[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        let aborted = false;

        async function load() {
            try {
                const res = await fetch(
                    'https://game-flappybird-api.hydrawallet.app/hydra/snapshot/utxo',
                    { cache: 'no-store' }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const json = (await res.json()) as SnapshotResponse;
                const utxos: Record<string, SnapshotUtxo> = json.data ?? {};

                const byName = new Map<string, Player>();

                // ✅ không dùng any
                for (const item of Object.values(utxos)) {
                    if (!item?.inlineDatumRaw) continue;

                    try {
                        const d = datumFromHex(item.inlineDatumRaw) as PlayerRaw;
                        const name = (d?.name ?? '').trim();
                        if (!name) continue;

                        // chỉ nhận item có best_score (kể cả 0)
                        const rawBest = d?.best_score;
                        if (rawBest === undefined || rawBest === null) continue;

                        const best =
                            typeof rawBest === 'string' ? Number(rawBest) : rawBest;
                        if (!Number.isFinite(best)) continue;

                        const candidate: Player = {
                            name,
                            best_score: best,
                            utc_time: d?.utc_time,
                            effectiveScore: best,
                        };

                        const cur = byName.get(name);
                        if (!cur || candidate.effectiveScore > cur.effectiveScore) {
                            byName.set(name, candidate);
                        }
                    } catch {
                        // skip bad datum
                    }
                }

                const next = Array.from(byName.values())
                    .sort((a, b) => b.effectiveScore - a.effectiveScore)
                    .slice(0, 10);

                if (!aborted) {
                    if (JSON.stringify(players) !== JSON.stringify(next)) {
                        setPlayers(next);
                    }
                }
            } catch (e) {
                if (!aborted) console.error('leaderboard fetch error:', e);
            }
        }

        load();
        timerRef.current = setInterval(load, 3000);

        return () => {
            aborted = true;
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const topScore = players[0]?.effectiveScore ?? 0;

    return (
        <div className="">
            <div className="mx-auto w-full max-w-xl rounded-xl border border-black/5 bg-white shadow-xl backdrop-blur-md">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                    <h2 className="text-xl font-bold tracking-tight">Leader Board</h2>
                    <div className="flex items-center gap-2">
                        <span className="relative inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                            <span className="absolute left-1.5 h-2 w-2 animate-ping rounded-full bg-emerald-500 opacity-75" />
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Live
                        </span>
                    </div>
                </div>

                {/* Top 3 */}
                <div className="grid grid-cols-1 gap-3 px-5 sm:grid-cols-3 sm:px-6">
                    {players.slice(0, 3).map((p, i) => (
                        <TopCard key={p.name} rank={i + 1} name={p.name} score={p.effectiveScore} />
                    ))}
                </div>

                <div className="mx-5 my-4 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent sm:mx-6" />

                {/* List */}
                <div className="px-2 pb-4 sm:px-3 sm:pb-6">
                    {players.length === 0 ? (
                        <SkeletonList />
                    ) : players.length <= 3 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Not player #4</div>
                    ) : (
                        <ul className="divide-y divide-black/5">
                            {players.slice(3).map((p, i) => {
                                const rank = i + 4;
                                return (
                                    <li
                                        key={p.name}
                                        className="group flex items-center gap-3 px-3 py-2 transition hover:bg-black/[0.03] sm:gap-4"
                                    >
                                        <span className="w-6 shrink-0 text-center text-sm font-semibold text-gray-500">
                                            {rank}
                                        </span>

                                        <Avatar name={p.name} rank={rank} />

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline justify-between gap-3">
                                                <p className="truncate text-sm font-medium">{p.name}</p>
                                                <p className="tabular-nums text-sm font-semibold">{p.effectiveScore}</p>
                                            </div>

                                            <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                                                <div
                                                    className="h-2 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${topScore ? Math.max(4, (p.effectiveScore / topScore) * 100) : 0}%`,
                                                        background:
                                                            rank === 4
                                                                ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                                                                : rank === 5
                                                                    ? 'linear-gradient(90deg,#9ca3af,#d1d5db)'
                                                                    : rank === 6
                                                                        ? 'linear-gradient(90deg,#b45309,#f59e0b)'
                                                                        : 'linear-gradient(90deg,#3b82f6,#60a5fa)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ---------- UI helpers ---------- */

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? '')
        .join('');
}

function Avatar({ name, rank }: { name: string; rank: number }) {
    const bg =
        rank === 1
            ? 'bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-900'
            : rank === 2
                ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800'
                : rank === 3
                    ? 'bg-gradient-to-br from-amber-700 to-amber-500 text-amber-50'
                    : 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white';

    return (
        <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm ring-1 ring-black/5 ${bg}`}
            title={name}
        >
            <span className="text-xs font-bold">{initials(name) || '🏅'}</span>
        </div>
    );
}

function TopCard({ rank, name, score }: { rank: number; name: string; score: number }) {
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
    const bg =
        rank === 1
            ? 'from-amber-200/80 to-yellow-100/70'
            : rank === 2
                ? 'from-gray-200/80 to-gray-100/70'
                : 'from-amber-100/80 to-orange-50/70';

    return (
        <div className={`rounded-xl border border-black/5 bg-gradient-to-br ${bg} p-2 shadow-md flex flex-col items-center`}>
            <div className="flex items-center">
                <span className="truncate text-sm font-semibold">{name}</span>
            </div>
            <div className="flex items-center">
                <span className="text-2xl">{medal}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
                <span className="tabular-nums text-lg font-bold">{score}</span>
            </div>
        </div>
    );
}

function SkeletonList() {
    return (
        <ul className="animate-pulse space-y-2 px-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3">
                    <div className="h-4 w-6 rounded bg-gray-200" />
                    <div className="h-9 w-9 rounded-full bg-gray-200" />
                    <div className="flex-1">
                        <div className="h-3 w-1/3 rounded bg-gray-200" />
                        <div className="mt-2 h-2 w-full rounded bg-gray-100" />
                    </div>
                </li>
            ))}
        </ul>
    );
}
