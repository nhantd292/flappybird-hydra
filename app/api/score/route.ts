import { NextResponse } from "next/server";

let scores: { name: string; score: number }[] = [
    { name: "Alice", score: 15 },
    { name: "Bob", score: 10 },
    { name: "Charlie", score: 8 }
];

export async function POST(req: Request) {
    const { name, score } = await req.json();
    scores.push({ name, score });
    scores = scores.sort((a, b) => b.score - a.score).slice(0, 10); // Top 10
    return NextResponse.json({ success: true });
}

export async function GET() {
    return NextResponse.json({ leaderboard: scores });
}
