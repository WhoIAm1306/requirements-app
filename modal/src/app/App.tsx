import { useState } from 'react';
import { Toaster } from 'sonner';
import { ProposalModal } from './components/ProposalModal';
import type { ProposalMode, ArchiveReason } from './components/proposal/types';
import {
  LayoutDashboard, FileText, Settings, Users, Bell, ChevronDown,
  Search, BarChart3, FolderOpen, ClipboardList, LogOut, Eye, Pen,
  Archive, Plus, ExternalLink
} from 'lucide-react';

/* ─────── ADMIN PANEL BACKGROUND ─────── */
function Sidebar() {
  const items = [
    { icon: LayoutDashboard, label: 'Дашборд', active: false },
    { icon: ClipboardList, label: 'Предложения', active: true },
    { icon: FileText, label: 'Требования', active: false },
    { icon: FolderOpen, label: 'Проекты', active: false },
    { icon: BarChart3, label: 'Аналитика', active: false },
    { icon: Users, label: 'Пользователи', active: false },
    { icon: Settings, label: 'Настройки', active: false },
  ];
  return (
    <aside className="flex flex-col h-full" style={{ width: 220, background: '#1A2332', flexShrink: 0 }}>
      <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#409EFF' }}>
          <LayoutDashboard size={14} color="#fff" />
        </div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>РМС Платформа</span>
      </div>
      <nav className="flex-1 py-3 px-2">
        {items.map(item => (
          <div key={item.label}
            className="flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 cursor-pointer"
            style={{ background: item.active ? 'rgba(64,158,255,0.18)' : 'transparent', color: item.active ? '#409EFF' : 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            <item.icon size={15} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#409EFF', fontWeight: 600 }}>П</div>
          <div className="flex-1 min-w-0">
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>Петрова М.С.</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>ДТСЗН</div>
          </div>
          <LogOut size={13} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }} />
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="flex items-center gap-4 px-5 py-2.5" style={{ background: '#fff', borderBottom: '1px solid #E4E7ED', flexShrink: 0 }}>
      <div className="relative">
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#C0C4CC' }} />
        <input placeholder="Поиск по записям..." className="pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none"
          style={{ background: '#F5F7FA', border: '1px solid #DCDFE6', width: 240, fontSize: 12, color: '#303133' }} />
      </div>
      <div className="flex-1" />
      <Bell size={16} style={{ color: '#909399', cursor: 'pointer' }} />
      <div className="flex items-center gap-2 cursor-pointer">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#409EFF', fontWeight: 600 }}>П</div>
        <span style={{ fontSize: 12, color: '#303133' }}>Петрова М.С.</span>
        <ChevronDown size={12} style={{ color: '#909399' }} />
      </div>
    </div>
  );
}

function TableRow({ id, name, status, author, date, onClick }: {
  id: string; name: string; status: string; author: string; date: string; onClick: () => void;
}) {
  const statusColors: Record<string, { bg: string; color: string }> = {
    'В работе': { bg: '#D9ECFF', color: '#337ECC' },
    'Выполнено': { bg: '#F0F9EB', color: '#67C23A' },
    'На рассмотрении': { bg: '#ECF5FF', color: '#409EFF' },
    'Новое': { bg: '#F4F4F5', color: '#909399' },
    'Отложено': { bg: '#FAECD8', color: '#B88230' },
  };
  const s = statusColors[status] ?? { bg: '#F4F4F5', color: '#909399' };

  return (
    <tr className="cursor-pointer group" style={{ borderBottom: '1px solid #F0F0F0' }}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F5F7FA'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
    >
      <td className="px-4 py-2.5" style={{ fontSize: 12, color: '#409EFF', fontFamily: 'monospace', fontWeight: 600 }}>{id}</td>
      <td className="px-4 py-2.5 max-w-xs">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12, color: '#303133' }} className="truncate">{name}</span>
          <ExternalLink size={10} style={{ color: '#C0C4CC', flexShrink: 0 }} className="opacity-0 group-hover:opacity-100" />
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: s.bg, color: s.color, fontWeight: 500 }}>{status}</span>
      </td>
      <td className="px-4 py-2.5" style={{ fontSize: 12, color: '#606266' }}>{author}</td>
      <td className="px-4 py-2.5" style={{ fontSize: 12, color: '#909399' }}>{date}</td>
    </tr>
  );
}

