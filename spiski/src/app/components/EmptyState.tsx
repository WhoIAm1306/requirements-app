import React from 'react';
import { SearchX, FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  hasFilters: boolean;
  onReset?: () => void;
}

export function EmptyState({ hasFilters, onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        {hasFilters ? (
          <SearchX className="w-8 h-8 text-slate-400" />
        ) : (
          <FolderOpen className="w-8 h-8 text-slate-400" />
        )}
      </div>

      <h3 className="text-slate-700 mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>
        {hasFilters ? 'Записи не найдены' : 'Реестр пуст'}
      </h3>

      <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
        {hasFilters
          ? 'По заданным фильтрам и условиям поиска ничего не найдено. Попробуйте изменить параметры.'
          : 'Здесь будут отображаться предложения по улучшению и изменениям. Добавьте первую запись.'}
      </p>

      {hasFilters && onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 transition-colors"
        >
          Сбросить фильтры
        </button>
      )}

      {!hasFilters && (
        <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm">
          + Добавить первую запись
        </button>
      )}
    </div>
  );
}
