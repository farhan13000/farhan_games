import { UserRound } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { DISPLAY_NAME_MAX_LENGTH } from '@arena/shared';
import { Field } from '../../components/common/Field';

/** Display-name input shown to visitors who have not picked a name yet. No accounts. */
export function GuestNameField({
  registration,
  error,
}: {
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <Field
      label="Your display name"
      placeholder="e.g. Sunny"
      autoComplete="nickname"
      maxLength={DISPLAY_NAME_MAX_LENGTH}
      icon={<UserRound className="h-4 w-4" />}
      error={error}
      hint="No sign-up. Your partner just sees this name."
      {...registration}
    />
  );
}
