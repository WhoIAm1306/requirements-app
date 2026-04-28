import React from 'react';
import { StatusBadge } from './StatusBadge';
import { PriorityChip } from './PriorityChip';
import { Status } from './registry/types';

// Color swatch
function Swatch({ color, label, hex }: { color: string; label: string; hex: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-10 h-10 rounded-xl border border-black/5 ${color}`} />
      <span className="text-[11px] text-slate-500 text-center leading-tight">{label}</span>
      <span className="text-[10px] text-slate-400 font-mono">{hex}</span>
    </div>
  );
}

// Typography specimen
function TypeSpecimen({ size, weight, label, text }: { size: string; weight: string; label: string; text: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <div className="w-28 flex-shrink-0">
        <span className="text-[11px] font-mono text-slate-400">{size} / {weight}</span>
        <div className="text-[10px] text-slate-400">{label}</div>
      </div>
      <span className="text-slate-800" style={{ fontSize: size, fontWeight: weight }}>{text}</span>
    </div>
  );
}

// Row state demo
function RowStateDemo({ label, bg, border, note }: { label: string; bg: string; border: string; note: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 h-11 rounded-lg border-l-[3px] flex items-center px-3 ${bg} ${border}`}>
        <div className="flex items-center gap-3 w-full">
          <div className="w-4 h-4 rounded border-2 border-current opacity-40" />
          <div className="w-14 h-3 rounded bg-current opacity-20" />
          <div className="flex-1 h-3 rounded bg-current opacity-15" />
          <div className="w-20 h-4 rounded-full bg-current opacity-20" />
        </div>
      </div>
      <div className="w-44 flex-shrink-0">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{note}</p>
      </div>
    </div>
  );
}

// Annotation card
function AnnotationCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUSES: Status[] = ['new', 'review', 'in_progress', 'approved', 'rejected', 'archived_completed', 'archived_outdated'];

