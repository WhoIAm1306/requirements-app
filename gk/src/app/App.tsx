import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { AlertTriangle, RefreshCw, BookOpen, Layers, Zap, Archive, CheckCircle2, MousePointerClick } from 'lucide-react';
import { GK, ConfirmDialogState, UserRole, GKFunction } from './types/gk';
import { generateMockGKs, CUSTOMERS } from './data/mockData';
import { ConfirmDialog } from './components/gk/ConfirmDialog';
import { ProposalsModal } from './components/gk/ProposalsModal';
import { GKModal } from './components/gk/GKModal';
import { ImportFunctionsModal } from './components/gk/ImportFunctionsModal';
import { GKListPanel, ListFilters, DEFAULT_LIST_FILTERS } from './components/gk/GKListPanel';
import { GKDetailView } from './components/gk/GKDetailView';
import { BulkActionBar } from './components/gk/BulkActionBar';
import { AppHeader } from './components/gk/AppHeader';
import { GKCardView } from './components/gk/GKCardView';

// ─── helpers ──────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function applyListFilters(gks: GK[], f: ListFilters, q: string): GK[] {
  let result = gks;

  if (q.trim()) {
    const lower = q.toLowerCase();
    result = result.filter((gk) =>
      gk.name.toLowerCase().includes(lower) ||
      gk.shortName.toLowerCase().includes(lower) ||
      gk.code.toLowerCase().includes(lower) ||
      gk.customer.toLowerCase().includes(lower) ||
      gk.note.toLowerCase().includes(lower) ||
      gk.stages.some((st) =>
        st.stageName.toLowerCase().includes(lower) ||
        st.functions.some((fn) =>
          fn.functionName.toLowerCase().includes(lower) ||
          fn.nmckFunctionNumber.toLowerCase().includes(lower) ||
          fn.tzSectionNumber.toLowerCase().includes(lower) ||
          fn.jiraEpics.some((j) => j.key.toLowerCase().includes(lower)) ||
          fn.confluenceLinks.some((l) => l.toLowerCase().includes(lower))
        )
      )
    );
  }

  if (f.status !== 'all')    result = result.filter((g) => g.status === f.status);
  if (f.customer)            result = result.filter((g) => g.customer === f.customer);
  if (f.hasStages === 'yes') result = result.filter((g) => g.stages.length > 0);
  if (f.hasStages === 'no')  result = result.filter((g) => g.stages.length === 0);

  return [...result].sort((a, b) => {
    let cmp = 0;
    if (f.sortBy === 'name')      cmp = a.name.localeCompare(b.name);
    else if (f.sortBy === 'code') cmp = a.code.localeCompare(b.code);
    else if (f.sortBy === 'stages')
      cmp = a.stages.length - b.stages.length;
    else if (f.sortBy === 'functions')
      cmp = a.stages.reduce((s, st) => s + st.functions.length, 0)
          - b.stages.reduce((s, st) => s + st.functions.length, 0);
    else
      cmp = a.updatedAt.localeCompare(b.updatedAt);
    return f.sortOrder === 'asc' ? cmp : -cmp;
  });
}

// ─── empty right panel ────────────────────────────────────────────────────────

