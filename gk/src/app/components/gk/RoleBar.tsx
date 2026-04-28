import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types/gk';

interface Props {
  role: UserRole;
  onChange: (role: UserRole) => void;
}

const roles: { value: UserRole; label: string; desc: string; color: string; bg: string }[] = [
  { value: 'superuser', label: 'Superuser', desc: 'Полный доступ', color: '#EF4444', bg: '#FEF2F2' },
  { value: 'edit',      label: 'Editor',    desc: 'Редактирование', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'read',      label: 'Viewer',    desc: 'Просмотр',      color: '#64748B', bg: '#F8FAFC' },
];

export function RoleBar({ role, onChange }: Props) {
  const current = roles.find((r) => r.value === role)!;
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#D97706' }} />
      <span className="text-xs" style={{ color: '#92400E', fontWeight: 500 }}>Демо-режим — смена роли:</span>
      <div className="flex items-center gap-1">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => onChange(r.value)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all border"
            style={
              role === r.value
                ? { background: r.bg, color: r.color, borderColor: r.color, fontWeight: 600 }
                : { background: 'white', color: '#64748B', borderColor: '#DCE3EE', fontWeight: 400 }
            }
          >
            {r.label}
            {role === r.value && <span className="opacity-60">({r.desc})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
