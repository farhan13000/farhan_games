import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Infinity as InfinityIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { GAME_TYPES, displayNameSchema, type GameType, type RoomSnapshot } from '@arena/shared';
import { Button } from '../../components/common/Button';
import { toApiError } from '../../lib/errors';
import { socketManager } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import { GuestNameField } from '../auth/GuestNameField';
import { useEnsureIdentity } from '../auth/useGuestIdentity';
import { GamePicker } from './GamePicker';

export function CreateRoomPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { needsName, ensure } = useEnsureIdentity();
  const profile = useAuthStore((s) => s.profile);
  const [serverError, setServerError] = useState<string | null>(null);
  const initialGame = (GAME_TYPES as readonly string[]).includes(params.get('game') ?? '')
    ? (params.get('game') as GameType)
    : 'tic-tac-toe';

  const schema = useMemo(
    () =>
      z.object({
        gameType: z.enum(GAME_TYPES),
        displayName: needsName ? displayNameSchema : z.string().optional(),
      }),
    [needsName],
  );
  type FormValues = z.input<typeof schema>;

  const { register, handleSubmit, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gameType: initialGame, displayName: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await ensure(values.displayName || undefined);
      const { snapshot } = await socketManager.request<{ snapshot: RoomSnapshot }>('room:create', {
        gameType: values.gameType,
      });
      navigate(`/room/${snapshot.roomCode}`);
    } catch (err) {
      setServerError(toApiError(err).message);
    }
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 animate-fade-up">
        <p className="eyebrow">New private room</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Create your room
        </h1>
        <p className="mt-2 text-ink-soft">
          {profile ? `Hi ${profile.displayName}! ` : ''}One room, one partner, as many games as you
          like.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="card space-y-7 p-5 sm:p-8">
        {needsName && (
          <GuestNameField
            registration={register('displayName')}
            error={formState.errors.displayName?.message}
          />
        )}

        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Create private room <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>

        {serverError && (
          <p
            role="alert"
            className="rounded-2xl bg-xmark-light/60 px-4 py-3 text-sm font-medium text-xmark-dark"
          >
            {serverError}
          </p>
        )}

        <div className="flex items-start gap-3 rounded-2xl bg-brand-50/60 p-4 text-sm text-ink-soft">
          <InfinityIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <p>
            No accounts, no limits. Share the code, then play rematches or switch between all 12
            games whenever you both agree.
          </p>
        </div>

        <GamePicker value={watch('gameType') as GameType} registration={register('gameType')} />
      </form>
    </div>
  );
}
