import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Toolbar({ className, orientation = 'horizontal', children, ...props }: ToolbarProps) {
  return (
    <div 
      className={twMerge(
        'flex items-center gap-2 rounded-lg bg-zinc-900/80 p-1 border border-border-dark shadow-sm',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ToolbarSeparator({ className, orientation = 'horizontal' }: { className?: string, orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div 
      className={twMerge(
        'bg-zinc-800',
        orientation === 'horizontal' ? 'w-px h-5 mx-1' : 'h-px w-5 my-1',
        className
      )}
    />
  );
}
