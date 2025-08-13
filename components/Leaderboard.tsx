'use client';
import { useEffect, useState } from "react";

export default function Leaderboard() {
    const [data, setData] = useState<{ name: string; score: number }[]>([]);

    async function fetchLeaderboard() {
        const res = await fetch("/api/score");
        const json = await res.json();
        setData(json.leaderboard);
    }

    useEffect(() => {
        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 3000); // Refresh 3s
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <h2 className="text-xl font-bold mb-2">Leader Board</h2>
            <ul>
                {data.map((p, i) => (
                    <li key={i} className="py-1 border-b">
                        {i + 1}. {p.name}: {p.score}
                    </li>
                ))}
            </ul>
        </div>
    );
}
