import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  fullScreen?: boolean;
}

export function LoadingState({ text = "Loading...", fullScreen = false, className, ...props }: LoadingStateProps) {
  return (
    <div 
      className={twMerge(
        "flex flex-col items-center justify-center text-zinc-500",
        fullScreen ? "fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50" : "p-12",
        className
      )}
      {...props}
    >
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
      <span className="text-sm font-medium tracking-wide animate-pulse">{text}</span>
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={twMerge("animate-pulse rounded-md bg-zinc-800/50", className)} 
      {...props}
    />
  );
}
