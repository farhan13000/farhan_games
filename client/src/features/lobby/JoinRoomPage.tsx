import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Hash } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { displayNameSchema, extractRoomCode, type RoomPreview } from '@arena/shared';
import { Button } from '../../components/common/Button';
import { Field } from '../../components/common/Field';
import { toApiError } from '../../lib/errors';
import { socketManager } from '../../lib/socket';
import { GuestNameField } from '../auth/GuestNameField';
import { useEnsureIdentity } from '../auth/useGuestIdentity';

export function JoinRoomPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { needsName, ensure } = useEnsureIdentity();

  const schema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .min(1, 'Enter a room code or paste an invite link')
          .refine(
            (v) => extractRoomCode(v) !== null,
            'Enter a 6-character code like ABC-234 or paste an invite link',
          ),
        displayName: needsName ? displayNameSchema : z.string().optional(),
      }),
    [needsName],
  );
  type FormValues = z.input<typeof schema>;

  const { register, handleSubmit, formState, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: params.get('code') ?? '', displayName: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const roomCode = extractRoomCode(values.code)!;
    try {
      await ensure(values.displayName || undefined);
      const preview = await socketManager.request<RoomPreview>('room:preview', { roomCode });
      if (!preview.joinable) {
        setError('code', {
          message:
            preview.status === 'WAITING_FOR_PLAYER'
              ? 'That room is full.'
              : 'That game has already started with two players.',
        });
        return;
      }
      if (!preview.isMember) await socketManager.request('room:join', { roomCode });
      navigate(`/room/${roomCode}`);
    } catch (err) {
      const error = toApiError(err);
      setError(error.code === 'VALIDATION_ERROR' && needsName ? 'displayName' : 'code', {
        message: error.message,
      });
    }
  });

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 animate-fade-up text-center">
        <p className="eyebrow">Got an invite?</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Join a room</h1>
        <p className="mt-2 text-ink-soft">
          Enter the room code your friend shared, or paste the whole invite link.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="card space-y-5 p-5 sm:p-8">
        <Field
          label="Room code or invite link"
          placeholder="ABC-234"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          icon={<Hash className="h-4 w-4" />}
          className="[&_input]:font-mono [&_input]:text-lg [&_input]:tracking-wider"
          error={formState.errors.code?.message}
          {...register('code')}
        />
        {needsName && (
          <GuestNameField
            registration={register('displayName')}
            error={formState.errors.displayName?.message}
          />
        )}
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Join game <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
