/**
 * AgTable – Thin wrapper around AgGridReact for use across all management pages.
 *
 * Props:
 *   rowData        – array of row objects
 *   columnDefs     – AG-Grid column definition array
 *   height         – grid height (default "60vh")
 *   pageSize       – initial page size (default 25)
 *   loading        – shows loading state
 *   showColPicker  – (boolean, default true) renders the column-picker button
 *   ...rest        – passed straight through to AgGridReact
 *
 * Column Picker features:
 *   • Dynamically reads column names from columnDefs
 *   • "Select All / Deselect All" checkbox
 *   • Per-column toggle with live show/hide via AG-Grid column API
 *   • Pinned / Actions columns are excluded from the picker (always visible)
 */

import { useState, useRef, useEffect, useCallback, type CSSProperties, type RefObject } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, type ColDef, type RowClassParams, type RowSelectionOptions, type RowStyle } from 'ag-grid-community';
// Note: Only import the theme CSS — do NOT import ag-grid.css alongside the Theming API
// (mixing both causes AG Grid error #239).
import 'ag-grid-community/styles/ag-theme-quartz.css';

// ─── Injected CSS overrides (more reliable than inline CSS vars) ───────────────
const GRID_STYLES = `
  /* ── Remove harsh grid lines — borders do the separation instead ── */
  .ag-theme-quartz .ag-cell {
    border-right: none !important;
  }
  .ag-theme-quartz .ag-header-cell {
    border-right: none !important;
    background: var(--color-bg-base) !important;
  }
  .ag-theme-quartz .ag-header-cell-text {
    font-size: 0.7rem !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-faint) !important;
  }

  /* ── Row separators ── */
  .ag-theme-quartz .ag-row {
    border-bottom: 1px solid var(--color-border) !important;
  }

  /* ── Row hover — soft indigo tint ── */
  .ag-theme-quartz .ag-row:not(.ag-row-pinned):hover {
    background-color: var(--color-primary-soft) !important;
    cursor: pointer;
  }

  /* ── Selected row ── */
  .ag-theme-quartz .ag-row-selected,
  .ag-theme-quartz .ag-row-selected .ag-cell {
    background-color: var(--color-primary-soft) !important;
  }

  /* ── Pinned footer ── */
  .ag-theme-quartz .ag-row-pinned {
    background: var(--color-bg-base) !important;
    font-weight: 700;
  }

  /* ── Alternating row stripe — kept subtle ── */
  .ag-theme-quartz .ag-row-odd { background-color: var(--color-bg-base); }
  .ag-theme-quartz .ag-row-odd:hover { background-color: var(--color-primary-soft) !important; }

  /* ── Floating filter row ── */
  .ag-theme-quartz .ag-floating-filter {
    padding-top:    4px;
    padding-bottom: 4px;
  }
  .ag-theme-quartz .ag-floating-filter-input input,
  .ag-theme-quartz .ag-text-field-input,
  .ag-theme-quartz .ag-floating-filter-body input {
    height:        32px !important;
    font-size:     0.82rem !important;
    padding:       0 10px !important;
    border-radius: var(--radius-sm) !important;
    border:        1px solid var(--color-border-strong) !important;
  }
  .ag-theme-quartz .ag-floating-filter-input input:focus,
  .ag-theme-quartz .ag-text-field-input:focus {
    border-color:  var(--color-primary) !important;
    outline:       none !important;
    box-shadow:    0 0 0 2px var(--color-primary-soft) !important;
  }
`;

ModuleRegistry.registerModules([AllCommunityModule]);

interface ColPickerProps {
  columnDefs: ColDef[];
  gridRef: RefObject<AgGridReact | null>;
}