/* ─────── DEMO CONTROLS ─────── */
function DemoControls({
  mode, isArchived, archiveReason, onModeChange, onArchivedChange, onOpen,
}: {
  mode: ProposalMode; isArchived: boolean; archiveReason: ArchiveReason;
  onModeChange: (m: ProposalMode) => void;
  onArchivedChange: (v: boolean, r?: ArchiveReason) => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-2 flex-wrap" style={{ background: '#1E3A5F', borderBottom: '2px solid #0F2540' }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Демо-режим:</span>

      <div className="flex items-center gap-1.5 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
        {(['edit', 'readonly'] as ProposalMode[]).map(m => (
          <button key={m} onClick={() => onModeChange(m)}
            className="px-3 py-1 text-xs flex items-center gap-1.5"
            style={{ background: mode === m ? '#409EFF' : 'transparent', color: mode === m ? '#fff' : 'rgba(255,255,255,0.55)', borderRadius: 6 }}>
            {m === 'edit' ? <><Pen size={10} />Редактирование</> : <><Eye size={10} />Только чтение</>}
          </button>
        ))}
      </div>

      <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.15)' }} />

      <button onClick={() => isArchived ? onArchivedChange(false) : onArchivedChange(true, 'completed')}
        className="px-3 py-1 text-xs rounded-lg flex items-center gap-1.5"
        style={{ border: '1px solid rgba(255,255,255,0.15)', color: isArchived ? '#E6A23C' : 'rgba(255,255,255,0.55)', background: isArchived ? 'rgba(230,162,60,0.1)' : 'transparent' }}>
        <Archive size={10} />
        {isArchived ? 'В архиве' : 'Активная запись'}
      </button>

      {isArchived && (
        <>
          {(['completed', 'irrelevant'] as const).map(r => (
            <button key={r} onClick={() => onArchivedChange(true, r)}
              className="px-2.5 py-1 text-xs rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: archiveReason === r ? '#fff' : 'rgba(255,255,255,0.4)', background: archiveReason === r ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
              {r === 'completed' ? '✓ Выполнено' : '✗ Не актуально'}
            </button>
          ))}
        </>
      )}

      <div className="flex-1" />

      <button onClick={onOpen}
        className="px-4 py-1.5 text-sm rounded-lg flex items-center gap-1.5 font-medium"
        style={{ background: '#409EFF', color: '#fff' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#66B1FF'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#409EFF'; }}>
        <ExternalLink size={13} />
        Открыть карточку
      </button>
    </div>
  );
}

/* ─────── MAIN APP ─────── */
export default function App() {
  const [modalOpen, setModalOpen] = useState(true);
  const [mode, setMode] = useState<ProposalMode>('edit');
  const [isArchived, setIsArchived] = useState(false);
  const [archiveReason, setArchiveReason] = useState<ArchiveReason>(null);

  const handleArchiveChange = (archived: boolean, reason?: ArchiveReason) => {
    setIsArchived(archived);
    setArchiveReason(reason ?? null);
  };

  const tableData = [
    { id: 'ПР-2024-0847', name: 'Интеграция модуля аналитики с системой отчётности ДИТ', status: 'В работе', author: 'Кузнецов А.В.', date: '22.04.2024' },
    { id: 'ПР-2024-0821', name: 'Разработка модуля уведомлений для ЕМИАС', status: 'На рассмотрении', author: 'Смирнов В.Н.', date: '18.04.2024' },
    { id: 'ПР-2024-0798', name: 'Оптимизация производительности ГАС «Управление»', status: 'Новое', author: 'Иванова О.П.', date: '15.04.2024' },
    { id: 'ПР-2024-0776', name: 'Внедрение системы мониторинга ЖКХ', status: 'Выполнено', author: 'Сидоров М.К.', date: '10.04.2024' },
    { id: 'ПР-2024-0754', name: 'Обновление справочников НСИ МАРИС', status: 'Отложено', author: 'Попов Д.А.', date: '05.04.2024' },
    { id: 'ПР-2024-0731', name: 'Интеграция с Реестром МФЦ г. Москвы', status: 'В работе', author: 'Кузнецова Е.В.', date: '01.04.2024' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F0F2F5', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <Toaster position="top-right" richColors closeButton />

      {/* Demo controls */}
      <DemoControls
        mode={mode}
        isArchived={isArchived}
        archiveReason={archiveReason}
        onModeChange={setMode}
        onArchivedChange={handleArchiveChange}
        onOpen={() => setModalOpen(true)}
      />

      {/* Admin layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-5">
            {/* Page header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-base" style={{ color: '#1E293B', fontWeight: 700, lineHeight: 1.3 }}>Реестр предложений</h1>
                <p className="text-xs mt-0.5" style={{ color: '#909399' }}>Управление требованиями и предложениями к системам</p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 text-sm rounded-lg text-white flex items-center gap-2"
                style={{ background: '#409EFF' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#66B1FF'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#409EFF'; }}
              >
                <Plus size={14} /> Новое предложение
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Всего предложений', value: '247', color: '#409EFF', bg: '#ECF5FF' },
                { label: 'В работе', value: '38', color: '#337ECC', bg: '#D9ECFF' },
                { label: 'На согласовании', value: '12', color: '#E6A23C', bg: '#FDF6EC' },
                { label: 'Выполнено за месяц', value: '21', color: '#67C23A', bg: '#F0F9EB' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4" style={{ border: '1px solid #DCDFE6', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div className="text-xs mb-2" style={{ color: '#909399' }}>{s.label}</div>
                  <div className="text-2xl" style={{ color: s.color, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DCDFE6', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #EBEEF5' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#303133' }}>Предложения</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#ECF5FF', color: '#409EFF' }}>6 записей</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #EBEEF5', background: '#FAFAFA' }}>
                      {['ID', 'Наименование', 'Статус', 'Автор', 'Обновлено'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left" style={{ fontSize: 11, color: '#909399', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map(row => (
                      <TableRow key={row.id} {...row} onClick={() => setModalOpen(true)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* The Modal */}
      <ProposalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={mode}
        isArchived={isArchived}
        archiveReason={archiveReason}
        onModeChange={setMode}
        onArchiveChange={handleArchiveChange}
      />
    </div>
  );
}