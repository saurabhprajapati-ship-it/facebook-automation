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
  iconBgColor = 'bg-brand-yellow',
  iconColor = 'text-amber-950',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-cream-200/80 shadow-soft flex items-center gap-4 transition hover:-translate-y-0.5">
      <div className={`w-12 h-12 rounded-2xl ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0 shadow-xs`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-black text-stone-900 tracking-tight">{value}</div>
        <div className="text-xs font-semibold text-stone-500">{label}</div>
      </div>
    </div>
  );
}
