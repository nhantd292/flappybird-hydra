import GameWrapper from "@/components/GameWrapper";

export default function FlappyPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-blue-200">
            <h1 className="text-3xl font-bold mb-4">Flappy Hydra</h1>
            <GameWrapper />
        </div>
    );
}
