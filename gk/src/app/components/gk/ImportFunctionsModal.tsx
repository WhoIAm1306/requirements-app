import React, { useState, useRef, useCallback } from 'react';
import {
  X, Upload, Download, CheckCircle2, AlertCircle, AlertTriangle,
  FileSpreadsheet, ChevronRight, RotateCcw, Loader2, Info,
  FileCheck, XCircle, SkipForward, RefreshCw,
} from 'lucide-react';
import { GK, GKFunction, GKStage } from '../../types/gk';
import { JiraStatusBadge } from './StatusBadge';

// ─── types ────────────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';
type ImportMode = 'add_new' | 'update_existing' | 'skip_duplicates';

interface ParsedRow {
  rowNum: number;
  functionName: string;
  nmckFunctionNumber: string;
  tzSectionNumber: string;
  jiraKey?: string;
  confluenceUrl?: string;
  valid: boolean;
  errors: string[];
  isDuplicate?: boolean;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

interface Props {
  gk: GK;
  initialStageId?: string | null;
  onClose: () => void;
  onImportComplete: (stageId: string, functions: Omit<GKFunction, 'id' | 'updatedAt'>[]) => void;
}

// ─── mock data generation ─────────────────────────────────────────────────────

const MOCK_FUNCTION_NAMES = [
  'Модуль авторизации и аутентификации',
  'Личный кабинет пользователя',
  'Формирование и подпись документов',
  'Интеграция с СМЭВ',
  'Платёжный модуль',
  'Уведомление пользователей',
  'Журнал аудита',
  'Управление справочниками',
  'Модуль поиска и фильтрации',
  'Административная панель',
  'Интеграция с Порталом Госуслуги',
  'Формирование отчётности',
];

function generateMockParseResult(stageId: string, existingFunctions: GKFunction[]): ParsedRow[] {
  const existingNames = new Set(existingFunctions.map((f) => f.functionName));
  const rows: ParsedRow[] = [
    ...MOCK_FUNCTION_NAMES.slice(0, 9).map((name, i) => ({
      rowNum: i + 2,
      functionName: name,
      nmckFunctionNumber: `${Math.floor(i / 3) + 1}.${(i % 3) + 1}.${String(i + 1).padStart(2, '0')}`,
      tzSectionNumber: `${3 + Math.floor(i / 3)}.${(i % 3) + 1}.${i + 1}`,
      jiraKey: i % 3 === 0 ? `GK-${100 + i}` : undefined,
      confluenceUrl: i % 4 === 0 ? `https://confluence.example.com/pages/${100000 + i}` : undefined,
      valid: true,
      errors: [],
      isDuplicate: existingNames.has(name),
    })),
    // Error rows
    {
      rowNum: 11, functionName: '', nmckFunctionNumber: '10.1.01', tzSectionNumber: '6.1.1',
      valid: false, errors: ['Поле «Наименование функции» обязательно'],
    },
    {
      rowNum: 12, functionName: 'Дублирующий модуль', nmckFunctionNumber: '', tzSectionNumber: '',
      valid: false, errors: ['Поле «№ НМЦК» обязательно', 'Поле «№ раздела ТЗ» обязательно'],
    },
    {
      rowNum: 13, functionName: 'Некорректная запись', nmckFunctionNumber: 'abc', tzSectionNumber: 'def',
      valid: false, errors: ['Некорректный формат номера НМЦК (ожидается: X.X.XX)'],
    },
  ];
  return rows;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all"
        style={{
          background: done ? '#22C55E' : active ? '#2563EB' : '#F1F5F9',
          color: done || active ? 'white' : '#94A3B8',
          fontWeight: 700,
        }}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <span className="text-xs whitespace-nowrap" style={{ color: active ? '#1F2937' : '#94A3B8', fontWeight: active ? 600 : 400 }}>
        {label}
      </span>
    </div>
  );
}

function StepDivider() {
  return <div className="h-px flex-1" style={{ background: '#DCE3EE', minWidth: 24 }} />;
}

const modeOptions: { id: ImportMode; label: string; desc: string }[] = [
  { id: 'add_new',          label: 'Только новые',   desc: 'Добавить только строки без совпадений' },
  { id: 'update_existing',  label: 'Обновить',       desc: 'Добавить новые + обновить найденные дубликаты' },
  { id: 'skip_duplicates',  label: 'Пропустить',     desc: 'Добавить всё, пропустить дублирующиеся строки' },
];

// ─── sub-sections ─────────────────────────────────────────────────────────────

