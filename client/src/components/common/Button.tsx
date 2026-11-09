import clsx from 'clsx';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[0_8px_20px_-8px_rgba(90,69,232,0.7)] hover:bg-brand-700 hover:shadow-[0_10px_24px_-8px_rgba(90,69,232,0.8)]',
  secondary:
    'border border-line bg-white text-ink shadow-sm hover:border-brand-200 hover:bg-brand-50/40',
  ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'border border-xmark/20 bg-white text-xmark-dark hover:bg-xmark-light/60',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 rounded-xl px-3 text-sm',
  md: 'h-11 rounded-2xl px-5 text-sm',
  lg: 'h-14 rounded-2xl px-7 text-base',
};

function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