export function DesignSystemPanel() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">DS</span>
          </div>
          <h2 className="text-slate-900" style={{ fontSize: '18px', fontWeight: 600 }}>
            Mini Design System — Реестр предложений
          </h2>
        </div>
        <p className="text-sm text-slate-500 ml-11">
          Документация визуальной системы для компонента «card-table» реестра
        </p>
      </div>

      {/* Colors */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <h3 className="text-slate-800" style={{ fontSize: '14px', fontWeight: 600 }}>🎨 Палитра цветов</h3>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Нейтральная</p>
          <div className="flex gap-4 flex-wrap">
            <Swatch color="bg-slate-50" label="50" hex="#F8FAFC" />
            <Swatch color="bg-slate-100" label="100" hex="#F1F5F9" />
            <Swatch color="bg-slate-200" label="200" hex="#E2E8F0" />
            <Swatch color="bg-slate-300" label="300" hex="#CBD5E1" />
            <Swatch color="bg-slate-400" label="400" hex="#94A3B8" />
            <Swatch color="bg-slate-500" label="500" hex="#64748B" />
            <Swatch color="bg-slate-700" label="700" hex="#334155" />
            <Swatch color="bg-slate-900" label="900" hex="#0F172A" />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Акцентная (Primary)</p>
          <div className="flex gap-4 flex-wrap">
            <Swatch color="bg-blue-50" label="50" hex="#EFF6FF" />
            <Swatch color="bg-blue-100" label="100" hex="#DBEAFE" />
            <Swatch color="bg-blue-300" label="300" hex="#93C5FD" />
            <Swatch color="bg-blue-500" label="500" hex="#3B82F6" />
            <Swatch color="bg-blue-600" label="600" hex="#2563EB" />
            <Swatch color="bg-blue-700" label="700" hex="#1D4ED8" />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Статусные цвета</p>
          <div className="flex gap-4 flex-wrap">
            <Swatch color="bg-blue-500" label="Новое" hex="#3B82F6" />
            <Swatch color="bg-amber-500" label="На рассм." hex="#F59E0B" />
            <Swatch color="bg-violet-500" label="В работе" hex="#8B5CF6" />
            <Swatch color="bg-emerald-500" label="Согласовано" hex="#10B981" />
            <Swatch color="bg-red-500" label="Отклонено" hex="#EF4444" />
            <Swatch color="bg-teal-500" label="Завершено" hex="#14B8A6" />
            <Swatch color="bg-orange-400" label="Устарело" hex="#FB923C" />
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h3 className="text-slate-800" style={{ fontSize: '14px', fontWeight: 600 }}>✍️ Типографика (Inter)</h3>
        <div className="space-y-4 divide-y divide-slate-100">
          <TypeSpecimen size="20px" weight="600" label="Заголовок страницы" text="Реестр предложений" />
          <div className="pt-4">
            <TypeSpecimen size="14px" weight="600" label="Заголовок секции" text="Основная информация по предложению" />
          </div>
          <div className="pt-4">
            <TypeSpecimen size="14px" weight="500" label="Текст строки (title)" text="Внедрение модуля управления проектами в SAP S/4HANA" />
          </div>
          <div className="pt-4">
            <TypeSpecimen size="13px" weight="400" label="Мета-текст (org, dept)" text="АО «Газпром Нефть» · Отдел разработки" />
          </div>
          <div className="pt-4">
            <TypeSpecimen size="12px" weight="400" label="Вспомогательный (дата, ID)" text="22.04.2025" />
          </div>
          <div className="pt-4">
            <TypeSpecimen size="11px" weight="600" label="Заголовок колонки (CAPS)" text="НАИМЕНОВАНИЕ ПРЕДЛОЖЕНИЯ" />
          </div>
        </div>
      </section>

      {/* Spacing & Radius */}
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-slate-800 mb-4" style={{ fontSize: '14px', fontWeight: 600 }}>📐 Радиусы</h3>
          <div className="space-y-3">
            {[
              { r: 'rounded', px: '4px', label: 'ID-чип (Variant A)' },
              { r: 'rounded-lg', px: '8px', label: 'Кнопки, инпуты' },
              { r: 'rounded-xl', px: '12px', label: 'Карточка (Variant B), дропдауны' },
              { r: 'rounded-2xl', px: '16px', label: 'Панели, модали' },
              { r: 'rounded-full', px: '999px', label: 'Бейджи статусов' },
            ].map(({ r, px, label }) => (
              <div key={px} className="flex items-center gap-3">
                <div className={`w-12 h-8 border-2 border-blue-300 bg-blue-50 ${r}`} />
                <div>
                  <span className="text-xs font-mono text-slate-600">{px}</span>
                  <p className="text-[11px] text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-slate-800 mb-4" style={{ fontSize: '14px', fontWeight: 600 }}>↕️ Отступы / Высоты строк</h3>
          <div className="space-y-3">
            {[
              { h: 'h-6', px: '24px', label: 'Компактный бейдж' },
              { h: 'h-8', px: '32px', label: 'Фильтр-чип, пагинация' },
              { h: 'h-9', px: '36px', label: 'Кнопки действий, инпут поиска' },
              { h: 'h-12', px: '48px', label: 'Строка Variant A (compact)' },
              { h: 'h-14', px: '56px', label: 'Строка Variant B (comfortable)' },
              { h: 'h-16', px: '64px', label: 'Заголовок инструментальной панели' },
            ].map(({ h, px, label }) => (
              <div key={px} className="flex items-center gap-3">
                <div className={`w-28 ${h} rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0`} />
                <div>
                  <span className="text-xs font-mono text-slate-600">{px}</span>
                  <p className="text-[11px] text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Status badges */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-slate-800 mb-4" style={{ fontSize: '14px', fontWeight: 600 }}>🏷️ Статусы и приоритеты</h3>
        <div className="flex flex-wrap gap-3 mb-5">
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div className="flex items-center gap-6">
          <span className="text-xs text-slate-500">Приоритет:</span>
          {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
            <PriorityChip key={p} priority={p} showLabel />
          ))}
        </div>
      </section>

      {/* Row states */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <h3 className="text-slate-800 mb-4" style={{ fontSize: '14px', fontWeight: 600 }}>🖱️ Состояния строк</h3>
        <RowStateDemo
          label="Default"
          bg="bg-white text-slate-300"
          border="border-l-slate-200"
          note="Спокойный фон, граница без акцента"
        />
        <RowStateDemo
          label="Hover"
          bg="bg-slate-50 text-slate-400"
          border="border-l-slate-200"
          note="Мягкое заполнение slate-50, появляется кнопка ⋯"
        />
        <RowStateDemo
          label="Selected"
          bg="bg-blue-50 text-blue-400"
          border="border-l-blue-500"
          note="Акцентная левая граница 3px, голубой фон"
        />
        <RowStateDemo
          label="Archived: Завершено"
          bg="bg-emerald-50 text-emerald-300"
          border="border-l-teal-400"
          note="Зелёный оттенок — успешно завершённые"
        />
        <RowStateDemo
          label="Archived: Устарело"
          bg="bg-orange-50 text-orange-300"
          border="border-l-orange-400"
          note="Оранжевый оттенок — отменённые/устаревшие"
        />
      </section>

      {/* Grid & Scalability annotations */}
      <section className="space-y-4">
        <h3 className="text-slate-800" style={{ fontSize: '14px', fontWeight: 600 }}>💡 Аннотации к дизайну</h3>
        <div className="grid grid-cols-3 gap-4">
          <AnnotationCard
            title="Почему такой grid?"
            items={[
              'Колонка «Наименование» — 1fr, занимает всё доступное место, так как заголовок — ключевой элемент сканирования.',
              'Фиксированные колонки (статус, инициатор, ответственный) минимизируют прыгание контента при разных данных.',
              'ID-чип — 84px, достаточно для формата «РП-2024-XXX». Более широкий ID сдвигает акцент.',
              'Действия (52px) — минимальная зона, кнопка ⋯ появляется только при hover для снижения визуального шума.',
            ]}
          />
          <AnnotationCard
            title="Как обеспечивается сканируемость?"
            items={[
              'Цветовые бейджи статусов (pre-attentive recognition) — мозг различает их без фокусировки взгляда.',
              'Вертикальные разделители — очень лёгкие (opacity 5–10%), помогают выровнять взгляд по колонкам.',
              'Чередование архивных строк (зелёный/оранжевый фон) — мгновенно отделяет завершённые.',
              'Заголовки колонок uppercase 11px — минимальный контраст, не конкурируют с данными.',
              'Приоритет через иконку-стрелку — не занимает отдельную колонку, встроен в ID-ячейку.',
            ]}
          />
          <AnnotationCard
            title="Масштабирование на 1000+ записей"
            items={[
              'Серверная пагинация — в реальной реализации загружается только одна страница (20–50 строк).',
              'Виртуализация списка (react-virtual) — рендерится только видимая область, DOM не перегружается.',
              'Дебаунс поиска (300ms) — не посылает запрос на каждый символ, снижает нагрузку на API.',
              'Sticky header + column headers — пользователь всегда видит контекст при прокрутке.',
              'Bulk actions — позволяют работать с сотнями записей без ручного выбора каждой.',
              'Saved filters — позволяют сохранить частые наборы фильтров для быстрого доступа.',
            ]}
          />
        </div>
      </section>

      {/* Variant comparison */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-slate-800 mb-5" style={{ fontSize: '14px', fontWeight: 600 }}>🔀 Вариант A vs Вариант B — когда использовать?</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold">A</span>
              <span className="text-sm font-semibold text-slate-700">Табличный — строгий</span>
            </div>
            <ul className="space-y-2">
              {[
                'Максимальная плотность данных (много записей на экране)',
                'Работа аналитиков и операционных менеджеров с 500+ строками',
                'Перенос пользователей из Excel/SAP без разрыва привычки',
                'Моноширинные экраны (27"+) с высоким разрешением',
                'Preattentive паттерны важнее визуального комфорта',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                  <span className="mt-1 w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold">B</span>
              <span className="text-sm font-semibold text-slate-700">Карточный — мягкий</span>
            </div>
            <ul className="space-y-2">
              {[
                'Работа руководителей и проектных менеджеров (30–100 записей)',
                'Многострочные заголовки (длинные описания предложений)',
                'Продукт позиционируется как modern SaaS, не enterprise legacy',
                'Экраны 15–24", где плотность менее критична',
                'Карточки воспринимаются как «объекты», легче в drag-and-drop',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                  <span className="mt-1 w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
