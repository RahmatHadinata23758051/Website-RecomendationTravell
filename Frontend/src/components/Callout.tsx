import React from 'react';
import { AlertCircle, CheckCircle2, Info, Lightbulb, type LucideIcon } from 'lucide-react';

export type CalloutVariant = 'info' | 'success' | 'warning' | 'error' | 'tip';

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

const variantStyles: Record<CalloutVariant, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  tip: 'border-teal-200 bg-teal-50 text-teal-900',
};

const variantIcons: Record<CalloutVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
  tip: Lightbulb,
};

/** A semantic, accessible message surface. Amber is reserved for actual warnings. */
export const Callout: React.FC<CalloutProps> = ({
  variant = 'info',
  title,
  children,
  icon,
  className = '',
}) => {
  const Icon = icon || variantIcons[variant];

  return (
    <div
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'note'}
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-5 ${variantStyles[variant]} ${className}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  );
};
