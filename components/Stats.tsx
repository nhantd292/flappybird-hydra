'use client';
import { useEffect, useState } from "react";

export default function Stats() {
    const [players, setPlayers] = useState(0);
    const [tps, setTps] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlayers(Math.floor(Math.random() * 50));
            setTps(Math.floor(Math.random() * 20));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <p className="text-lg">User online: {players}</p>
            <p className="text-lg">TPS: {tps}</p>
        </div>
    );
}
