'use client';
import { useState } from "react";
import FlappyBird from "./FlappyBird";
import Leaderboard from "./Leaderboard";
import Transactions from "./Transactions";
import NameInput from "./NameInput";

export default function GameWrapper() {
    const [playerName, setPlayerName] = useState<string | null>(null);

    if (!playerName) return <NameInput onSubmit={setPlayerName} />;

    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mx-auto p-4">
            <div className="w-full lg:w-1/4 flex flex-col gap-4">
                <div className="flex-1 flex flex-col items-center bg-white rounded-lg shadow p-2">
                    <span className="truncate text-base font-semibold text-slate-800">Player: {playerName}</span>
                </div>
                <Leaderboard />
            </div>
            {/* Game */}
            <div className="flex-1 flex flex-col items-center bg-white rounded-lg shadow p-4">
                <FlappyBird />
            </div>
            {/* Leaderboard + Stats */}
            <div className="w-full lg:w-1/4 flex flex-col gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <Transactions />
                </div>
            </div>
        </div>
    );
}
