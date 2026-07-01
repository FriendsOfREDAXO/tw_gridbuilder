/**
 * Getaweb Pagebuilder – Vue 3 Grid-Builder
 */
(function () {
  'use strict';

  window.PB = window.PB || {};

  window.PB.init = function (config) {
    const { mountId, outputId, modules, initialData, ajaxUrl, csrfToken } = config;
    loadVue().then((Vue) => startApp(Vue, { mountId, outputId, modules, initialData, ajaxUrl, csrfToken }));
  };

  function loadVue() {
    if (window.Vue) return Promise.resolve(window.Vue);
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/vue@3/dist/vue.global.prod.js';
      s.onload = () => resolve(window.Vue);
      document.head.appendChild(s);
    });
  }

  const FORM_CONTAINER_ID = (mountId) => 'pb-form-raw-' + mountId;

  function setFormHtml(mountId, html, prefillCallback) {
    const el = document.getElementById(FORM_CONTAINER_ID(mountId));
    if (!el) return;
    // Destroy existing CKEditor instances before replacing DOM
    if (typeof window.cke5_destroy === 'function') {
      el.querySelectorAll('.cke5-editor[data-cke5-init-state="ready"]').forEach((ta) => {
        window.cke5_destroy(window.jQuery ? window.jQuery(ta) : ta);
      });
    }
    el.innerHTML = html;
    // Werte VOR rex:ready/initWidgets setzen, damit Media-Widgets korrekte Initialwerte lesen
    if (prefillCallback) prefillCallback(el);
    initWidgets(el);
  }

  function clearFormHtml(mountId) {
    const el = document.getElementById(FORM_CONTAINER_ID(mountId));
    if (el) el.innerHTML = '';
  }

  // Füllt gespeicherte Werte zurück in Formularfelder
  function prefillForm(container, prefix, values) {
    if (!values || typeof values !== 'object') return;
    // Index: alle benannten Felder einmal einlesen (für schnellen Lookup)
    const fieldMap = {};
    container.querySelectorAll('[name]').forEach((el) => {
      if (!fieldMap[el.name]) fieldMap[el.name] = [];
      fieldMap[el.name].push(el);
    });

    flattenValues(values, prefix, (name, val) => {
      const els = fieldMap[name];
      if (!els || els.length === 0) return;
      els.forEach((el) => {
        if (el.type === 'checkbox') {
          el.checked = !!val;
        } else if (el.type === 'radio') {
          el.checked = (el.value === String(val));
        } else if (el.tagName === 'SELECT') {
          el.value = String(val);
          if (window.jQuery && jQuery.fn.selectpicker) {
            try { jQuery(el).selectpicker('val', String(val)).selectpicker('render'); } catch(e) {}
          }
        } else {
          // Sanitize: unreplaced REX tokens (e.g. "REX_MEDIA[1]") als leer behandeln
          const cleanVal = /^REX_[A-Z_]+\[\d+\]$/i.test(String(val)) ? '' : String(val ?? '');
          el.value = cleanVal;
          el.dispatchEvent(new Event('input',  { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  }

  // Flattens nested values object to bracket-notation paths
  function flattenValues(obj, prefix, callback) {
    if (typeof obj !== 'object' || obj === null) {
      callback(prefix, obj);
      return;
    }
    Object.entries(obj).forEach(([k, v]) => {
      flattenValues(v, prefix + '[' + k + ']', callback);
    });
  }

  function initWidgets(container) {
    if (!container) return;
    // Re-execute inline scripts (e.g. MForm conditional logic)
    container.querySelectorAll('script').forEach((old) => {
      const s = document.createElement('script');
      if (old.src) { s.src = old.src; } else { s.textContent = old.textContent; }
      old.parentNode.replaceChild(s, old);
    });
    if (window.jQuery) {
      const $container = jQuery(container);
      // MForm: tabs, toggle, customlink (rexlink/linkmap), conditionals etc.
      // Das rex:ready Event initialisiert alle MForm-Elemente im Container.
      jQuery(document).trigger('rex:ready', [$container]);
      // Tooltip
      $container.find('[data-toggle="tooltip"]').tooltip();
    }
  }

  function startApp(Vue, { mountId, outputId, modules, initialData, ajaxUrl, csrfToken }) {
    const { createApp, reactive, nextTick, computed, onMounted } = Vue;

    const uid = () => Math.random().toString(36).slice(2, 9);

    // ── Data model ────────────────────────────────────────────────────────────
    // Cell: { id, span, modules: [{ id, module_id, values }] }
    function makeModuleSlot() {
      return { id: uid(), module_id: null, values: {} };
    }
    function makeCell(defaultSpan) {
      return {
        id: uid(), span: defaultSpan, modules: [],
        bg: '', bg_image: '', bg_video: '',
        py_top: '0', py_top_md: '0', py_top_lg: '0',
        py_bottom: '0', py_bottom_md: '0', py_bottom_lg: '0',
        px: '0', px_md: '0', px_lg: '0',
        align: 'start', text_align: '', rounded: false, preview: '',
      };
    }
    function makeRow(cols) {
      const span = Math.floor(12 / cols);
      return {
        id: uid(), cols,
        cells: Array.from({ length: cols }, () => makeCell(span)),
        container: 'standard', content_width: 'standard',
        py_top: '3', py_top_md: '3', py_top_lg: '3',
        py_bottom: '3', py_bottom_md: '3', py_bottom_lg: '3',
        gap: '4', gap_md: '4', gap_lg: '4',
        bg: '', bg_image: '', bg_video: '',
        mobile_reverse: false, text_align: '', align_v: '',
        expanded: false,
      };
    }

    function migrateCell(c) {
      const base_pt = c.py_top    || '0';
      const base_pb = c.py_bottom || '0';
      const base_px = c.px        || '0';
      const cell = {
        id: c.id || uid(), span: c.span || 12, modules: [],
        bg: c.bg || '', bg_image: c.bg_image || '', bg_video: c.bg_video || '',
        py_top:    base_pt, py_top_md:    c.py_top_md    || base_pt, py_top_lg:    c.py_top_lg    || c.py_top_md    || base_pt,
        py_bottom: base_pb, py_bottom_md: c.py_bottom_md || base_pb, py_bottom_lg: c.py_bottom_lg || c.py_bottom_md || base_pb,
        px:        base_px, px_md:        c.px_md        || base_px, px_lg:        c.px_lg        || c.px_md        || base_px,
        align: c.align || 'start', text_align: c.text_align || '',
        rounded: c.rounded || false, preview: '',
      };
      if (Array.isArray(c.modules)) {
        cell.modules = c.modules.map((m) => ({ id: m.id || uid(), module_id: m.module_id || null, values: m.values || {} }));
      } else if (c.module_id) {
        cell.modules = [{ id: uid(), module_id: c.module_id, values: c.values || {} }];
      }
      return cell;
    }

    function migrateRow(r) {
      const base_pt  = r.py_top    || '3';
      const base_pb  = r.py_bottom || '3';
      const base_gap = r.gap       || '4';
      return {
        ...r,
        expanded: false,
        py_top:    base_pt,  py_top_md:    r.py_top_md    || base_pt,  py_top_lg:    r.py_top_lg    || r.py_top_md    || base_pt,
        py_bottom: base_pb,  py_bottom_md: r.py_bottom_md || base_pb,  py_bottom_lg: r.py_bottom_lg || r.py_bottom_md || base_pb,
        gap:       base_gap, gap_md:       r.gap_md       || base_gap, gap_lg:       r.gap_lg       || r.gap_md       || base_gap,
        align_v: r.align_v || '',
        cells: (r.cells || []).map(migrateCell),
      };
    }

    const rows = reactive(
      (initialData.rows || []).map(migrateRow)
    );

    // ── Panel state ───────────────────────────────────────────────────────────
    const panel = reactive({
      open: false, tab: 'module',
      cellTab: 'content',  // 'content' | 'settings' (inner tab for cell panel)
      cell: null, row: null,
      slotIdx: null,
      loading: false,
      saved: false,
    });

    // Computed: current slot object
    function activeSlot() {
      if (!panel.cell || panel.slotIdx === null) return null;
      return panel.cell.modules[panel.slotIdx] || null;
    }

    // ── Row drag-to-reorder ──────────────────────────────────────────────────
    const rowDrag = reactive({ dragIdx: null, overIdx: null });

    function onRowDragStart(e, idx) { rowDrag.dragIdx = idx; e.dataTransfer.effectAllowed = 'move'; }
    function onRowDragOver(e, idx)  { e.preventDefault(); rowDrag.overIdx = idx; }
    function onRowDragEnd() {
      if (rowDrag.dragIdx !== null && rowDrag.overIdx !== null && rowDrag.dragIdx !== rowDrag.overIdx) {
        const moved = rows.splice(rowDrag.dragIdx, 1)[0];
        const t = rowDrag.overIdx > rowDrag.dragIdx ? rowDrag.overIdx - 1 : rowDrag.overIdx;
        rows.splice(t, 0, moved);
      }
      rowDrag.dragIdx = null; rowDrag.overIdx = null;
    }

    // ── Cell drag-to-reorder within row ─────────────────────────────────────
    const cellDrag = reactive({ rowId: null, fromIdx: null, overIdx: null });

    function onCellDragStart(e, row, cellIdx) {
      e.stopPropagation();
      cellDrag.rowId = row.id; cellDrag.fromIdx = cellIdx;
      e.dataTransfer.effectAllowed = 'move';
    }
    function onCellDragOver(e, row, cellIdx) {
      if (cellDrag.rowId !== row.id) return;
      e.preventDefault(); e.stopPropagation();
      cellDrag.overIdx = cellIdx;
    }
    function onCellDragEnd(e, row) {
      e.stopPropagation();
      if (cellDrag.rowId === row.id && cellDrag.fromIdx !== null && cellDrag.overIdx !== null && cellDrag.fromIdx !== cellDrag.overIdx) {
        const moved = row.cells.splice(cellDrag.fromIdx, 1)[0];
        const t = cellDrag.overIdx > cellDrag.fromIdx ? cellDrag.overIdx - 1 : cellDrag.overIdx;
        row.cells.splice(t, 0, moved);
        if (panel.cell && panel.cell.id === moved.id) panel.cell = moved;
      }
      cellDrag.rowId = null; cellDrag.fromIdx = null; cellDrag.overIdx = null;
    }

    // ── Cell resize handles ──────────────────────────────────────────────────
    let resizeActive = false, resizeRow = null, resizeLeft = 0, resizeStartX = 0, resizeStartSpans = [];

    function onResizeStart(e, row, leftCellIdx) {
      e.preventDefault(); e.stopPropagation();
      resizeActive = true; resizeRow = row; resizeLeft = leftCellIdx;
      resizeStartX = e.clientX;
      resizeStartSpans = row.cells.map((c) => c.span);
      window.addEventListener('mousemove', onResizeMove);
      window.addEventListener('mouseup',   onResizeEnd);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }
    function onResizeMove(e) {
      if (!resizeActive || !resizeRow) return;
      const rightIdx = resizeLeft + 1;
      if (rightIdx >= resizeRow.cells.length) return;
      const gridEl = document.querySelector(`[data-row-id="${resizeRow.id}"] .pb-cells-grid`);
      if (!gridEl) return;
      const pixelsPerSpan = gridEl.offsetWidth / 12;
      const delta = Math.round((e.clientX - resizeStartX) / pixelsPerSpan);
      const origL = resizeStartSpans[resizeLeft], origR = resizeStartSpans[rightIdx];
      const newL = Math.max(1, Math.min(origL + origR - 1, origL + delta));
      resizeRow.cells[resizeLeft].span = newL;
      resizeRow.cells[rightIdx].span   = origL + origR - newL;
    }
    function onResizeEnd() {
      resizeActive = false; resizeRow = null;
      window.removeEventListener('mousemove', onResizeMove);
      window.removeEventListener('mouseup',   onResizeEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    // types: optional, z.B. 'mp4' für Videofilter
    function openMedia(pbId, setter, types) {
      if (typeof openREXMedia !== 'function') return;
      const params = types ? '&args%5Btypes%5D=' + encodeURIComponent(types) : '';
      const mediaWin = openREXMedia(pbId, params);
      // rex:selectMedia feuert auf dem Popup-Window (nicht opener), daher dort binden
      if (window.jQuery && mediaWin) {
        jQuery(mediaWin).off('rex:selectMedia.pb').on('rex:selectMedia.pb', function (e, filename) {
          setter(filename);
        });
      }
    }

    // ── Rows ─────────────────────────────────────────────────────────────────
    function addRow() { rows.push(makeRow(1)); }

    function removeRow(idx) {
      if (!confirm('Zeile löschen?')) return;
      if (panel.row === rows[idx] || (panel.cell && rows[idx].cells.includes(panel.cell))) closePanel();
      rows.splice(idx, 1);
    }

    function moveRow(idx, dir) {
      const t = idx + dir;
      if (t < 0 || t >= rows.length) return;
      [rows[t], rows[idx]] = [rows[idx], rows[t]];
    }

    function setRowCols(row, n) {
      row.cols = n;
      const base = Math.floor(12 / n);
      const extra = 12 - base * n; // remainder distributed to first cells
      while (row.cells.length < n) row.cells.push(makeCell(base));
      while (row.cells.length > n) row.cells.pop();
      row.cells.forEach((c, i) => { c.span = base + (i < extra ? 1 : 0); });
    }

    // ── Panel ────────────────────────────────────────────────────────────────
    function openCellPanel(row, cell) {
      collectFromDom();
      panel.row = row; panel.cell = cell;
      panel.tab = 'module'; panel.cellTab = 'content'; panel.open = true; panel.saved = false;
      panel.slotIdx = cell.modules.length > 0 ? 0 : null;
      clearFormHtml(mountId);
      const slot = activeSlot();
      if (slot && slot.module_id) {
        loadModuleForm(cell, slot);
        refreshCellPreview(cell);
      }
    }

    function openRowPanel(row) {
      collectFromDom();
      panel.row = row; panel.cell = null;
      panel.tab = 'row'; panel.open = true; panel.saved = false;
    }

    function closePanel() {
      collectFromDom();
      panel.open = false;
      panel.cell = null; panel.row = null; panel.slotIdx = null;
      clearFormHtml(mountId);
    }

    function applyAndClose() {
      collectFromDom();
      serialize();
      panel.saved = true;
      // Preview für die aktive Zelle aktualisieren
      if (panel.cell) refreshCellPreview(panel.cell);
      setTimeout(closePanel, 300);
    }

    function refreshCellPreview(cell) {
      if (!cell.modules.length) { cell.preview = ''; return; }
      const url = ajaxUrl
        + '&rex_csrf_token=' + csrfToken
        + '&twgb_preview=1'
        + '&cell_data=' + encodeURIComponent(JSON.stringify(cell));
      fetch(url)
        .then(r => r.json())
        .then(data => { if (data.preview !== undefined) cell.preview = data.preview; })
        .catch(() => {});
    }

    // ── Module slots in cell ─────────────────────────────────────────────────
    function addSlot() {
      collectFromDom();
      const slot = makeModuleSlot();
      panel.cell.modules.push(slot);
      panel.slotIdx = panel.cell.modules.length - 1;
      clearFormHtml(mountId);
    }

    function removeSlot(idx) {
      collectFromDom();
      panel.cell.modules.splice(idx, 1);
      if (panel.slotIdx >= panel.cell.modules.length) {
        panel.slotIdx = panel.cell.modules.length - 1;
      }
      clearFormHtml(mountId);
      const slot = activeSlot();
      if (slot && slot.module_id) loadModuleForm(panel.cell, slot);
    }

    function selectSlot(idx) {
      collectFromDom();
      panel.slotIdx = idx;
      clearFormHtml(mountId);
      const slot = activeSlot();
      if (slot && slot.module_id) loadModuleForm(panel.cell, slot);
    }

    function moveSlot(idx, dir) {
      const t = idx + dir;
      if (t < 0 || t >= panel.cell.modules.length) return;
      [panel.cell.modules[t], panel.cell.modules[idx]] = [panel.cell.modules[idx], panel.cell.modules[t]];
      panel.slotIdx = t;
    }

    function onModuleChange(slot) {
      slot.values = {};
      clearFormHtml(mountId);
      if (slot.module_id) loadModuleForm(panel.cell, slot);
    }

    function switchToContent() {
      panel.cellTab = 'content';
      nextTick(() => {
        const slot = activeSlot();
        if (slot && slot.module_id) loadModuleForm(panel.cell, slot);
      });
    }

    function loadModuleForm(cell, slot) {
      panel.loading = true;
      // namespace: cell.id + slot.id to be unique
      const ns = cell.id + '_' + slot.id;
      const url = ajaxUrl
        + '&module_id=' + slot.module_id
        + '&cell_id='   + ns
        + '&values='    + encodeURIComponent(JSON.stringify(slot.values || {}))
        + '&rex_csrf_token=' + csrfToken;

      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          panel.loading = false;
          nextTick(() => {
            const ns = cell.id + '_' + slot.id;
            const prefix = 'REX_INPUT_VALUE[twgb][' + ns + ']';
            const hasPrefill = slot.values && Object.keys(slot.values).length > 0;
            // Prefill-Callback: läuft nach innerHTML, VOR rex:ready/initWidgets.
            // So lesen Media-Widgets und CKEditor korrekte Initialwerte.
            const prefillCb = hasPrefill
              ? (container) => prefillForm(container, prefix, slot.values)
              : null;
            setFormHtml(mountId, data.html || '', prefillCb);
          });
        })
        .catch(() => {
          panel.loading = false;
          nextTick(() => setFormHtml(mountId, '<div class="alert alert-danger">Fehler beim Laden.</div>'));
        });
    }

    // ── Serialisierung ────────────────────────────────────────────────────────
    function syncCke5ToTextareas(container) {
      if (!container || typeof window.cke5_destroy !== 'function') return;
      container.querySelectorAll('.cke5-editor[data-cke5-init-state="ready"]').forEach((el) => {
        // cke5_destroy syncs editor content to textarea before destroying
        window.cke5_destroy(window.jQuery ? window.jQuery(el) : el);
      });
    }

    function collectFromDom() {
      const slot = activeSlot();
      if (!slot || !slot.module_id || !panel.cell) return;
      const container = document.getElementById(FORM_CONTAINER_ID(mountId));
      if (!container) return;
      syncCke5ToTextareas(container);

      const ns = panel.cell.id + '_' + slot.id;
      const prefix = `REX_INPUT_VALUE[twgb][${ns}]`;
      const collected = {};

      container.querySelectorAll('[name]').forEach((el) => {
        if (!el.name.startsWith(prefix)) return;
        const rest = el.name.slice(prefix.length);
        let val;
        if (el.type === 'checkbox') { val = el.checked ? (el.value || '1') : ''; }
        else if (el.type === 'radio') { if (!el.checked) return; val = el.value; }
        else { val = el.value; }
        const keys = [];
        let tmp = rest;
        while (tmp.length > 0) {
          const m = tmp.match(/^\[([^\]]*)\]/);
          if (!m) break;
          keys.push(m[1]); tmp = tmp.slice(m[0].length);
        }
        setNestedValue(collected, keys, val);
      });

      slot.values = collected;
    }

    function setNestedValue(obj, keys, val) {
      if (!keys.length) return;
      if (keys.length === 1) { obj[keys[0]] = val; return; }
      if (!obj[keys[0]] || typeof obj[keys[0]] !== 'object') obj[keys[0]] = {};
      setNestedValue(obj[keys[0]], keys.slice(1), val);
    }

    function serialize() {
      collectFromDom();
      const data = {
        rows: rows.map((r) => ({
          id: r.id, cols: r.cols,
          container: r.container, content_width: r.content_width,
          py_top: r.py_top, py_top_md: r.py_top_md, py_top_lg: r.py_top_lg,
          py_bottom: r.py_bottom, py_bottom_md: r.py_bottom_md, py_bottom_lg: r.py_bottom_lg,
          gap: r.gap, gap_md: r.gap_md, gap_lg: r.gap_lg,
          bg: r.bg, bg_image: r.bg_image, bg_video: r.bg_video,
          mobile_reverse: r.mobile_reverse, text_align: r.text_align, align_v: r.align_v || '',
          cells: r.cells.map((c) => ({
            id: c.id, span: c.span,
            bg: c.bg, bg_image: c.bg_image, bg_video: c.bg_video,
            py_top: c.py_top, py_top_md: c.py_top_md, py_top_lg: c.py_top_lg,
            py_bottom: c.py_bottom, py_bottom_md: c.py_bottom_md, py_bottom_lg: c.py_bottom_lg,
            px: c.px, px_md: c.px_md, px_lg: c.px_lg,
            align: c.align, text_align: c.text_align, rounded: c.rounded,
            modules: c.modules.map((s) => ({ id: s.id, module_id: s.module_id, values: s.values || {} })),
          })),
        })),
      };
      const out = document.getElementById(outputId);
      if (out) out.value = JSON.stringify(data);
    }

    const form = document.getElementById(outputId)?.closest('form');
    if (form) form.addEventListener('submit', serialize);

    // ── Vue App ───────────────────────────────────────────────────────────────
    createApp({
      setup() {
        onMounted(() => {
          rows.forEach(r => r.cells.forEach(c => { if (c.modules.length) refreshCellPreview(c); }));
        });
        return {
          rows, panel, modules, rowDrag, cellDrag,
          pbFormId: FORM_CONTAINER_ID(mountId),
          activeSlot,
          addRow, removeRow, moveRow, setRowCols,
          openCellPanel, openRowPanel, closePanel, applyAndClose,
          addSlot, removeSlot, selectSlot, moveSlot, onModuleChange,
          collectFromDom, switchToContent,
          isPresetActive: (row, spans) => {
            if (row.cells.length !== spans.length) return false;
            return row.cells.every((c, i) => c.span === spans[i]);
          },
          applyPreset: (row, spans) => {
            // Ensure correct number of cells
            const n = spans.length;
            while (row.cells.length < n) row.cells.push(makeCell(Math.floor(12 / n)));
            while (row.cells.length > n) row.cells.pop();
            spans.forEach((s, i) => { row.cells[i].span = s; });
            row.cols = n;
          },
          onRowDragStart, onRowDragOver, onRowDragEnd,
          onCellDragStart, onCellDragOver, onCellDragEnd,
          onResizeStart,
          layoutPresets: {
            2: [
              { label: '½ ½',   spans: [6, 6] },
              { label: '⅓ ⅔',   spans: [4, 8] },
              { label: '⅔ ⅓',   spans: [8, 4] },
              { label: '¼ ¾',   spans: [3, 9] },
              { label: '¾ ¼',   spans: [9, 3] },
            ],
            3: [
              { label: '⅓ ⅓ ⅓',     spans: [4, 4, 4] },
              { label: '¼ ½ ¼',     spans: [3, 6, 3] },
              { label: '¼ ¼ ½',     spans: [3, 3, 6] },
              { label: '½ ¼ ¼',     spans: [6, 3, 3] },
              { label: '⅙ ⅔ ⅙',    spans: [2, 8, 2] },
            ],
            4: [
              { label: '¼ ¼ ¼ ¼',  spans: [3, 3, 3, 3] },
              { label: '½ ⅙ ⅙ ⅙', spans: [6, 2, 2, 2] },
              { label: '⅙ ⅙ ⅙ ½', spans: [2, 2, 2, 6] },
              { label: '⅙ ⅙ ½ ⅙', spans: [2, 2, 6, 2] },
              { label: '⅙ ½ ⅙ ⅙', spans: [2, 6, 2, 2] },
            ],
            5: [
              { label: 'gleich',   spans: [2, 3, 2, 3, 2] },
              { label: '⅓ + 4×⅙', spans: [4, 2, 2, 2, 2] },
              { label: '4×⅙ + ⅓', spans: [2, 2, 2, 2, 4] },
              { label: '4×⅙ ⅓ 4×⅙', spans: [2, 2, 4, 2, 2] },
            ],
            6: [
              { label: 'gleich',     spans: [2, 2, 2, 2, 2, 2] },
            ],
          },
          openMedia,
          containerOptions: [
            { value: 'standard', label: 'Standard (Container)' },
            { value: 'full',     label: 'Volle Browserbreite' },
          ],
          contentWidthOptions: [
            { value: 'standard', label: 'Standard' },
            { value: 'full',     label: 'Volle Breite' },
          ],
          bgOptions: [
            { value: '',                 label: 'Transparent' },
            { value: 'bg-white',         label: 'Weiß' },
            { value: 'bg-black',         label: 'Schwarz' },
            { value: 'bg-primary-500',   label: 'Primärfarbe' },
            { value: 'bg-secondary-50',  label: 'Sekundärfarbe' },
            { value: 'bg-neutral-200',   label: 'Neutral 200' },
            { value: 'bg-neutral-100',   label: 'Neutral 100' },
            { value: 'bg-neutral-50',    label: 'Neutral 50' },
          ],
          textAlignOptions: [
            { value: '',            label: 'Standard (links)' },
            { value: 'text-center', label: 'Zentriert' },
            { value: 'text-right',  label: 'Rechts' },
          ],
        };
      },

      template: `
<div class="pb-root">

  <!-- Toolbar -->
  <div class="pb-toolbar">
    <button type="button" class="btn btn-save" style="margin-left:auto" @click="addRow">Zeile hinzufügen</button>
  </div>

  <!-- Rows -->
  <div class="pb-rows">
    <div
      v-for="(row, rIdx) in rows" :key="row.id"
      class="pb-row-wrap"
      :class="{ 'pb-drag-over': rowDrag.overIdx === rIdx }"
      :data-row-id="row.id"
      draggable="true"
      @dragstart="onRowDragStart($event, rIdx)"
      @dragover="onRowDragOver($event, rIdx)"
      @dragend="onRowDragEnd"
    >
      <!-- Row Header -->
      <div class="pb-row-header">
        <span class="pb-drag-handle" title="Zeile ziehen">⠿</span>
        <span class="pb-row-label">Zeile {{ rIdx + 1 }}</span>
        <div class="pb-col-picker">
          <button v-for="n in 6" :key="n" type="button"
            class="pb-col-btn" :class="{ active: row.cols === n }"
            @click.stop="setRowCols(row, n)">{{ n }}</button>
        </div>
        <div v-if="layoutPresets[row.cols]" class="pb-preset-picker">
          <button v-for="p in layoutPresets[row.cols]" :key="p.label" type="button"
            class="pb-preset-btn" :class="{ active: isPresetActive(row, p.spans) }"
            :title="p.spans.join(' + ') + ' von 12'"
            @click.stop="applyPreset(row, p.spans)">{{ p.label }}</button>
        </div>
        <button type="button" class="pb-icon-btn" @click.stop="openRowPanel(row)" title="Zeilen-Einstellungen">⚙</button>
        <div class="pb-row-actions">
          <button type="button" class="pb-icon-btn" :class="{ active: row.expanded }" @click.stop="row.expanded = !row.expanded" title="Vorschau ein-/ausklappen">⊞</button>
          <button type="button" class="pb-icon-btn" @click.stop="moveRow(rIdx, -1)" :disabled="rIdx === 0">↑</button>
          <button type="button" class="pb-icon-btn" @click.stop="moveRow(rIdx, 1)"  :disabled="rIdx === rows.length - 1">↓</button>
          <button type="button" class="pb-icon-btn danger" @click.stop="removeRow(rIdx)">✕</button>
        </div>
      </div>

      <!-- Row Meta -->
      <div class="pb-row-meta" v-if="row.bg || row.bg_image || row.bg_video || row.gap !== '4' || row.gap_md !== '4' || row.gap_lg !== '4' || row.container !== 'standard' || row.content_width !== 'standard' || row.py_top !== '3' || row.py_top_md !== '3' || row.py_top_lg !== '3' || row.py_bottom !== '3' || row.py_bottom_md !== '3' || row.py_bottom_lg !== '3' || row.mobile_reverse || row.text_align || row.align_v">
        <span v-if="row.container !== 'standard'" class="pb-tag">{{ row.container }}</span>
        <span v-if="row.content_width !== 'standard'" class="pb-tag">Inhalt: {{ row.content_width }}</span>
        <span v-if="row.bg" class="pb-tag">{{ row.bg }}</span>
        <span v-if="row.bg_image" class="pb-tag"><i class="rex-icon fa fa-image"></i> {{ row.bg_image }}</span>
        <span v-if="row.bg_video" class="pb-tag"><i class="rex-icon fa fa-film"></i> {{ row.bg_video }}</span>
        <span v-if="row.gap !== '4' || row.gap_md !== '4' || row.gap_lg !== '4'" class="pb-tag">Gap {{ row.gap }}/{{ row.gap_md }}/{{ row.gap_lg }}</span>
        <span v-if="row.py_top !== '3' || row.py_top_md !== '3' || row.py_top_lg !== '3'" class="pb-tag">↑ {{ row.py_top }}/{{ row.py_top_md }}/{{ row.py_top_lg }}</span>
        <span v-if="row.py_bottom !== '3' || row.py_bottom_md !== '3' || row.py_bottom_lg !== '3'" class="pb-tag">↓ {{ row.py_bottom }}/{{ row.py_bottom_md }}/{{ row.py_bottom_lg }}</span>
        <span v-if="row.mobile_reverse" class="pb-tag"><i class="rex-icon fa fa-mobile"></i> Mobil umkehren</span>
        <span v-if="row.text_align" class="pb-tag">{{ row.text_align }}</span>
      </div>

      <!-- Cells -->
      <div class="pb-cells-grid" :style="{ gap: (parseInt(row.gap) * 4) + 'px' }">
        <template v-for="(cell, cIdx) in row.cells" :key="cell.id">
          <div
            class="pb-cell"
            :class="{
              'pb-cell-active':    panel.cell && panel.cell.id === cell.id,
              'pb-cell-filled':    cell.modules.length > 0,
              'pb-cell-drag-over': cellDrag.rowId === row.id && cellDrag.overIdx === cIdx
            }"
            :style="{ flex: cell.span }"
            draggable="true"
            @dragstart.stop="onCellDragStart($event, row, cIdx)"
            @dragover.stop="onCellDragOver($event, row, cIdx)"
            @dragend.stop="onCellDragEnd($event, row)"
            @click="openCellPanel(row, cell)"
          >
            <span class="pb-cell-drag-handle" title="Zelle verschieben" @mousedown.stop>⠿</span>
            <div v-if="cell.modules.length > 0" class="pb-cell-content">
              <div class="pb-cell-meta">
                <div class="pb-cell-info">{{ cell.span }}/12 · {{ cell.modules.length }} Modul(e)</div>
                <div v-if="cell.bg || cell.bg_image || cell.bg_video || cell.py_top !== '0' || cell.py_top_md !== '0' || cell.py_top_lg !== '0' || cell.py_bottom !== '0' || cell.py_bottom_md !== '0' || cell.py_bottom_lg !== '0' || cell.px !== '0' || cell.px_md !== '0' || cell.px_lg !== '0' || cell.align !== 'start' || cell.text_align || cell.rounded" class="pb-cell-tags">
                  <span v-if="cell.bg" class="pb-tag">{{ cell.bg }}</span>
                  <span v-if="cell.bg_image" class="pb-tag"><i class="rex-icon fa fa-image"></i> {{ cell.bg_image }}</span>
                  <span v-if="cell.bg_video" class="pb-tag"><i class="rex-icon fa fa-film"></i> {{ cell.bg_video }}</span>
                  <span v-if="cell.py_top !== '0' || cell.py_top_md !== '0' || cell.py_top_lg !== '0'" class="pb-tag">↑ {{ cell.py_top }}/{{ cell.py_top_md }}/{{ cell.py_top_lg }}</span>
                  <span v-if="cell.py_bottom !== '0' || cell.py_bottom_md !== '0' || cell.py_bottom_lg !== '0'" class="pb-tag">↓ {{ cell.py_bottom }}/{{ cell.py_bottom_md }}/{{ cell.py_bottom_lg }}</span>
                  <span v-if="cell.px !== '0' || cell.px_md !== '0' || cell.px_lg !== '0'" class="pb-tag">↔ {{ cell.px }}/{{ cell.px_md }}/{{ cell.px_lg }}</span>
                  <span v-if="cell.align !== 'start'" class="pb-tag">{{ cell.align === 'center' ? 'Mitte' : 'Unten' }}</span>
                  <span v-if="cell.text_align" class="pb-tag">{{ cell.text_align }}</span>
                  <span v-if="cell.rounded" class="pb-tag"><i class="rex-icon fa fa-circle-notch"></i></span>
                </div>
              </div>
              <!-- Preview HTML wenn vorhanden -->
              <div v-if="cell.preview" class="pb-cell-preview" :class="{ 'pb-cell-preview-expanded': row.expanded }" v-html="cell.preview" @click.stop="openCellPanel(row, cell)"></div>
              <!-- Fallback: Modul-Namen -->
              <template v-else>
                <div v-for="s in cell.modules" :key="s.id" class="pb-cell-module-name">
                  {{ modules.find(m => m.id === s.module_id)?.name || '—' }}
                </div>
              </template>
            </div>
            <div v-else class="pb-cell-empty">
              <span class="pb-cell-plus">＋</span>
              <span class="pb-cell-hint">Modul wählen</span>
            </div>
          </div>
          <!-- Resize Handle -->
          <div v-if="cIdx < row.cells.length - 1" class="pb-resize-handle"
            title="Breite anpassen"
            @mousedown.stop.prevent="onResizeStart($event, row, cIdx)"></div>
        </template>
      </div>
    </div>

    <div v-if="!rows.length" class="pb-empty">
      <div class="pb-empty-icon">⊞</div>
      <div>Noch keine Zeilen — klicke auf „+ Zeile hinzufügen"</div>
    </div>
  </div>

  <!-- Side Panel -->
  <transition name="pb-slide">
    <div v-if="panel.open" class="pb-panel">

      <div class="pb-panel-header">
        <span>{{ panel.tab === 'row' ? 'Zeilen-Einstellungen' : 'Zelle bearbeiten' }}</span>
        <button type="button" class="pb-panel-close" @click="closePanel">✕</button>
      </div>

      <!-- MODULE TAB (cell panel) -->
      <div v-if="panel.tab === 'module' && panel.cell" class="pb-panel-body">

        <!-- Inner Tabs -->
        <div class="pb-inner-tabs">
          <button type="button" class="pb-inner-tab" :class="{ active: panel.cellTab === 'content' }" @click="switchToContent()">Inhalt</button>
          <button type="button" class="pb-inner-tab" :class="{ active: panel.cellTab === 'settings' }" @click="collectFromDom(); panel.cellTab = 'settings'">Einstellungen</button>
        </div>

        <!-- CONTENT sub-tab -->
        <template v-if="panel.cellTab === 'content'">
          <!-- Module list -->
          <div class="pb-module-list">
            <div
              v-for="(slot, sIdx) in panel.cell.modules" :key="slot.id"
              class="pb-module-item"
              :class="{ active: panel.slotIdx === sIdx }"
              @click="selectSlot(sIdx)"
            >
              <span class="pb-module-item-name">
                {{ modules.find(m => m.id === slot.module_id)?.name || '— Modul wählen —' }}
              </span>
              <div class="pb-module-item-actions">
                <button type="button" class="pb-icon-btn" @click.stop="moveSlot(sIdx, -1)" :disabled="sIdx === 0" title="Nach oben">↑</button>
                <button type="button" class="pb-icon-btn" @click.stop="moveSlot(sIdx, 1)"  :disabled="sIdx === panel.cell.modules.length - 1" title="Nach unten">↓</button>
                <button type="button" class="pb-icon-btn danger" @click.stop="removeSlot(sIdx)" title="Entfernen">✕</button>
              </div>
            </div>
            <button type="button" class="btn btn-default" style="width:100%;margin-top:4px" @click="addSlot">＋ Modul hinzufügen</button>
          </div>

          <!-- Active slot editor -->
          <template v-if="panel.slotIdx !== null && panel.cell.modules[panel.slotIdx]">
            <div class="pb-panel-section">
              <label class="pb-label">Modul</label>
              <select class="form-control" v-model="panel.cell.modules[panel.slotIdx].module_id"
                @change="onModuleChange(panel.cell.modules[panel.slotIdx])">
                <option :value="null">— Modul wählen —</option>
                <option v-for="m in modules" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            <div class="pb-panel-form">
              <div v-if="panel.loading" class="pb-loading">
                <span class="pb-spinner"></span> Formular wird geladen…
              </div>
              <div v-else-if="!panel.cell.modules[panel.slotIdx].module_id" class="pb-form-hint">
                Bitte zuerst ein Modul auswählen.
              </div>
              <div :id="pbFormId"
                :style="{ display: (panel.loading || !panel.cell.modules[panel.slotIdx].module_id) ? 'none' : 'block' }">
              </div>
            </div>
          </template>

          <div v-else-if="panel.cell.modules.length === 0" class="pb-form-hint" style="padding:30px 16px;">
            Noch keine Module — klicke auf „＋ Modul hinzufügen".
          </div>
        </template>

        <!-- SETTINGS sub-tab -->
        <template v-if="panel.cellTab === 'settings'">
          <div class="pb-panel-section">
            <label class="pb-label">Hintergrundfarbe</label>
            <select class="form-control" v-model="panel.cell.bg">
              <option v-for="o in bgOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div class="pb-panel-section">
            <label class="pb-label">Hintergrundbild</label>
            <div class="rex-mediawidget">
              <input class="form-control" type="text" :id="'REX_MEDIA_pb-cell-img-'+panel.cell.id" :value="panel.cell.bg_image" @input="panel.cell.bg_image = $event.target.value" placeholder="Kein Bild">
              <a class="btn btn-popup" href="javascript:void(0)" @click.prevent="openMedia('pb-cell-img-'+panel.cell.id, v => panel.cell.bg_image = v)" title="Bild wählen"><i class="rex-icon rex-icon-open-mediapool"></i></a>
              <a v-if="panel.cell.bg_image" class="btn btn-default" href="javascript:void(0)" @click.prevent="panel.cell.bg_image = ''" title="Entfernen"><i class="rex-icon rex-icon-delete"></i></a>
            </div>
          </div>
          <div class="pb-panel-section">
            <label class="pb-label">Hintergrundvideo (.mp4)</label>
            <div class="rex-mediawidget">
              <input class="form-control" type="text" :id="'REX_MEDIA_pb-cell-vid-'+panel.cell.id" :value="panel.cell.bg_video" @input="panel.cell.bg_video = $event.target.value" placeholder="Kein Video">
              <a class="btn btn-popup" href="javascript:void(0)" @click.prevent="openMedia('pb-cell-vid-'+panel.cell.id, v => panel.cell.bg_video = v, 'mp4')" title="Video wählen"><i class="rex-icon rex-icon-open-mediapool"></i></a>
              <a v-if="panel.cell.bg_video" class="btn btn-default" href="javascript:void(0)" @click.prevent="panel.cell.bg_video = ''" title="Entfernen"><i class="rex-icon rex-icon-delete"></i></a>
            </div>
          </div>
          <div class="pb-panel-section pb-resp-group">
            <label class="pb-label pb-resp-label">Abstand oben</label>
            <div class="pb-resp-cols">
              <div class="pb-resp-col pb-bp-mob"><span class="pb-resp-col-hd">Smartphone</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.py_top"><span class="pb-range-val">{{ panel.cell.py_top }}</span></div></div>
              <div class="pb-resp-col pb-bp-md"><span class="pb-resp-col-hd">Tablet</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.py_top_md"><span class="pb-range-val">{{ panel.cell.py_top_md }}</span></div></div>
              <div class="pb-resp-col pb-bp-lg"><span class="pb-resp-col-hd">Desktop</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.py_top_lg"><span class="pb-range-val">{{ panel.cell.py_top_lg }}</span></div></div>
            </div>
          </div>
          <div class="pb-panel-section pb-resp-group">
            <label class="pb-label pb-resp-label">Abstand unten</label>
            <div class="pb-resp-cols">
              <div class="pb-resp-col pb-bp-mob"><span class="pb-resp-col-hd">Smartphone</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.py_bottom"><span class="pb-range-val">{{ panel.cell.py_bottom }}</span></div></div>
              <div class="pb-resp-col pb-bp-md"><span class="pb-resp-col-hd">Tablet</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.py_bottom_md"><span class="pb-range-val">{{ panel.cell.py_bottom_md }}</span></div></div>
              <div class="pb-resp-col pb-bp-lg"><span class="pb-resp-col-hd">Desktop</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.py_bottom_lg"><span class="pb-range-val">{{ panel.cell.py_bottom_lg }}</span></div></div>
            </div>
          </div>
          <div class="pb-panel-section pb-resp-group">
            <label class="pb-label pb-resp-label">Innen links/rechts</label>
            <div class="pb-resp-cols">
              <div class="pb-resp-col pb-bp-mob"><span class="pb-resp-col-hd">Smartphone</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.px"><span class="pb-range-val">{{ panel.cell.px }}</span></div></div>
              <div class="pb-resp-col pb-bp-md"><span class="pb-resp-col-hd">Tablet</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.px_md"><span class="pb-range-val">{{ panel.cell.px_md }}</span></div></div>
              <div class="pb-resp-col pb-bp-lg"><span class="pb-resp-col-hd">Desktop</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.cell.px_lg"><span class="pb-range-val">{{ panel.cell.px_lg }}</span></div></div>
            </div>
          </div>
          <div class="pb-panel-section">
            <label class="pb-label">Textausrichtung</label>
            <select class="form-control" v-model="panel.cell.text_align">
              <option v-for="o in textAlignOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div class="pb-panel-section">
            <label class="pb-label">Ausrichtung (vertikal)</label>
            <select class="form-control" v-model="panel.cell.align">
              <option value="start">Oben</option>
              <option value="center">Mitte</option>
              <option value="end">Unten</option>
            </select>
          </div>
          <div class="pb-panel-section pb-panel-section-row">
            <label class="pb-label">Abgerundete Ecken</label>
            <input type="checkbox" v-model="panel.cell.rounded" style="width:18px;height:18px;cursor:pointer;">
          </div>
        </template>

        <div class="pb-panel-footer">
          <button type="button" class="btn btn-save" style="width:100%" @click="applyAndClose">
            {{ panel.saved ? '✓ Übernommen' : 'Übernehmen & Schließen' }}
          </button>
        </div>
      </div>

      <!-- ROW TAB -->
      <div v-if="panel.tab === 'row' && panel.row" class="pb-panel-body">

        <div class="pb-panel-group-label">Breite &amp; Abstände</div>
        <div class="pb-panel-section">
          <label class="pb-label">Container</label>
          <select class="form-control" v-model="panel.row.container">
            <option v-for="o in containerOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="pb-panel-section">
          <label class="pb-label">Breite des Inhalts</label>
          <select class="form-control" v-model="panel.row.content_width">
            <option v-for="o in contentWidthOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="pb-panel-section pb-resp-group">
          <label class="pb-label pb-resp-label">Abstand oben</label>
          <div class="pb-resp-cols">
            <div class="pb-resp-col pb-bp-mob"><span class="pb-resp-col-hd">Smartphone</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.py_top"><span class="pb-range-val">{{ panel.row.py_top }}</span></div></div>
            <div class="pb-resp-col pb-bp-md"><span class="pb-resp-col-hd">Tablet</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.py_top_md"><span class="pb-range-val">{{ panel.row.py_top_md }}</span></div></div>
            <div class="pb-resp-col pb-bp-lg"><span class="pb-resp-col-hd">Desktop</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.py_top_lg"><span class="pb-range-val">{{ panel.row.py_top_lg }}</span></div></div>
          </div>
        </div>
        <div class="pb-panel-section pb-resp-group">
          <label class="pb-label pb-resp-label">Abstand unten</label>
          <div class="pb-resp-cols">
            <div class="pb-resp-col pb-bp-mob"><span class="pb-resp-col-hd">Smartphone</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.py_bottom"><span class="pb-range-val">{{ panel.row.py_bottom }}</span></div></div>
            <div class="pb-resp-col pb-bp-md"><span class="pb-resp-col-hd">Tablet</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.py_bottom_md"><span class="pb-range-val">{{ panel.row.py_bottom_md }}</span></div></div>
            <div class="pb-resp-col pb-bp-lg"><span class="pb-resp-col-hd">Desktop</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.py_bottom_lg"><span class="pb-range-val">{{ panel.row.py_bottom_lg }}</span></div></div>
          </div>
        </div>
        <div class="pb-panel-section pb-resp-group">
          <label class="pb-label pb-resp-label">Spalten-Gap</label>
          <div class="pb-resp-cols">
            <div class="pb-resp-col pb-bp-mob"><span class="pb-resp-col-hd">Smartphone</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.gap"><span class="pb-range-val">{{ panel.row.gap }}</span></div></div>
            <div class="pb-resp-col pb-bp-md"><span class="pb-resp-col-hd">Tablet</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.gap_md"><span class="pb-range-val">{{ panel.row.gap_md }}</span></div></div>
            <div class="pb-resp-col pb-bp-lg"><span class="pb-resp-col-hd">Desktop</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="panel.row.gap_lg"><span class="pb-range-val">{{ panel.row.gap_lg }}</span></div></div>
          </div>
        </div>

        <div class="pb-panel-group-label">Hintergrund</div>
        <div class="pb-panel-section">
          <label class="pb-label">Hintergrundfarbe</label>
          <select class="form-control" v-model="panel.row.bg">
            <option v-for="o in bgOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="pb-panel-section">
          <label class="pb-label">Hintergrundbild</label>
          <div class="rex-mediawidget">
            <input class="form-control" type="text" :id="'REX_MEDIA_pb-row-img-'+panel.row.id" :value="panel.row.bg_image" @input="panel.row.bg_image = $event.target.value" placeholder="Kein Bild">
            <a class="btn btn-popup" href="javascript:void(0)" @click.prevent="openMedia('pb-row-img-'+panel.row.id, v => panel.row.bg_image = v)" title="Bild wählen"><i class="rex-icon rex-icon-open-mediapool"></i></a>
            <a v-if="panel.row.bg_image" class="btn btn-default" href="javascript:void(0)" @click.prevent="panel.row.bg_image = ''" title="Entfernen"><i class="rex-icon rex-icon-delete"></i></a>
          </div>
        </div>
        <div class="pb-panel-section">
          <label class="pb-label">Hintergrundvideo (.mp4)</label>
          <div class="rex-mediawidget">
            <input class="form-control" type="text" :id="'REX_MEDIA_pb-row-vid-'+panel.row.id" :value="panel.row.bg_video" @input="panel.row.bg_video = $event.target.value" placeholder="Kein Video">
            <a class="btn btn-popup" href="javascript:void(0)" @click.prevent="openMedia('pb-row-vid-'+panel.row.id, v => panel.row.bg_video = v, 'mp4')" title="Video wählen"><i class="rex-icon rex-icon-open-mediapool"></i></a>
            <a v-if="panel.row.bg_video" class="btn btn-default" href="javascript:void(0)" @click.prevent="panel.row.bg_video = ''" title="Entfernen"><i class="rex-icon rex-icon-delete"></i></a>
          </div>
        </div>

        <div class="pb-panel-group-label">Inhalt</div>
        <div class="pb-panel-section">
          <label class="pb-label">Textausrichtung</label>
          <select class="form-control" v-model="panel.row.text_align">
            <option v-for="o in textAlignOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="pb-panel-section">
          <label class="pb-label">Ausrichtung vertikal</label>
          <select class="form-control" v-model="panel.row.align_v">
            <option value="">Normal (Standard)</option>
            <option value="items-center">Zentriert</option>
            <option value="items-end">Unten</option>
          </select>
        </div>

        <div class="pb-panel-group-label">Grid</div>
        <div class="pb-panel-section pb-panel-section-row">
          <label class="pb-label" style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:10px;font-weight:500;" @click="panel.row.mobile_reverse = !panel.row.mobile_reverse">
            <span :style="'flex-shrink:0;width:40px;height:22px;border-radius:11px;transition:background .2s;background:' + (panel.row.mobile_reverse ? '#3b82f6' : '#374151') + ';position:relative;display:inline-block;'">
              <span :style="'position:absolute;top:3px;left:' + (panel.row.mobile_reverse ? '21px' : '3px') + ';width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;'"></span>
            </span>
            Mobil umkehren
          </label>
        </div>

        <div class="pb-panel-footer">
          <button type="button" class="btn btn-save" style="width:100%" @click="applyAndClose">
            {{ panel.saved ? '✓ Übernommen' : 'Übernehmen & Schließen' }}
          </button>
        </div>
      </div>

    </div>
  </transition>

  <div v-if="panel.open" class="pb-overlay" @click="applyAndClose"></div>
</div>
      `,
    }).mount('#' + mountId);

    nextTick(serialize);
  }
})();
