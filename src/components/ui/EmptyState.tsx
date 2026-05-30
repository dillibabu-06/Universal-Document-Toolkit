import React from 'react';
import { twMerge } from 'tailwind-merge';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div 
      className={twMerge(
        "flex flex-col items-center justify-center p-12 text-center text-zinc-500 animate-in fade-in zoom-in-95 duration-300",
        className
      )} 
      {...props}
    >
      <div className="mb-4 text-zinc-600 opacity-60">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-zinc-300 mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
