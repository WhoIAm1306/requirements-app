import React from 'react';
import { Variant } from './registry/types';
import { COL_STYLE } from './ColumnHeaders';

interface SkeletonRowProps {
  variant: Variant;
  index: number;
}

function SkeletonPulse({ className }: { className: string }) {
  return (
    <div className={`rounded animate-pulse bg-slate-100 ${className}`} />
  );
}

export function SkeletonRow({ variant, index }: SkeletonRowProps) {
  const isA = variant === 'A';
  const rowHeight = isA ? 'h-[48px]' : 'h-[56px]';
  const opacity = index === 0 ? 1 : index === 1 ? 0.8 : index === 2 ? 0.6 : 0.4;

  return (
    <div
      className={`grid items-center px-3 ${rowHeight}
        ${isA
          ? 'border-b border-slate-100 border-l-[3px] border-l-transparent'
          : 'rounded-xl border border-slate-100'
        }
        bg-white`}
      style={{ ...COL_STYLE, opacity }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <SkeletonPulse className="w-4 h-4 rounded" />
      </div>

      {/* ID */}
      <div className="flex flex-col gap-1 pr-3">
        <SkeletonPulse className="h-4 w-14 rounded" />
        <SkeletonPulse className="h-2.5 w-8 rounded" />
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5 pr-4">
        <SkeletonPulse className={`h-3.5 rounded ${index % 3 === 0 ? 'w-3/4' : index % 3 === 1 ? 'w-5/6' : 'w-2/3'}`} />
        {!isA && <SkeletonPulse className="h-2.5 w-1/3 rounded" />}
      </div>

      {/* Status */}
      <div className="pr-3">
        <SkeletonPulse className="h-5 w-24 rounded-full" />
      </div>

      {/* Initiator */}
      <div className="flex flex-col gap-1 pr-3">
        <SkeletonPulse className="h-3.5 w-24 rounded" />
        <SkeletonPulse className="h-2.5 w-20 rounded" />
      </div>

      {/* Responsible */}
      <div className="flex flex-col gap-1 pr-3">
        <SkeletonPulse className="h-3.5 w-24 rounded" />
        <SkeletonPulse className="h-2.5 w-16 rounded" />
      </div>

      {/* GK */}
      <div className="flex flex-col gap-1 pr-3">
        <SkeletonPulse className="h-3.5 w-20 rounded" />
        <SkeletonPulse className="h-2.5 w-12 rounded" />
      </div>

      {/* Updated */}
      <div className="pr-3">
        <SkeletonPulse className="h-3.5 w-16 rounded" />
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        <SkeletonPulse className="w-6 h-6 rounded-md" />
      </div>
    </div>
  );
}