// ─── Column Picker Dropdown ────────────────────────────────────────────────────
const ColPicker = ({ columnDefs, gridRef }: ColPickerProps) => {
  const [open, setOpen]       = useState(false);
  const [hidden, setHidden]   = useState<Set<string>>(new Set()); // set of field/colId keys that are hidden
  const dropRef               = useRef<HTMLDivElement | null>(null);

  // Build picker list – skip pinned / action-only columns
  const pickerCols = columnDefs.filter(
    (c) => !c.pinned && c.headerName && c.headerName !== '' && c.headerName !== 'Actions'
  );

  // Derive a stable key for each colDef
  const colKey = (c: ColDef): string => String(c.field || c.colId || c.headerName);

  const allChecked  = pickerCols.every((c) => !hidden.has(colKey(c)));
  const someChecked = pickerCols.some((c) => !hidden.has(colKey(c)));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Apply visibility to AG-Grid whenever hidden set changes
  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    pickerCols.forEach((c) => {
      const key = colKey(c);
      api.setColumnsVisible([key], !hidden.has(key));
    });
  }, [hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCol = (c: ColDef) => {
    const key = colKey(c);
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) {
      // Deselect all (but keep at least one visible — leave first one visible)
      setHidden(new Set(pickerCols.slice(1).map(colKey)));
    } else {
      setHidden(new Set()); // show all
    }
  };

  return (
    <div ref={dropRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Choose columns"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: open ? 'var(--color-primary)' : 'var(--glass-bg, #f8fafc)',
          color: open ? '#fff' : 'var(--color-text-main, #1e293b)',
          border: `1.5px solid ${open ? 'var(--color-primary)' : 'var(--glass-border, #e2e8f0)'}`,
          borderRadius: 8, padding: '0.3rem 0.75rem',
          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {/* columns icon */}
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="18" rx="1"/>
          <rect x="14" y="3" width="7" height="18" rx="1"/>
        </svg>
        Columns
        {/* badge showing hidden count */}
        {hidden.size > 0 && (
          <span style={{
            background: '#ef4444', color: '#fff', borderRadius: 10,
            fontSize: '0.65rem', fontWeight: 700, padding: '0 5px', lineHeight: '16px',
          }}>
            {hidden.size} hidden
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 9999,
          background: '#fff', border: '1.5px solid #e2e8f0',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
          minWidth: 220, maxHeight: 380, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '0.6rem 1rem', borderBottom: '1px solid #f1f5f9',
            fontSize: '0.75rem', fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.06em', background: '#f8fafc',
          }}>
            Show / Hide Columns
          </div>

          {/* Select-all row */}
          <div
            onClick={toggleAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0.55rem 1rem', cursor: 'pointer',
              borderBottom: '1px solid #f1f5f9',
              background: '#fff',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            {/* Indeterminate-aware checkbox */}
            <input
              type="checkbox"
              readOnly
              checked={allChecked}
              ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = !allChecked && someChecked; }}
              style={{ width: 15, height: 15, accentColor: '#6366f1', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
              Select All
            </span>
          </div>

          {/* Per-column rows */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {pickerCols.map((c) => {
              const key     = colKey(c);
              const visible = !hidden.has(key);
              return (
                <div
                  key={key}
                  onClick={() => toggleCol(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.5rem 1rem', cursor: 'pointer',
                    background: '#fff', transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={visible}
                    style={{ width: 15, height: 15, accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                  <span style={{
                    fontSize: '0.82rem',
                    color: visible ? '#1e293b' : '#94a3b8',
                    fontWeight: visible ? 500 : 400,
                  }}>
                    {c.headerName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '0.5rem 1rem', borderTop: '1px solid #f1f5f9',
            background: '#f8fafc', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {pickerCols.length - hidden.size} of {pickerCols.length} visible
            </span>
            <button
              onClick={() => setHidden(new Set())}
              style={{
                background: 'none', border: 'none', color: '#6366f1',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0,
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Auto-compute footer row from rowData + columnDefs ───────────────────────
const computeFooterRow = (rowData: any[], columnDefs: ColDef[]): Record<string, any> => {
  const footer: Record<string, any> = {};
  let labelSet = false;

  columnDefs.forEach((col) => {
    const field = col.field;
    if (!field) return; // skip valueGetter-only columns

    if (!labelSet) {
      // Put row count in the very first field column
      footer[field] = `Σ  ${rowData.length} rows`;
      labelSet = true;
      return;
    }

    // Sum if values are numeric
    const nums = rowData
      .map((r) => r[field])
      .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)));

    if (nums.length > 0 && nums.length === rowData.filter((r) => r[field] !== undefined && r[field] !== null).length) {
      // All defined values are numeric → sum
      const sum = nums.reduce((acc, v) => acc + Number(v), 0);
      footer[field] = sum % 1 === 0 ? sum : parseFloat(sum.toFixed(2));
    }
    // else leave undefined → cell stays blank in footer
  });

  return footer;
};

// ═══════════════════════════════════════════════════════════════════════════════
// AgTable
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Props:
 *   rowData        – array of row data objects
 *   columnDefs     – AG-Grid column definitions
 *   height         – grid height string (default '60vh')
 *   pageSize       – initial rows per page (default 25)
 *   loading        – boolean loading state
 *   showColPicker  – boolean, show column picker toolbar (default true)
 *   showFooter     – boolean, auto-compute and pin a summary footer row (default false)
 *   footerRow      – object, supply a custom pinned-bottom row (overrides showFooter)
 *   rowSelection   – 'single' | 'multiple' | false  (default 'single')
 *                    String values are auto-converted to the AG Grid v33+ object form.
 */
interface AgTableProps {
  rowData?: any[];
  columnDefs?: ColDef[];
  height?: string | number;
  pageSize?: number;
  loading?: boolean;
  showColPicker?: boolean;
  showFooter?: boolean;
  footerRow?: Record<string, any> | null;
  rowSelection?: 'single' | 'multiple' | false | RowSelectionOptions;
  enableExport?: boolean;
  exportFileName?: string;
  [key: string]: any;
}

const AgTable = ({
  rowData        = [],
  columnDefs     = [],
  height         = '60vh',
  pageSize       = 25,
  loading        = false,
  showColPicker  = true,
  showFooter     = false,
  footerRow      = null,
  rowSelection   = 'single',   // 'single' | 'multiple' | false
  enableExport   = true,
  exportFileName = 'export',
  ...rest
}: AgTableProps) => {
  // Convert deprecated string rowSelection to the AG Grid v33+ object form
  const selectionProp: RowSelectionOptions | undefined = !rowSelection
    ? undefined
    : typeof rowSelection === 'string'
      ? { mode: rowSelection === 'multiple' ? 'multiRow' : 'singleRow' }
      : rowSelection;
  const gridRef = useRef<AgGridReact | null>(null);

  // ── CSV export (uses AG-Grid's built-in community exporter) ────────────────
  const handleExport = useCallback(() => {
    const ts = new Date().toISOString().slice(0, 10);
    gridRef.current?.api?.exportDataAsCsv({
      fileName: `${exportFileName}_${ts}.csv`,
      // Skip the pinned summary footer row from the export
      skipPinnedBottom: true,
    });
  }, [exportFileName]);

  // ── Compute pinned bottom row ──────────────────────────────────────────────
  const pinnedBottom = useCallback((): Record<string, any>[] => {
    if (loading || rowData.length === 0) return [];
    if (footerRow)   return [footerRow];
    if (showFooter)  return [computeFooterRow(rowData, columnDefs)];
    return [];
  }, [rowData, columnDefs, footerRow, showFooter, loading]);

  const defaultColDef: ColDef = {
    flex:           1,
    minWidth:       120,
    filter:         true,
    floatingFilter: true,
    sortable:       true,
    resizable:      true,
  };

  // ── Footer row styling ─────────────────────────────────────────────────────
  const getRowStyle = useCallback((params: RowClassParams): RowStyle | undefined => {
    if (params.node.rowPinned === 'bottom') {
      return {
        background:  'linear-gradient(90deg, #eef2ff 0%, #f5f3ff 100%)',
        fontWeight:  700,
        fontSize:    '0.82rem',
        color:       '#3730a3',
        borderTop:   '2px solid #6366f1',
        letterSpacing: '0.01em',
      };
    }
    return undefined;
  }, []);

  return (
    <div style={{ width: '100%' }}>
      {/* Injected hover / selection styles */}
      <style>{GRID_STYLES}</style>
      {/* Toolbar — export + column picker */}
      {(showColPicker || enableExport) && !loading && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid var(--glass-border, #e2e8f0)',
          background: 'var(--glass-bg, #f8fafc)',
        }}>
          {enableExport && (
            <button
              onClick={handleExport}
              title="Export current rows to CSV"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--glass-bg, #f8fafc)',
                color: 'var(--color-text-main, #1e293b)',
                border: '1.5px solid var(--glass-border, #e2e8f0)',
                borderRadius: 8, padding: '0.3rem 0.75rem',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          )}
          {showColPicker && <ColPicker columnDefs={columnDefs} gridRef={gridRef} />}
        </div>
      )}

      {/* Grid */}
      <div
        className="ag-theme-quartz"
        style={{
          height,
          width: '100%',
          // ── Gridlines ──────────────────────────────────────────────────────
          '--ag-row-border-color':                '#94a3b8',
          '--ag-row-border-width':                '1px',
          '--ag-cell-horizontal-border':          'solid #94a3b8',
          '--ag-header-column-separator-color':   '#64748b',
          '--ag-header-column-separator-height':  '70%',
          '--ag-header-column-separator-width':   '1px',
          // ── Row selection (must be set as CSS var for AG Grid to pick it up) ─
          '--ag-selected-row-background-color':   '#bbf7d0',
          '--ag-range-selection-border-color':    '#22c55e',
        } as CSSProperties}
      >
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading...
          </div>
        ) : (
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination={true}
            paginationPageSize={pageSize}
            paginationPageSizeSelector={[25, 50, 100]}
            rowHeight={52}
            headerHeight={44}
            floatingFiltersHeight={48}
            pinnedBottomRowData={pinnedBottom()}
            getRowStyle={getRowStyle}
            rowSelection={selectionProp}
            overlayNoRowsTemplate='<span style="padding:10px;border:2px solid #e2e8f0;background:#fff;border-radius:4px;">No records found.</span>'
            {...rest}
          />
        )}
      </div>
    </div>
  );
};

export default AgTable;
