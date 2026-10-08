import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useSoundContext } from '../hooks/useSound';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', icon, className = '', onClick, children, ...rest }: ButtonProps) {
  const { play } = useSoundContext();
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${size === 'lg' ? 'btn--lg' : ''} ${className}`}
      onClick={(event) => {
        play('click');
        onClick?.(event);
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: Omit<ButtonProps, 'children' | 'variant' | 'icon'> & { label: string; children: ReactNode }) {
  return (
    <Button variant="ghost" className={`btn--icon ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </Button>
  );
}