function UploadStep({
  gk, stageId, setStageId, mode, setMode,
  fileName, setFileName, onNext,
}: {
  gk: GK; stageId: string | null; setStageId: (id: string) => void;
  mode: ImportMode; setMode: (m: ImportMode) => void;
  fileName: string; setFileName: (n: string) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFileName(file.name);
  }, [setFileName]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const sorted = [...gk.stages].sort((a, b) => a.stageNumber - b.stageNumber);
  const canNext = !!fileName && !!stageId;

  return (
    <div className="space-y-5">
      {/* File upload */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs" style={{ color: '#64748B', fontWeight: 500 }}>
            Файл для импорта <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <button
            className="flex items-center gap-1.5 text-xs transition-all"
            style={{ color: '#7C3AED' }}
            onClick={() => {}}
            title="Скачать шаблон Excel/CSV"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            <Download className="w-3.5 h-3.5" />
            Скачать шаблон импорта
          </button>
        </div>

        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleFile} />

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center py-10 rounded-2xl cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragging ? '#2563EB' : fileName ? '#22C55E' : '#DCE3EE'}`,
            background: dragging ? '#EFF6FF' : fileName ? '#F0FDF4' : '#F8FAFC',
          }}
        >
          {fileName ? (
            <>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#DCFCE7' }}>
                <FileSpreadsheet className="w-6 h-6" style={{ color: '#16A34A' }} />
              </div>
              <p className="text-sm" style={{ color: '#15803D', fontWeight: 600 }}>{fileName}</p>
              <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Нажмите для замены файла</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#EFF6FF' }}>
                <Upload className="w-6 h-6" style={{ color: '#93C5FD' }} />
              </div>
              <p className="text-sm" style={{ color: '#1F2937', fontWeight: 500 }}>
                Перетащите файл или нажмите для выбора
              </p>
              <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Excel (.xlsx, .xls) или CSV · до 10 МБ</p>
            </>
          )}
        </div>
      </div>

      {/* Info about template */}
      <div className="flex gap-2 p-3 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2563EB' }} />
        <div className="text-xs" style={{ color: '#1E40AF' }}>
          <p style={{ fontWeight: 600 }}>Структура файла (первая строка — заголовки):</p>
          <p className="mt-1 font-mono" style={{ color: '#1D4ED8' }}>
            A: functionName · B: nmckFunctionNumber · C: tzSectionNumber · D: jiraEpicKey (optional) · E: confluenceUrl (optional)
          </p>
        </div>
      </div>

      {/* Stage selector */}
      <div>
        <label className="text-xs block mb-2" style={{ color: '#64748B', fontWeight: 500 }}>
          Целевой этап <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {sorted.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setStageId(stage.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
              style={
                stageId === stage.id
                  ? { background: '#2563EB', color: 'white', border: '1.5px solid #2563EB', fontWeight: 600 }
                  : { background: 'white', color: '#64748B', border: '1.5px solid #DCE3EE' }
              }
              onMouseEnter={(e) => {
                if (stageId !== stage.id) (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                if (stageId !== stage.id) (e.currentTarget as HTMLButtonElement).style.background = 'white';
              }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
                style={{
                  background: stageId === stage.id ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                  color: stageId === stage.id ? 'white' : '#64748B', fontWeight: 700,
                }}
              >
                {stage.stageNumber}
              </span>
              {stage.stageName}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: stageId === stage.id ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                  color: stageId === stage.id ? 'white' : '#94A3B8',
                }}
              >
                {stage.functions.length} фун.
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Import mode */}
      <div>
        <label className="text-xs block mb-2" style={{ color: '#64748B', fontWeight: 500 }}>
          Режим импорта при дублировании
        </label>
        <div className="space-y-2">
          {modeOptions.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
              style={{
                border: `1.5px solid ${mode === opt.id ? '#2563EB' : '#DCE3EE'}`,
                background: mode === opt.id ? '#EFF6FF' : 'white',
              }}
            >
              <input type="radio" className="sr-only" checked={mode === opt.id} onChange={() => setMode(opt.id)} />
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ border: `2px solid ${mode === opt.id ? '#2563EB' : '#DCE3EE'}` }}>
                {mode === opt.id && <div className="w-2 h-2 rounded-full" style={{ background: '#2563EB' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: '#1F2937', fontWeight: mode === opt.id ? 600 : 400 }}>{opt.label}</p>
                <p className="text-[10px]" style={{ color: '#94A3B8' }}>{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white transition-all"
          style={{ background: canNext ? '#2563EB' : '#CBD5E1', fontWeight: 500, cursor: canNext ? 'pointer' : 'not-allowed' }}
          onMouseEnter={(e) => { if (canNext) (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
          onMouseLeave={(e) => { if (canNext) (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}
        >
          Далее — Предпросмотр
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function PreviewStep({
  rows, mode, stageId, gk, onBack, onImport,
}: {
  rows: ParsedRow[]; mode: ImportMode; stageId: string; gk: GK;
  onBack: () => void; onImport: () => void;
}) {
  const stage = gk.stages.find((s) => s.id === stageId);
  const validRows = rows.filter((r) => r.valid);
  const errorRows = rows.filter((r) => !r.valid);
  const duplicateRows = validRows.filter((r) => r.isDuplicate);
  const newRows = validRows.filter((r) => !r.isDuplicate);

  let willCreate = newRows.length;
  let willUpdate = 0;
  let willSkip = 0;

  if (mode === 'update_existing') { willCreate = newRows.length; willUpdate = duplicateRows.length; }
  else if (mode === 'skip_duplicates') { willCreate = newRows.length; willSkip = duplicateRows.length; }
  else { willCreate = newRows.length; willSkip = duplicateRows.length; }

  return (
    <div className="space-y-4">
      {/* Stage info */}
      {stage && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-white" style={{ background: '#2563EB', fontWeight: 700 }}>
            {stage.stageNumber}
          </div>
          <span className="text-xs" style={{ color: '#1E40AF', fontWeight: 500 }}>{stage.stageName}</span>
          <span className="text-xs ml-auto" style={{ color: '#64748B' }}>Текущих функций: {stage.functions.length}</span>
        </div>
      )}

      {/* Summary counters */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Всего строк', value: rows.length, color: '#2563EB', bg: '#EFF6FF', icon: <FileSpreadsheet className="w-4 h-4" /> },
          { label: 'Будет создано', value: willCreate, color: '#16A34A', bg: '#F0FDF4', icon: <FileCheck className="w-4 h-4" /> },
          { label: 'Будет пропущено', value: willSkip + willUpdate, color: '#D97706', bg: '#FFFBEB', icon: <SkipForward className="w-4 h-4" /> },
          { label: 'Ошибки в строках', value: errorRows.length, color: '#DC2626', bg: '#FEF2F2', icon: <XCircle className="w-4 h-4" /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: bg, border: `1px solid ${color}22` }}>
            <div style={{ color, opacity: 0.6 }}>{icon}</div>
            <div className="text-2xl" style={{ color, fontWeight: 800, lineHeight: 1 }}>{value}</div>
            <div className="text-[10px]" style={{ color: '#64748B' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Preview table */}
      <div>
        <p className="text-xs mb-2" style={{ color: '#64748B', fontWeight: 500 }}>
          Предпросмотр данных (первые строки)
        </p>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DCE3EE', maxHeight: 220, overflowY: 'auto' }}>
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0" style={{ background: '#F8FAFC', borderBottom: '2px solid #DCE3EE' }}>
              <tr>
                {['Стр.', 'Статус', 'Наименование функции', 'НМЦК №', 'ТЗ №', 'Jira'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 whitespace-nowrap" style={{ fontWeight: 600, fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((row) => (
                <tr key={row.rowNum} className="transition-colors"
                  style={{ borderBottom: '1px solid #F8FAFC', background: row.valid ? 'white' : '#FEF2F2' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = row.valid ? '#F8FAFC' : '#FEE2E2'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = row.valid ? 'white' : '#FEF2F2'; }}
                >
                  <td className="px-3 py-2 text-center">
                    <span className="text-[10px]" style={{ color: '#94A3B8' }}>{row.rowNum}</span>
                  </td>
                  <td className="px-3 py-2">
                    {!row.valid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                        <XCircle className="w-2.5 h-2.5" />Ошибка
                      </span>
                    ) : row.isDuplicate ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                        <AlertTriangle className="w-2.5 h-2.5" />Дубль
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                        <CheckCircle2 className="w-2.5 h-2.5" />Новая
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="block max-w-[200px] truncate" style={{ color: row.functionName ? '#1F2937' : '#EF4444', fontWeight: row.functionName ? 400 : 500 }}>
                      {row.functionName || '(пусто)'}
                    </span>
                    {!row.valid && row.errors.map((err, i) => (
                      <span key={i} className="block text-[10px]" style={{ color: '#EF4444' }}>{err}</span>
                    ))}
                  </td>
                  <td className="px-3 py-2">
                    <code className="text-[10px]" style={{ color: '#64748B' }}>{row.nmckFunctionNumber || '—'}</code>
                  </td>
                  <td className="px-3 py-2">
                    <code className="text-[10px]" style={{ color: '#64748B' }}>{row.tzSectionNumber || '—'}</code>
                  </td>
                  <td className="px-3 py-2">
                    {row.jiraKey ? (
                      <code className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                        {row.jiraKey}
                      </code>
                    ) : <span className="text-[10px]" style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 15 && (
          <p className="text-[10px] mt-1 text-center" style={{ color: '#94A3B8' }}>…и ещё {rows.length - 15} строк</p>
        )}
      </div>

      {/* Errors list */}
      {errorRows.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <p className="flex items-center gap-2 text-xs mb-3" style={{ color: '#DC2626', fontWeight: 600 }}>
            <AlertCircle className="w-4 h-4" />
            Строки с ошибками ({errorRows.length}) — будут пропущены
          </p>
          <div className="space-y-2">
            {errorRows.map((row) => (
              <div key={row.rowNum} className="flex items-start gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-md flex-shrink-0" style={{ background: '#FECACA', color: '#DC2626', fontWeight: 600 }}>
                  стр. {row.rowNum}
                </span>
                <div className="flex-1">
                  {row.errors.map((err, i) => (
                    <p key={i} className="text-[10px]" style={{ color: '#991B1B' }}>{err}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
          style={{ border: '1.5px solid #DCE3EE', color: '#64748B', background: 'white', fontWeight: 500 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
          ← Назад
        </button>
        <button onClick={onImport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white transition-all"
          style={{ background: '#2563EB', fontWeight: 600 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}>
          Применить импорт
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ImportingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-blue-100" />
        <Loader2 className="w-20 h-20 absolute inset-0 animate-spin" style={{ color: '#2563EB' }} />
      </div>
      <div className="text-center">
        <p className="text-base" style={{ color: '#1F2937', fontWeight: 600 }}>Импорт выполняется…</p>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Обрабатываем строки, добавляем функции</p>
      </div>
      <div className="w-64 h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
        <div className="h-full rounded-full animate-pulse" style={{ background: '#2563EB', width: '65%' }} />
      </div>
    </div>
  );
}

function ResultStep({ result, onClose, onImportMore }: {
  result: ImportResult; onClose: () => void; onImportMore: () => void;
}) {
  const hasErrors = result.failed > 0;
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 rounded-2xl" style={{
        background: hasErrors ? '#FFFBEB' : '#F0FDF4',
        border: `1px solid ${hasErrors ? '#FDE68A' : '#BBF7D0'}`,
      }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: hasErrors ? '#FEF3C7' : '#DCFCE7' }}>
          {hasErrors
            ? <AlertTriangle className="w-7 h-7" style={{ color: '#D97706' }} />
            : <CheckCircle2 className="w-7 h-7" style={{ color: '#16A34A' }} />
          }
        </div>
        <div>
          <p className="text-base" style={{ color: '#1F2937', fontWeight: 700 }}>
            {hasErrors ? 'Импорт завершён с предупреждениями' : 'Импорт успешно завершён'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            {result.created + result.updated} функций обработано, {result.failed} ошибок
          </p>
        </div>
      </div>

      {/* Result counters */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Создано',    value: result.created, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: <FileCheck className="w-5 h-5" /> },
          { label: 'Обновлено', value: result.updated, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: <RefreshCw className="w-5 h-5" /> },
          { label: 'Пропущено', value: result.skipped, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: <SkipForward className="w-5 h-5" /> },
          { label: 'Ошибок',    value: result.failed,  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: <XCircle className="w-5 h-5" /> },
        ].map(({ label, value, color, bg, border, icon }) => (
          <div key={label} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
            <div style={{ color, opacity: 0.6 }}>{icon}</div>
            <div>
              <div style={{ color, fontWeight: 800, fontSize: 28, lineHeight: 1 }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Error details */}
      {result.errors.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: '#DC2626', fontWeight: 600 }}>
              <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
              Детали ошибок
            </p>
            <button className="text-xs transition-all" style={{ color: '#2563EB' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}>
              <Download className="w-3 h-3 inline mr-1" />
              Скачать отчёт
            </button>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {result.errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: '#FECACA', color: '#DC2626', fontWeight: 600 }}>
                  стр. {err.row}
                </span>
                <span className="text-[10px]" style={{ color: '#991B1B' }}>{err.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onImportMore}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
          style={{ border: '1.5px solid #BFDBFE', color: '#2563EB', background: '#EFF6FF', fontWeight: 500 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#DBEAFE'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; }}>
          <Upload className="w-4 h-4" />
          Ещё импорт
        </button>
        <button onClick={onClose}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm text-white transition-all"
          style={{ background: '#2563EB', fontWeight: 600 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}>
          <CheckCircle2 className="w-4 h-4" />
          Готово
        </button>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function ImportFunctionsModal({ gk, initialStageId, onClose, onImportComplete }: Props) {
  const sorted = [...gk.stages].sort((a, b) => a.stageNumber - b.stageNumber);

  const [step, setStep] = useState<ImportStep>('upload');
  const [stageId, setStageId] = useState<string | null>(initialStageId ?? sorted[0]?.id ?? null);
  const [mode, setMode] = useState<ImportMode>('add_new');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const stepLabels = [
    { n: 1, label: 'Загрузка файла', step: 'upload' },
    { n: 2, label: 'Предпросмотр', step: 'preview' },
    { n: 3, label: 'Результат', step: 'result' },
  ];
  const stepIndex = step === 'upload' ? 0 : step === 'preview' ? 1 : step === 'importing' ? 1 : 2;

  const handleNext = async () => {
    if (!stageId) return;
    const stage = gk.stages.find((s) => s.id === stageId)!;
    const rows = generateMockParseResult(stageId, stage.functions);
    setParsedRows(rows);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!stageId) return;
    setStep('importing');
    await delay(1800);

    const stage = gk.stages.find((s) => s.id === stageId)!;
    const validRows = parsedRows.filter((r) => r.valid);
    const errorRows = parsedRows.filter((r) => !r.valid);
    const newRows = validRows.filter((r) => !r.isDuplicate);
    const dupRows = validRows.filter((r) => r.isDuplicate);

    let created = 0, updated = 0, skipped = 0;
    const functionsToAdd: Omit<GKFunction, 'id' | 'updatedAt'>[] = [];

    for (const row of newRows) {
      functionsToAdd.push({
        functionName: row.functionName,
        nmckFunctionNumber: row.nmckFunctionNumber,
        tzSectionNumber: row.tzSectionNumber,
        jiraEpics: row.jiraKey
          ? [{ key: row.jiraKey, summary: 'Imported Epic', status: 'Open', url: `https://jira.example.com/browse/${row.jiraKey}` }]
          : [],
        confluenceLinks: row.confluenceUrl ? [row.confluenceUrl] : [],
      });
      created++;
    }

    if (mode === 'update_existing') {
      updated = dupRows.length;
    } else {
      skipped = dupRows.length;
    }

    onImportComplete(stageId, functionsToAdd);

    setResult({
      created,
      updated,
      skipped,
      failed: errorRows.length,
      errors: errorRows.map((r) => ({ row: r.rowNum, reason: r.errors.join('; ') })),
    });
    setStep('result');
  };

  const handleImportMore = () => {
    setStep('upload');
    setFileName('');
    setParsedRows([]);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div
        className="relative flex flex-col bg-white"
        style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.28)' }}
      >
        {/* Accent */}
        <div className="h-1 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #7C3AED, #2563EB)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ background: '#0F172A' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#7C3AED' }}>
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm" style={{ color: 'white', fontWeight: 700 }}>Импорт функций</h3>
              <p className="text-xs" style={{ color: '#475569' }}>
                ГК: <span style={{ color: '#93C5FD', fontWeight: 600 }}>{gk.shortName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-all" style={{ color: '#64748B' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#F87171'; el.style.background = '#1E293B'; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#64748B'; el.style.background = 'transparent'; }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFBFC' }}>
          {stepLabels.map((s, i) => (
            <React.Fragment key={s.step}>
              <Step n={s.n} label={s.label} active={i === stepIndex} done={i < stepIndex} />
              {i < stepLabels.length - 1 && <StepDivider />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'upload' && (
            <UploadStep
              gk={gk}
              stageId={stageId}
              setStageId={setStageId}
              mode={mode}
              setMode={setMode}
              fileName={fileName}
              setFileName={setFileName}
              onNext={handleNext}
            />
          )}
          {step === 'preview' && stageId && (
            <PreviewStep
              rows={parsedRows}
              mode={mode}
              stageId={stageId}
              gk={gk}
              onBack={() => setStep('upload')}
              onImport={handleImport}
            />
          )}
          {step === 'importing' && <ImportingStep />}
          {step === 'result' && result && (
            <ResultStep result={result} onClose={onClose} onImportMore={handleImportMore} />
          )}
        </div>
      </div>
    </div>
  );
}
