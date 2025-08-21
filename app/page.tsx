import Image from "next/image";
import Link from "next/link";

type Game = {
  slug: string;
  title: string;
  description: string;
  cover?: string;
  badge?: "Live" | "Soon";
  soon?: boolean;
};

const GAMES: Game[] = [
  {
    slug: "/flappy",
    title: "Flappy Bird on Hydra",
    description: "Web3 at Web2 speed — instant recognition, no network wait.",
    cover: "/flappy-cover.png",
    badge: "Live",
  },
  {
    slug: "#",
    title: "Rock • Paper • Scissors",
    description: "Commit–reveal on Hydra, cost ≈ 0, instant processing.",
    cover: "/rps-cover.jpg",
    badge: "Soon",
    soon: true,
  },
  {
    slug: "#",
    title: "Snake (Realtime)",
    description: "Multiplayer, instant status updates on Hydra.",
    cover: "/snake-cover.png",
    badge: "Soon",
    soon: true,
  },
];

function GameCard({ game }: { game: Game }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/70 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl">
      {/* Cover */}
      <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0">
        {game.cover ? (
          <Image
            src={game.cover}
            alt={game.title}
            fill
            sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            priority={game.slug === "/flappy"}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-indigo-200 to-sky-200" />
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-sky-700 shadow">Hydra</span>
          {game.badge && (
            <span className={game.badge === "Live"
              ? "rounded-full px-2 py-0.5 text-xs font-semibold shadow bg-emerald-100 text-emerald-700"
              : "rounded-full px-2 py-0.5 text-xs font-semibold shadow bg-amber-100 text-amber-700"
            }>
              {game.badge}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">{game.title}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-slate-600">{game.description}</p>
        <div className="mt-auto pt-2">
          {game.soon ? (
            <span aria-disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-400">
              Coming soon
            </span>
          ) : (
            <Link href={game.slug} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:brightness-110">
              Play now <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-blue-50/70 flex flex-col">
      {/* Hero */}
      <header className="relative mx-auto w-full max-w-7xl px-6 pt-14 pb-10 sm:pt-20 sm:pb-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(800px_400px_at_10%_-10%,rgba(147,197,253,0.4),transparent),radial-gradient(600px_300px_at_90%_-10%,rgba(167,139,250,0.35),transparent)]" />
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <div className="mb-3">
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-sky-700 shadow backdrop-blur">Hydra Games</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
            Web3 at Web2 speeds
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Collection of mini-games running on Cardano Hydra: instant transactions,
            near-zero fees, smooth web2 game experience.
          </p>
        </div>
      </header>

      {/* Grid full-height */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14">
        <div className="grid h-full grid-cols-1 gap-6 auto-rows-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => (
            <GameCard key={g.title} game={g} />
          ))}
        </div>
      </main>

      <footer className="border-t bg-white/60 py-6 text-center text-sm text-slate-500">
        Built with Next.js + Tailwind • Powered by Hydra
      </footer>
    </div>
  );
}
