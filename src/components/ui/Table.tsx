import React from 'react';
import { twMerge } from 'tailwind-merge';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto rounded-lg border border-border-dark bg-zinc-900/50">
      <table className={twMerge("w-full text-left text-sm text-zinc-300", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={twMerge("bg-zinc-900 border-b border-border-dark", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={twMerge("divide-y divide-border-dark/50", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr 
      className={twMerge("transition-colors hover:bg-zinc-800/50 data-[state=selected]:bg-indigo-500/10 data-[state=selected]:border-indigo-500/30", className)} 
      {...props} 
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th 
      className={twMerge("px-4 py-3 font-semibold text-zinc-400 align-middle tracking-wider text-xs uppercase", className)} 
      {...props} 
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={twMerge("px-4 py-3 align-middle", className)} {...props} />;
}