function RightEmptyState({ gks, loading }: { gks: GK[]; loading: boolean }) {
  const active = gks.filter((g) => g.status === 'active');
  const archived = gks.filter((g) => g.status === 'archive');
  const totalFns = gks.reduce((s, g) => s + g.stages.reduce((ss, st) => ss + st.functions.length, 0), 0);
  const totalStages = gks.reduce((s, g) => s + g.stages.length, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: '#EFF6FF' }}>
          <BookOpen className="w-8 h-8" style={{ color: '#93C5FD' }} />
        </div>
        <div className="space-y-2 text-center">
          <div className="w-40 h-4 rounded-full mx-auto animate-pulse" style={{ background: '#F1F5F9' }} />
          <div className="w-28 h-3 rounded-full mx-auto animate-pulse" style={{ background: '#F8FAFC' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-10">
      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '2px solid #BFDBFE' }}>
        <MousePointerClick className="w-10 h-10" style={{ color: '#93C5FD' }} />
      </div>

      <div className="text-center">
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>Выберите ГК из списка</h3>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>
          Нажмите на любую запись слева, чтобы просмотреть детали,<br />
          управлять этапами и функциями
        </p>
      </div>

      {/* Quick stats */}
      {gks.length > 0 && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {[
            { label: 'Активных ГК',  value: active.length,   icon: <CheckCircle2 className="w-5 h-5" />, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
            { label: 'В архиве',     value: archived.length, icon: <Archive className="w-5 h-5" />,      color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
            { label: 'Всего этапов', value: totalStages,     icon: <Layers className="w-5 h-5" />,       color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Функций',      value: totalFns,        icon: <Zap className="w-5 h-5" />,          color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
          ].map(({ label, value, icon, color, bg, border }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
              <div style={{ color, opacity: 0.6 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── card grid wrapper ────────────────────────────────────────────────────────

function CardGridView({ gks, role, onEdit, onArchive, onRestore, loading }: {
  gks: GK[]; role: UserRole;
  onEdit: (gk: GK) => void;
  onArchive: (gk: GK) => void;
  onRestore: (gk: GK) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-6 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl animate-pulse h-48" style={{ background: '#F1F5F9' }} />
        ))}
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      <GKCardView
        gks={gks}
        selectedGkId={null}
        onSelectGk={onEdit}
        role={role}
        onEdit={onEdit}
        onArchive={onArchive}
        onRestore={onRestore}
      />
    </div>
  );
}

// ─── app ──────────────────────────────────────────────────────────────────────

export default function App() {
  // data
  const [gks, setGks] = useState<GK[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // ui
  const [role, setRole] = useState<UserRole>('superuser');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilters, setListFilters] = useState<ListFilters>(DEFAULT_LIST_FILTERS);

  // selection
  const [selectedGkId, setSelectedGkId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // modals
  const [gkModalState, setGkModalState] = useState<{ mode: 'create' | 'edit'; gkId?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [proposalsGk, setProposalsGk] = useState<GK | null>(null);
  const [importState, setImportState] = useState<{ gkId: string; stageId: string | null } | null>(null);

  // ── load ────────────────────────────────────────────────────────────────────

  const loadData = () => {
    setLoading(true); setLoadError(false);
    delay(900).then(() => {
      try { setGks(generateMockGKs()); }
      catch { setLoadError(true); }
      finally { setLoading(false); }
    });
  };
  useEffect(() => { loadData(); }, []);

  // ── derived ─────────────────────────────────────────────────────────────────

  const filteredGks = useMemo(
    () => applyListFilters(gks, listFilters, searchQuery),
    [gks, listFilters, searchQuery]
  );

  const selectedGk = useMemo(
    () => (selectedGkId ? gks.find((g) => g.id === selectedGkId) ?? null : null),
    [gks, selectedGkId]
  );

  const modalGk = useMemo(
    () => (gkModalState?.gkId ? gks.find((g) => g.id === gkModalState.gkId) ?? null : null),
    [gks, gkModalState?.gkId]
  );

  // ── mutations ────────────────────────────────────────────────────────────────

  const updateGK = useCallback((id: string, updates: Partial<GK>) =>
    setGks((prev) => prev.map((g) => g.id === id ? { ...g, ...updates } : g)),
    []
  );

  const confirm = (dialog: ConfirmDialogState) => setConfirmDialog(dialog);

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  const handleModalSave = async (data: Partial<GK>) => {
    await delay(600);
    if (gkModalState?.mode === 'create') {
      const newGK: GK = {
        id: `gk_${Date.now()}`, name: data.name ?? '', shortName: data.shortName ?? '',
        code: data.code ?? '', customer: data.customer ?? '', status: data.status ?? 'active',
        useShortNameInId: data.useShortNameInId ?? false, note: data.note ?? '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), stages: [],
      };
      setGks((prev) => [newGK, ...prev]);
      setSelectedGkId(newGK.id);
      toast.success('ГК создана', { description: newGK.name });
    } else if (gkModalState?.gkId) {
      updateGK(gkModalState.gkId, { ...data, updatedAt: new Date().toISOString() });
      toast.success('Изменения сохранены', { description: data.name });
    }
    setGkModalState(null);
  };

  const handleArchive = (gk: GK) => {
    confirm({
      title: 'Архивировать ГК?',
      message: `«${gk.name}» будет перемещена в архив. Данные сохранятся.`,
      onConfirm: async () => {
        await delay(400);
        updateGK(gk.id, { status: 'archive', updatedAt: new Date().toISOString() });
        toast.warning('Перемещено в архив', { description: gk.name });
      },
    });
  };

  const handleRestore = (gk: GK) => {
    confirm({
      title: 'Восстановить ГК?',
      message: `«${gk.name}» будет переведена в статус «Активна».`,
      onConfirm: async () => {
        await delay(400);
        updateGK(gk.id, { status: 'active', updatedAt: new Date().toISOString() });
        toast.success('ГК восстановлена', { description: gk.name });
      },
    });
  };

  const handleDelete = (gk: GK) => {
    confirm({
      title: 'Удалить ГК?',
      message: `«${gk.name}» и все её данные будут удалены без возможности восстановления.`,
      variant: 'danger',
      onConfirm: async () => {
        await delay(400);
        setGks((prev) => prev.filter((g) => g.id !== gk.id));
        if (selectedGkId === gk.id) setSelectedGkId(null);
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(gk.id); return n; });
        toast.error('ГК удалена', { description: gk.name });
      },
    });
  };

  // ── bulk ─────────────────────────────────────────────────────────────────────

  const handleBulkArchive = () => {
    const ids = [...selectedIds];
    confirm({
      title: `Архивировать ${ids.length} записей?`,
      message: 'Выбранные ГК будут перемещены в архив.',
      onConfirm: async () => {
        await delay(500);
        setGks((prev) => prev.map((g) => ids.includes(g.id) ? { ...g, status: 'archive', updatedAt: new Date().toISOString() } : g));
        setSelectedIds(new Set());
        toast.warning(`${ids.length} ГК архивированы`);
      },
    });
  };

  const handleBulkRestore = () => {
    const ids = [...selectedIds];
    confirm({
      title: `Восстановить ${ids.length} записей?`,
      message: 'Выбранные ГК будут переведены в статус «Активна».',
      onConfirm: async () => {
        await delay(500);
        setGks((prev) => prev.map((g) => ids.includes(g.id) ? { ...g, status: 'active', updatedAt: new Date().toISOString() } : g));
        setSelectedIds(new Set());
        toast.success(`${ids.length} ГК восстановлены`);
      },
    });
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    confirm({
      title: `Удалить ${ids.length} записей?`,
      message: 'Все выбранные ГК будут удалены без возможности восстановления.',
      variant: 'danger',
      onConfirm: async () => {
        await delay(600);
        setGks((prev) => prev.filter((g) => !ids.includes(g.id)));
        if (ids.includes(selectedGkId ?? '')) setSelectedGkId(null);
        setSelectedIds(new Set());
        toast.error(`${ids.length} ГК удалены`);
      },
    });
  };

  // ── import ───────────────────────────────────────────────────────────────────

  const handleImportComplete = (stageId: string, functions: Omit<GKFunction, 'id' | 'updatedAt'>[]) => {
    if (!importState?.gkId) return;
    const newFns: GKFunction[] = functions.map((f) => ({
      ...f, id: `fn_${Date.now()}_${Math.random().toString(36).slice(2)}`, updatedAt: new Date().toISOString(),
    }));
    const gkId = importState.gkId;
    setGks((prev) => prev.map((g) => {
      if (g.id !== gkId) return g;
      return {
        ...g,
        stages: g.stages.map((s) => s.id === stageId ? { ...s, functions: [...s.functions, ...newFns] } : s),
        updatedAt: new Date().toISOString(),
      };
    }));
    toast.success(`Импортировано ${newFns.length} функций`);
  };

  // ── selection ────────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = (ids: string[]) =>
    setSelectedIds(ids.length === 0 ? new Set() : new Set(ids));

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100vh', overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
        background: '#F5F7FA',
      }}
    >
      <Toaster
        position="top-right" richColors closeButton
        toastOptions={{ duration: 3500, style: { fontSize: 12.5, borderRadius: 12 } }}
      />

      {/* ── Top header ── */}
      <AppHeader
        role={role}
        onRoleChange={(r) => { setRole(r); setSelectedIds(new Set()); }}
        onAddGK={() => setGkModalState({ mode: 'create' })}
        onExport={() => toast.info('Экспорт подготовлен', { description: `${filteredGks.length} записей · XLSX` })}
        viewMode={viewMode}
        onViewModeChange={(v) => setViewMode(v)}
        totalCount={gks.length}
      />

      {/* ── Body ── */}
      {loadError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FEF2F2' }}>
            <AlertTriangle className="w-8 h-8" style={{ color: '#EF4444' }} />
          </div>
          <div className="text-center">
            <p style={{ fontSize: 14, color: '#1F2937', fontWeight: 600 }}>Ошибка загрузки</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Не удалось получить список ГК с сервера</p>
          </div>
          <button onClick={loadData} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white"
            style={{ background: '#2563EB', fontWeight: 500, border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; }}>
            <RefreshCw className="w-4 h-4" />Повторить
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* ── Master-detail layout ── */
        <div className="flex flex-1 overflow-hidden">
          {/* Left: list panel */}
          <div className="flex-shrink-0 overflow-hidden" style={{ width: 358 }}>
            <GKListPanel
              gks={filteredGks}
              selectedGkId={selectedGkId}
              selectedIds={selectedIds}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectGk={(gk) => setSelectedGkId(gk.id)}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              role={role}
              loading={loading}
              filters={listFilters}
              onFiltersChange={setListFilters}
              customers={CUSTOMERS}
              totalCount={gks.length}
            />
          </div>

          {/* Right: detail or empty */}
          <div className="flex-1 overflow-hidden">
            {selectedGk ? (
              <GKDetailView
                gk={selectedGk}
                role={role}
                onEdit={(gk) => setGkModalState({ mode: 'edit', gkId: gk.id })}
                onArchive={handleArchive}
                onRestore={handleRestore}
                onDelete={handleDelete}
                onUpdateGK={updateGK}
                onViewProposals={(gk) => setProposalsGk(gk)}
                onOpenImport={(stageId) => setImportState({ gkId: selectedGk.id, stageId })}
              />
            ) : (
              <RightEmptyState gks={filteredGks} loading={loading} />
            )}
          </div>
        </div>
      ) : (
        /* ── Card grid ── */
        <div className="flex-1 overflow-hidden">
          <CardGridView
            gks={filteredGks}
            role={role}
            onEdit={(gk) => setGkModalState({ mode: 'edit', gkId: gk.id })}
            onArchive={handleArchive}
            onRestore={handleRestore}
            loading={loading}
          />
        </div>
      )}

      {/* ── Floating bulk bar ── */}
      {selectedIds.size > 0 && role !== 'read' && (
        <BulkActionBar
          count={selectedIds.size}
          role={role}
          onArchive={handleBulkArchive}
          onRestore={handleBulkRestore}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* ── GK Modal (create / edit basic) ── */}
      {gkModalState && (
        <GKModal
          mode={gkModalState.mode}
          gk={modalGk}
          role={role}
          onSave={handleModalSave}
          onClose={() => setGkModalState(null)}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onUpdateGK={updateGK}
          onViewProposals={(gk) => setProposalsGk(gk)}
          onOpenImport={(stageId) => {
            if (gkModalState?.gkId) setImportState({ gkId: gkModalState.gkId, stageId });
          }}
        />
      )}

      {/* ── Import modal ── */}
      {importState && (() => {
        const importGk = gks.find((g) => g.id === importState.gkId);
        return importGk ? (
          <ImportFunctionsModal
            gk={importGk}
            initialStageId={importState.stageId}
            onClose={() => setImportState(null)}
            onImportComplete={(stageId, fns) => {
              handleImportComplete(stageId, fns);
              setImportState(null);
            }}
          />
        ) : null;
      })()}

      {/* ── Confirm ── */}
      {confirmDialog && <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />}

      {/* ── Proposals ── */}
      {proposalsGk && <ProposalsModal gk={proposalsGk} onClose={() => setProposalsGk(null)} />}
    </div>
  );
}
