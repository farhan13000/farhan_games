import {
  ArrowRight,
  Heart,
  Infinity as InfinityIcon,
  Link2,
  MessageCircle,
  Plus,
  RefreshCcw,
  Shuffle,
  Sparkles,
  Ticket,
  UserX,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CATEGORY_INFO, CATEGORY_ORDER, GAME_LIST, gamesInCategory } from '@arena/shared';
import { ButtonLink } from '../../components/common/Button';
import { GamePreview } from '../../components/game/GamePreview';
import { HeroBoard } from '../../components/game/HeroBoard';
import { config } from '../../lib/config';

const STEPS = [
  {
    icon: Plus,
    title: 'Create a room',
    text: 'Type a name. That’s it: no sign-up, no email, no password.',
  },
  {
    icon: Link2,
    title: 'Send the link',
    text: 'Share the code or link with your partner, bestie or crush.',
  },
  {
    icon: Shuffle,
    title: 'Play anything',
    text: 'Rematch, or hop to another game whenever you both agree.',
  },
];

const FEATURES = [
  {
    icon: UserX,
    title: 'No login, ever',
    text: 'Just pick a display name. We never ask for an email.',
  },
  {
    icon: InfinityIcon,
    title: 'Unlimited rounds',
    text: 'Stay in one room and keep playing all evening.',
  },
  {
    icon: RefreshCcw,
    title: 'Reconnect-safe',
    text: 'Lost Wi-Fi or refreshed? Your seat is held while you return.',
  },
  {
    icon: MessageCircle,
    title: 'Chat & reactions',
    text: 'Tease each other with in-room chat and live emoji.',
  },
];

export function LandingPage() {
  return (
    <div className="space-y-20 sm:space-y-24">
      {/* Hero */}
      <section className="grid items-center gap-12 pt-2 lg:grid-cols-[1.1fr_0.9fr] lg:pt-8">
        <div className="animate-fade-up">
          <span className="chip">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />{' '}
            {GAME_LIST.length} games · No login · Free
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Your private
            <br />
            <span className="relative whitespace-nowrap text-brand-600">
              game night.
              <svg
                viewBox="0 0 300 12"
                className="absolute -bottom-2 left-0 w-full"
                aria-hidden="true"
              >
                <path
                  d="M2 9 C 80 2, 220 2, 298 8"
                  stroke="#A9A2FF"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink-soft">
            {config.appName} is a two-player room for you and your favourite person. Couple quizzes,
            brainy strategy battles and quick classics, all in one link.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/create" size="lg">
              <Plus className="h-5 w-5" aria-hidden="true" /> Create Private Room
            </ButtonLink>
            <ButtonLink to="/join" size="lg" variant="secondary">
              <Ticket className="h-5 w-5" aria-hidden="true" /> Join Room
            </ButtonLink>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-xmark" aria-hidden="true" /> Made for couples & best
              friends
            </li>
            <li className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" aria-hidden="true" /> Ready in 5 seconds
            </li>
          </ul>
        </div>
        <div className="relative mx-auto flex w-full max-w-sm items-center justify-center py-8 lg:max-w-none">
          <div
            className="absolute inset-6 -z-10 rounded-full bg-brand-200/40 blur-3xl"
            aria-hidden="true"
          />
          <HeroBoard />
        </div>
      </section>

      {/* Games by category */}
      {CATEGORY_ORDER.map((cat) => (
        <section key={cat} aria-labelledby={`games-${cat}`}>
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">
                {CATEGORY_INFO[cat].emoji}{' '}
                {cat === 'social'
                  ? 'For two hearts'
                  : cat === 'strategy'
                    ? 'Big brain time'
                    : 'Quick fun'}
              </p>
              <h2 id={`games-${cat}`} className="mt-2 text-3xl font-extrabold tracking-tight">
                {CATEGORY_INFO[cat].title}
              </h2>
            </div>
            <p className="max-w-sm text-sm text-ink-muted">{CATEGORY_INFO[cat].blurb}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gamesInCategory(cat).map((game, i) => (
              <Link
                key={game.id}
                to={`/create?game=${game.id}`}
                className="card group flex animate-fade-up flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lift"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-canvas to-brand-50/60 transition group-hover:from-brand-50/50">
                  <GamePreview
                    gameType={game.id}
                    className="transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold leading-tight">{game.name}</h3>
                    <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {game.duration}
                    </span>
                  </div>
                  <p className="mt-1 flex-1 text-sm text-ink-muted">{game.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700">
                    {game.coop ? 'Play together' : 'Play now'}{' '}
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* How it works */}
      <section aria-labelledby="how-title" className="card overflow-hidden">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-200">
              How it works
            </p>
            <h2 id="how-title" className="mt-3 text-3xl font-extrabold tracking-tight">
              One room. Endless games.
            </h2>
            <p className="mt-4 text-brand-100">
              Rooms are private and invite-only, with random, hard-to-guess codes. Only the two of
              you can play, and the server referees every move.
            </p>
          </div>
          <ol className="grid gap-px bg-line sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="bg-white p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold text-ink-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="features-title">
        <h2 id="features-title" className="sr-only">
          Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl border border-line/80 bg-white/70 p-5">
              <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card flex flex-col items-center gap-5 bg-gradient-to-br from-white to-brand-50 px-6 py-12 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Your partner is one link away.</h2>
        <p className="max-w-md text-ink-soft">
          Start a room, send the link, and see who really knows who.
        </p>
        <ButtonLink to="/create" size="lg">
          Start playing <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </ButtonLink>
      </section>
    </div>
  );
}
