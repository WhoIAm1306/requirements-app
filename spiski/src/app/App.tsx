import React, { useState } from 'react';
import { RegistryPage } from './RegistryPage';
import { DesignSystemPanel } from './components/DesignSystemPanel';
import { Variant, ViewState } from './components/registry/types';

type AppTab = 'registry' | 'design-system';

export default function App() {
  const [variant, setVariant] = useState<Variant>('A');
  const [viewState, setViewState] = useState<ViewState>('normal');
  const [activeTab, setActiveTab] = useState<AppTab>('registry');

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden" style={{ minWidth: '1024px' }}>
      {/* Top control bar */}
      <div className="flex items-center justify-between px-5 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0 z-50">
        <div className="flex items-center gap-4">
          {/* Logo/name */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">РП</span>
            </div>
            <span className="text-white text-xs font-semibold tracking-wide">B2B Prototype</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
            {([
              { id: 'registry', label: 'Реестр предложений' },
              { id: 'design-system', label: 'Design System' },
            ] as { id: AppTab; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'registry' && (
          <div className="flex items-center gap-4">
            {/* Variant toggle */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Вариант:</span>
              <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
                {(['A', 'B'] as Variant[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariant(v)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                      ${variant === v
                        ? v === 'A'
                          ? 'bg-slate-200 text-slate-800 shadow-sm'
                          : 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {v === 'A' ? 'A — Табличный' : 'B — Карточный'}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            {/* View state toggle */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Состояние:</span>
              <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
                {([
                  { id: 'normal', label: 'Данные' },
                  { id: 'loading', label: 'Загрузка' },
                  { id: 'empty', label: 'Пустой' },
                ] as { id: ViewState; label: string }[]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setViewState(s.id)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                      ${viewState === s.id
                        ? 'bg-slate-200 text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            {/* Current variant badge */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                  ${variant === 'A'
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-blue-900/60 text-blue-300'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {variant === 'A'
                  ? 'Строгий: радиус 0, без тени, h-48px'
                  : 'Мягкий: rounded-xl, shadow-md, h-56px'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'registry' ? (
          <div className="h-full flex flex-col">
            {/* Variant label banner */}
            <div
              className={`flex items-center justify-between px-6 py-1.5 text-xs font-medium flex-shrink-0
                ${variant === 'A'
                  ? 'bg-slate-100 border-b border-slate-200 text-slate-500'
                  : 'bg-blue-50 border-b border-blue-100 text-blue-600'
                }`}
            >
              <span>
                {variant === 'A'
                  ? '▣  Вариант A — «Табличный»: строгие грани, компактные строки 48px, вертикальные разделители slate-100, без тени, border-radius 0'
                  : '◈  Вариант B — «Карточный»: скруглённые карточки 56px, тень shadow-sm↗hover:shadow-md, зазор 6px между строками, мягкие разделители slate-50'
                }
              </span>
              <span className="text-slate-400">
                {variant === 'A' ? 'Лучше для: аналитики, операционные команды, 500+ строк' : 'Лучше для: PM, руководители, 30–100 записей'}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <RegistryPage variant={variant} viewState={viewState} />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto bg-slate-50">
            <DesignSystemPanel />
          </div>
        )}
      </div>
    </div>
  );
}
