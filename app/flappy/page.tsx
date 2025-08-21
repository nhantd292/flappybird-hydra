'use client';
// import GameWrapper from "@/components/GameWrapper";
import dynamic from 'next/dynamic';
const GameWrapper = dynamic(() => import('@/components/GameWrapper'), {
    ssr: false,   // ✨ khóa SSR
});

export default function FlappyPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-blue-200">
            <div className="mb-5 flex items-center justify-between">
                <h1 className="text-2xl font-extrabold tracking-tight">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mr-5">
                        Flappy Bird on Hydra
                    </span>
                </h1>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                    Hydra
                </span>
            </div>
            <GameWrapper />
        </div>
    );
}
