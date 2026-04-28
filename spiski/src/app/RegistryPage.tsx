import React, { useState, useMemo } from 'react';
import { HeaderToolbar } from './components/HeaderToolbar';
import { FilterBar } from './components/FilterBar';
import { ColumnHeaders } from './components/ColumnHeaders';
import { RequirementRowCard } from './components/RequirementRowCard';
import { SkeletonRow } from './components/SkeletonRow';
import { EmptyState } from './components/EmptyState';
import { BulkActionsBar } from './components/BulkActionsBar';
import { PaginationBar } from './components/PaginationBar';
import { Variant, ViewState, FilterState } from './components/registry/types';
import { MOCK_PROPOSALS } from './components/registry/mock-data';

interface RegistryPageProps {
  variant: Variant;
  viewState: ViewState;
}

const PAGE_SIZE_DEFAULT = 10;

export function RegistryPage({ variant, viewState }: RegistryPageProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    section: '',
    system: '',
    priority: '',
    search: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['2', '9']));
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [sortColumn, setSortColumn] = useState<string>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const isB = variant === 'B';

  // Filter proposals
  const filtered = useMemo(() => {
    return MOCK_PROPOSALS.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (filters.section && p.section !== filters.section) return false;
      if (filters.system && p.system !== filters.system) return false;
      if (filters.priority && p.priority !== filters.priority) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.displayId.toLowerCase().includes(q) &&
          !p.initiator.toLowerCase().includes(q) &&
          !p.responsible.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== 'search' && v !== ''
  ).length;

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleResetFilters = () => {
    setFilters({ status: '', section: '', system: '', priority: '', search: '' });
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((p) => p.id)));
    }
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  const handlePageChange = (p: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, p)));
    setSelectedIds(new Set());
  };

  const handlePageSizeChange = (s: number) => {
    setPageSize(s);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const hasFilters = activeFilterCount > 0 || filters.search !== '';

  // Skeleton count
  const skeletonCount = 8;

  const isLoading = viewState === 'loading';
  const isEmpty = viewState === 'empty' || (!isLoading && filtered.length === 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <HeaderToolbar
        searchValue={filters.search}
        onSearchChange={(v) => handleFilterChange('search', v)}
        totalCount={MOCK_PROPOSALS.length}
        filteredCount={filtered.length}
      />

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        activeCount={activeFilterCount}
      />

      {/* Table area */}
      <div className="flex-1 overflow-auto">
        <div className={`${isB ? 'px-4 pb-4' : 'px-0 pb-4'} min-w-[900px]`}>
          {/* Column headers */}
          <ColumnHeaders
            variant={variant}
            allSelected={!isLoading && paginated.length > 0 && selectedIds.size === paginated.length}
            someSelected={selectedIds.size > 0 && selectedIds.size < paginated.length}
            onSelectAll={handleSelectAll}
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
          />

          {/* Rows container */}
          <div className={`${isB ? 'flex flex-col gap-1.5 pt-2' : 'flex flex-col'}`}>
            {isLoading ? (
              Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonRow key={i} variant={variant} index={i} />
              ))
            ) : isEmpty ? (
              <EmptyState hasFilters={hasFilters} onReset={handleResetFilters} />
            ) : (
              paginated.map((proposal) => (
                <RequirementRowCard
                  key={proposal.id}
                  proposal={proposal}
                  variant={variant}
                  isSelected={selectedIds.has(proposal.id)}
                  onSelect={handleSelect}
                  onOpen={(id) => console.log('Open proposal', id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && !isEmpty && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Bulk actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onArchive={() => { setSelectedIds(new Set()); }}
        onDelete={() => { setSelectedIds(new Set()); }}
        onUnlink={() => { setSelectedIds(new Set()); }}
      />
    </div>
  );
}
