import { Home, Ticket } from 'lucide-react';
import { ButtonLink } from '../components/common/Button';
import { Mark } from '../components/game/Mark';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div
        className="flex items-center gap-1 text-7xl font-extrabold tracking-tight text-ink"
        aria-hidden="true"
      >
        4<Mark mark="O" className="h-16 w-16" />4
      </div>
      <h1 className="mt-4 text-2xl font-extrabold">This square is empty</h1>
      <p className="mt-2 text-ink-soft">The page you're looking for doesn't exist or has moved.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/">
          <Home className="h-4 w-4" aria-hidden="true" /> Home
        </ButtonLink>
        <ButtonLink to="/join" variant="secondary">
          <Ticket className="h-4 w-4" aria-hidden="true" /> Join a room
        </ButtonLink>
      </div>
    </section>
  );
}
