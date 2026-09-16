'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  iconBgColor?: string;
  iconColor?: string;
}

export default function StatCard({
  icon: Icon,
  value,
  label,
  iconBgColor = 'bg-amber-100 dark:bg-amber-950/50',
  iconColor = 'text-amber-800 dark:text-amber-300',
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-stone-800 rounded-3xl p-4 sm:p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-400/50 dark:hover:border-amber-400/40 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 group">
      <div className={`w-12 h-12 rounded-2xl ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">{value}</div>
        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">{label}</div>
      </div>
    </div>
  );
}
