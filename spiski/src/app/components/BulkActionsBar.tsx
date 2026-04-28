import React from 'react';
import { Archive, Trash2, Unlink, X, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onUnlink: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onArchive,
  onDelete,
  onUnlink,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-2xl bg-slate-900 shadow-2xl shadow-slate-900/30 border border-slate-700/50">
            {/* Counter */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
              <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white whitespace-nowrap">
                {selectedCount} {selectedCount === 1 ? 'запись выбрана' : selectedCount < 5 ? 'записи выбраны' : 'записей выбрано'}
              </span>
            </div>

            {/* Actions */}
            <button
              onClick={onArchive}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              Архивировать
            </button>

            <button
              onClick={onUnlink}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              <Unlink className="w-3.5 h-3.5" />
              Отвязать ГК
            </button>

            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-900/50 hover:bg-red-800/60 text-red-300 text-sm font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить
            </button>

            <div className="w-px h-5 bg-slate-700 mx-1" />

            {/* Close */}
            <button
              onClick={onClear}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Снять выделение"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
