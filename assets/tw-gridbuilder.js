/**
 * Getaweb Pagebuilder – Vue 3 Grid-Builder
 */
(function () {
  'use strict';

  window.PB = window.PB || {};

  window.PB.init = function (config) {
    const { mountId, outputId, modules, initialData, ajaxUrl, csrfToken, csrfField } = config;
    loadVue().then((Vue) => startApp(Vue, { mountId, outputId, modules, initialData, ajaxUrl, csrfToken, csrfField }));
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
    // CKEditor 4 (ckeditor-Addon): Instanzen im alten Container zerstoeren,
    // sonst kollidieren beim Neu-Init die Instanznamen ("editor already exists").
    if (window.CKEDITOR && CKEDITOR.instances) {
      Object.keys(CKEDITOR.instances).forEach((name) => {
        const inst = CKEDITOR.instances[name];
        if (inst && inst.element && inst.element.$ && el.contains(inst.element.$)) {
          try { inst.destroy(true); } catch (e) {}
        }
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

  function startApp(Vue, { mountId, outputId, modules, initialData, ajaxUrl, csrfToken, csrfField }) {
    const { createApp, reactive, nextTick, computed, onMounted } = Vue;

    // POST-Helfer: Daten im Body statt in der URL (verhindert URL-Längenlimit bei
    // großen cell_data/values) und schickt das CSRF-Token unter dem von REDAXO
    // erwarteten Feldnamen mit.
    function apiPost(params) {
      const body = new URLSearchParams(params);
      body.set(csrfField || '_csrf_token', csrfToken);
      return fetch(ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: body.toString(),
      }).then((r) => r.json());
    }

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
        mt: '0', mt_md: '0', mt_lg: '0',
        mb: '0', mb_md: '0', mb_lg: '0',
        mx: '0', mx_md: '0', mx_lg: '0',
        align: 'start', text_align: '', preview: '',
        radius_tl: '0', radius_tr: '0', radius_bl: '0', radius_br: '0',
        shadow_hover: false, custom_class: '',
        anim: '', anim_delay: '', anim_duration: '',
        link: '', link_label: '',
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
        mt: '0', mt_md: '0', mt_lg: '0',
        mb: '0', mb_md: '0', mb_lg: '0',
        mx: '0', mx_md: '0', mx_lg: '0',
        bg: '', bg_image: '', bg_video: '',
        mobile_reverse: false, text_align: '', align_v: '',
        radius_tl: '0', radius_tr: '0', radius_bl: '0', radius_br: '0',
        shadow_hover: false, custom_class: '',
        anim: '', anim_delay: '', anim_duration: '',
        link: '', link_label: '',
        expanded: false,
      };
    }

    // Border-Radius-Migration: neue Felder radius_tl/tr/bl/br (Index-String '0'..'7').
    // Rückwärtskompatibilität: altes boolean-Feld 'rounded' → alle Ecken 'lg' (Index '3').
    function migrateRadius(o, corner) {
      const v = o['radius_' + corner];
      if (v !== undefined && v !== null && v !== '') return String(v);
      return o.rounded ? '4' : '0';
    }

    // Freitextfeld „Eigene CSS-Klasse": nur erlaubte Zeichen (Buchstaben, Ziffern,
    // Leerzeichen, - _ :) durchlassen. Verhindert Markup-/Attribut-Injection,
    // da der Wert später direkt als class="..." ausgegeben wird.
    function sanitizeClass(v) {
      return String(v || '').replace(/[^a-zA-Z0-9\s\-_:]/g, '');
    }

    function migrateCell(c) {
      const base_pt = c.py_top    || '0';
      const base_pb = c.py_bottom || '0';
      const base_px = c.px        || '0';
      const base_mt = c.mt || '0';
      const base_mb = c.mb || '0';
      const base_mx = c.mx || '0';
      const cell = {
        id: c.id || uid(), span: c.span || 12, modules: [],
        bg: c.bg || '', bg_image: c.bg_image || '', bg_video: c.bg_video || '',
        py_top:    base_pt, py_top_md:    c.py_top_md    || base_pt, py_top_lg:    c.py_top_lg    || c.py_top_md    || base_pt,
        py_bottom: base_pb, py_bottom_md: c.py_bottom_md || base_pb, py_bottom_lg: c.py_bottom_lg || c.py_bottom_md || base_pb,
        px:        base_px, px_md:        c.px_md        || base_px, px_lg:        c.px_lg        || c.px_md        || base_px,
        mt:        base_mt, mt_md:        c.mt_md        || base_mt, mt_lg:        c.mt_lg        || c.mt_md        || base_mt,
        mb:        base_mb, mb_md:        c.mb_md        || base_mb, mb_lg:        c.mb_lg        || c.mb_md        || base_mb,
        mx:        base_mx, mx_md:        c.mx_md        || base_mx, mx_lg:        c.mx_lg        || c.mx_md        || base_mx,
        align: c.align || 'start', text_align: c.text_align || '',
        radius_tl: migrateRadius(c, 'tl'), radius_tr: migrateRadius(c, 'tr'),
        radius_bl: migrateRadius(c, 'bl'), radius_br: migrateRadius(c, 'br'),
        shadow_hover: c.shadow_hover || false, custom_class: c.custom_class || '',
        anim: c.anim || '', anim_delay: c.anim_delay || '', anim_duration: c.anim_duration || '',
        link: c.link || '', link_label: c.link_label || '',
        preview: '',
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
        mt: r.mt || '0', mt_md: r.mt_md || r.mt || '0', mt_lg: r.mt_lg || r.mt_md || r.mt || '0',
        mb: r.mb || '0', mb_md: r.mb_md || r.mb || '0', mb_lg: r.mb_lg || r.mb_md || r.mb || '0',
        mx: r.mx || '0', mx_md: r.mx_md || r.mx || '0', mx_lg: r.mx_lg || r.mx_md || r.mx || '0',
        align_v: r.align_v || '',
        radius_tl: migrateRadius(r, 'tl'), radius_tr: migrateRadius(r, 'tr'),
        radius_bl: migrateRadius(r, 'bl'), radius_br: migrateRadius(r, 'br'),
        shadow_hover: r.shadow_hover || false, custom_class: r.custom_class || '',
        anim: r.anim || '', anim_delay: r.anim_delay || '', anim_duration: r.anim_duration || '',
        link: r.link || '', link_label: r.link_label || '',
        cells: (r.cells || []).map(migrateCell),
      };
    }

    const rows = reactive(
      (initialData.rows || []).map(migrateRow)
    );

    // ── Zwischenablage für Zeilen (instanz-/artikelübergreifend) ───────────────
    // Eigener, versionierter localStorage-Key → keine Kollision mit anderen Addons.
    const CLIP_KEY = 'twgb_clipboard_row_v1';
    const clip = reactive({ hasRow: false, hasCell: false });
    try { clip.hasRow = !!localStorage.getItem(CLIP_KEY); } catch (e) { /* localStorage evtl. gesperrt */ }

    // ── Toast-Benachrichtigung ─────────────────────────────────────────────────
    const toast = reactive({ msg: '', show: false });
    let toastTimer = null;
    function showToast(msg) {
      toast.msg = msg;
      toast.show = true;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.show = false; }, 1800);
    }

    // Tiefe Kopie einer Zeile ohne flüchtige Felder (preview/expanded)
    function cloneRowData(row) {
      const r = JSON.parse(JSON.stringify(row));
      delete r.expanded;
      (r.cells || []).forEach((c) => { delete c.preview; });
      return r;
    }
    // Frische IDs für Zeile + Zellen + Module (verhindert ID-Kollisionen)
    function regenRowIds(row) {
      row.id = uid();
      row.expanded = false;
      (row.cells || []).forEach((c) => {
        c.id = uid();
        c.preview = '';
        (c.modules || []).forEach((m) => { m.id = uid(); });
      });
      return row;
    }
    function refreshRowPreviews(row) {
      nextTick(() => row.cells.forEach((c) => { if (c.modules.length) refreshCellPreview(c); }));
    }

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

    // Interner Link über die REDAXO-Struktur (Linkmap-Popup).
    // Beim Auswählen feuert das Popup 'rex:selectLink' mit (event, id, name).
    // setId  → speichert die Artikel-ID, setName → speichert den Artikelnamen (Anzeige).
    //
    // Wichtig zum Schließen des Popups: Die Linkmap setzt normalerweise
    // getElementById('REX_LINK_<id>').value und ruft dann self.close(). Da wir
    // kein solches DOM-Feld haben (Werte kommen aus dem Event), würde das
    // getElementById an null scheitern und self.close() nie erreichen → Fenster
    // bliebe offen. REDAXO bietet dafür den offiziellen Hook: rufen wir
    // event.preventDefault() auf, überspringt der Core Feld-Setzen UND close,
    // also schließen wir das Popup selbst.
    function openLink(pbId, setId, setName) {
      if (typeof openLinkMap !== 'function') return;
      const linkWin = openLinkMap('REX_LINK_' + pbId, '');
      if (window.jQuery && linkWin) {
        jQuery(linkWin).off('rex:selectLink.pb').on('rex:selectLink.pb', function (e, linkurl, linktext) {
          e.preventDefault(); // wir übernehmen Feld-Setzen und Schließen selbst
          setId(String(linkurl || ''));
          setName(String(linktext || ''));
          setTimeout(function () { try { linkWin.close(); } catch (err) { /* Fenster evtl. schon zu */ } }, 0);
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

    // Zeile direkt unterhalb duplizieren (inkl. aller Zellen/Module, mit neuen IDs)
    function duplicateRow(idx) {
      collectFromDom();
      const clone = regenRowIds(cloneRowData(rows[idx]));
      rows.splice(idx + 1, 0, clone);
      refreshRowPreviews(clone);
    }
    // Zeile in die Zwischenablage kopieren (auch für andere Instanzen/Artikel)
    function copyRow(idx) {
      collectFromDom();
      try {
        localStorage.setItem(CLIP_KEY, JSON.stringify(cloneRowData(rows[idx])));
        clip.hasRow = true;
        showToast('Zeile kopiert');
      } catch (e) { /* ignore */ }
    }
    // Kopierte Zeile unterhalb der angegebenen Zeile einfügen
    function pasteRow(idx) {
      let raw = null;
      try { raw = localStorage.getItem(CLIP_KEY); } catch (e) { /* ignore */ }
      if (!raw) return;
      let data = null;
      try { data = JSON.parse(raw); } catch (e) { return; }
      if (!data || !Array.isArray(data.cells)) return;
      const row = regenRowIds(migrateRow(data));
      rows.splice(idx + 1, 0, row);
      refreshRowPreviews(row);
    }

    // ── Zellen: duplizieren / kopieren / einfügen ──────────────────────────────
    const CLIP_CELL_KEY = 'twgb_clipboard_cell_v1';
    try { clip.hasCell = !!localStorage.getItem(CLIP_CELL_KEY); } catch (e) { /* ignore */ }

    function cloneCellData(cell) {
      const c = JSON.parse(JSON.stringify(cell));
      delete c.preview;
      return c;
    }
    function regenCellIds(cell) {
      cell.id = uid();
      cell.preview = '';
      (cell.modules || []).forEach((m) => { m.id = uid(); });
      return cell;
    }
    // Aktuell im Panel bearbeitete Zelle in ihrer Zeile duplizieren (als neue Spalte)
    function duplicateCell() {
      if (!panel.row || !panel.cell) return;
      collectFromDom();
      const row   = panel.row;
      const idx   = row.cells.indexOf(panel.cell);
      const clone = regenCellIds(cloneCellData(panel.cell));
      row.cells.splice(idx + 1, 0, clone);
      row.cols = row.cells.length;
      refreshRowPreviews(row);
    }
    function copyCell() {
      if (!panel.cell) return;
      collectFromDom();
      try {
        localStorage.setItem(CLIP_CELL_KEY, JSON.stringify(cloneCellData(panel.cell)));
        clip.hasCell = true;
        showToast('Zelle kopiert');
      } catch (e) { /* ignore */ }
    }
    // Kopierte Zelle als neue Spalte in die aktuelle Zeile einfügen
    function pasteCell() {
      if (!panel.row) return;
      let raw = null;
      try { raw = localStorage.getItem(CLIP_CELL_KEY); } catch (e) { /* ignore */ }
      if (!raw) return;
      let data = null;
      try { data = JSON.parse(raw); } catch (e) { return; }
      if (!data) return;
      const row  = panel.row;
      const idx  = panel.cell ? row.cells.indexOf(panel.cell) : row.cells.length - 1;
      const cell = regenCellIds(migrateCell(data));
      row.cells.splice(idx + 1, 0, cell);
      row.cols = row.cells.length;
      refreshRowPreviews(row);
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
      apiPost({ twgb_preview: '1', cell_data: JSON.stringify(cell) })
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

    // Modul innerhalb der Zelle duplizieren (inkl. aller Werte, mit neuer ID)
    function duplicateSlot(idx) {
      collectFromDom();
      const src  = panel.cell.modules[idx];
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = uid();
      panel.cell.modules.splice(idx + 1, 0, copy);
      panel.slotIdx = idx + 1;
      clearFormHtml(mountId);
      const slot = activeSlot();
      if (slot && slot.module_id) loadModuleForm(panel.cell, slot);
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

      apiPost({
        module_id: slot.module_id,
        cell_id:   ns,
        values:    JSON.stringify(slot.values || {}),
      })
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
    function syncEditorsToTextareas(container) {
      if (!container) return;
      // cke5-Addon: cke5_destroy synct Inhalt in die Textarea (und zerstoert die Instanz)
      if (typeof window.cke5_destroy === 'function') {
        container.querySelectorAll('.cke5-editor[data-cke5-init-state="ready"]').forEach((el) => {
          window.cke5_destroy(window.jQuery ? window.jQuery(el) : el);
        });
      }
      // ckeditor-Addon (CKEditor 4): haelt Inhalt in eigener Instanz, schreibt ihn nur bei
      // updateElement() in die Textarea zurueck - sonst liest collectFromDom eine leere Textarea.
      if (window.CKEDITOR && CKEDITOR.instances) {
        Object.keys(CKEDITOR.instances).forEach((name) => {
          const inst = CKEDITOR.instances[name];
          if (inst && inst.element && inst.element.$ && container.contains(inst.element.$)) {
            try { inst.updateElement(); } catch (e) {}
          }
        });
      }
    }

    function collectFromDom() {
      const slot = activeSlot();
      if (!slot || !slot.module_id || !panel.cell) return;
      const container = document.getElementById(FORM_CONTAINER_ID(mountId));
      if (!container) return;
      syncEditorsToTextareas(container);

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
          mt: r.mt, mt_md: r.mt_md, mt_lg: r.mt_lg,
          mb: r.mb, mb_md: r.mb_md, mb_lg: r.mb_lg,
          mx: r.mx, mx_md: r.mx_md, mx_lg: r.mx_lg,
          bg: r.bg, bg_image: r.bg_image, bg_video: r.bg_video,
          mobile_reverse: r.mobile_reverse, text_align: r.text_align, align_v: r.align_v || '',
          radius_tl: r.radius_tl, radius_tr: r.radius_tr, radius_bl: r.radius_bl, radius_br: r.radius_br,
          shadow_hover: r.shadow_hover, custom_class: r.custom_class || '',
          anim: r.anim || '', anim_delay: r.anim_delay || '', anim_duration: r.anim_duration || '',
          link: r.link || '', link_label: r.link_label || '',
          cells: r.cells.map((c) => ({
            id: c.id, span: c.span,
            bg: c.bg, bg_image: c.bg_image, bg_video: c.bg_video,
            py_top: c.py_top, py_top_md: c.py_top_md, py_top_lg: c.py_top_lg,
            py_bottom: c.py_bottom, py_bottom_md: c.py_bottom_md, py_bottom_lg: c.py_bottom_lg,
            px: c.px, px_md: c.px_md, px_lg: c.px_lg,
            mt: c.mt, mt_md: c.mt_md, mt_lg: c.mt_lg,
            mb: c.mb, mb_md: c.mb_md, mb_lg: c.mb_lg,
            mx: c.mx, mx_md: c.mx_md, mx_lg: c.mx_lg,
            align: c.align, text_align: c.text_align,
            radius_tl: c.radius_tl, radius_tr: c.radius_tr, radius_bl: c.radius_bl, radius_br: c.radius_br,
            shadow_hover: c.shadow_hover, custom_class: c.custom_class || '',
            anim: c.anim || '', anim_delay: c.anim_delay || '', anim_duration: c.anim_duration || '',
            link: c.link || '', link_label: c.link_label || '',
            modules: c.modules.map((s) => ({ id: s.id, module_id: s.module_id, values: s.values || {} })),
          })),
        })),
      };
      const out = document.getElementById(outputId);
      if (out) out.value = JSON.stringify(data);
    }

    const form = document.getElementById(outputId)?.closest('form');
    if (form) form.addEventListener('submit', serialize);

    // ── Border-Radius-Steuerung (wiederverwendbar für Zelle & Zeile) ──────────
    // t = Ausdruck des Ziel-Objekts im Template, z.B. 'panel.cell' oder 'panel.row'.
    const RADIUS_UI = (t) => `
      <div class="pb-panel-section">
        <label class="pb-label">Abgerundete Ecken</label>
        <div class="pb-radius">
          <div class="pb-radius-all">
            <span class="pb-radius-all-lbl">Alle Ecken</span>
            <input type="range" min="0" max="9" step="1" class="pb-range"
                   :value="radiusAll(${t}) === '' ? 0 : radiusAll(${t})"
                   @input="setAllRadius(${t}, $event.target.value)">
            <span class="pb-range-val">{{ radiusAll(${t}) === '' ? '—' : radiusLabel(radiusAll(${t})) }}</span>
          </div>
          <div class="pb-radius-grid">
            <div class="pb-radius-corner">
              <span class="pb-radius-corner-lbl">↖ Oben links</span>
              <div class="pb-resp-col-row"><input type="range" min="0" max="9" step="1" class="pb-range" v-model="${t}.radius_tl"><span class="pb-range-val">{{ radiusLabel(${t}.radius_tl) }}</span></div>
            </div>
            <div class="pb-radius-corner">
              <span class="pb-radius-corner-lbl">Oben rechts ↗</span>
              <div class="pb-resp-col-row"><input type="range" min="0" max="9" step="1" class="pb-range" v-model="${t}.radius_tr"><span class="pb-range-val">{{ radiusLabel(${t}.radius_tr) }}</span></div>
            </div>
            <div class="pb-radius-corner">
              <span class="pb-radius-corner-lbl">↙ Unten links</span>
              <div class="pb-resp-col-row"><input type="range" min="0" max="9" step="1" class="pb-range" v-model="${t}.radius_bl"><span class="pb-range-val">{{ radiusLabel(${t}.radius_bl) }}</span></div>
            </div>
            <div class="pb-radius-corner">
              <span class="pb-radius-corner-lbl">Unten rechts ↘</span>
              <div class="pb-resp-col-row"><input type="range" min="0" max="9" step="1" class="pb-range" v-model="${t}.radius_br"><span class="pb-range-val">{{ radiusLabel(${t}.radius_br) }}</span></div>
            </div>
          </div>
        </div>
      </div>`;

    // ── Toggle-Schalter (wie „Mobil umkehren") ────────────────────────────────
    const TOGGLE = (expr, label) => `
      <label class="pb-toggle" @click="${expr} = !${expr}">
        <span class="pb-toggle-track" :class="{ on: ${expr} }"><span class="pb-toggle-knob" :class="{ on: ${expr} }"></span></span>
        <span>${label}</span>
      </label>`;

    // ── Hintergrund-Felder (Farbe / Bild / Video nebeneinander) ───────────────
    const BG_FIELDS = (t, idp) => `
      <div class="pb-panel-grid cols-3">
        <div class="pb-field">
          <label class="pb-label">Farbe</label>
          <select class="form-control" v-model="${t}.bg">
            <option v-for="o in bgOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="pb-field">
          <label class="pb-label">Bild</label>
          <div class="rex-mediawidget">
            <input class="form-control" type="text" :id="'REX_MEDIA_${idp}-img-'+${t}.id" :value="${t}.bg_image" @input="${t}.bg_image = $event.target.value" placeholder="Kein Bild">
            <a class="btn btn-popup" href="javascript:void(0)" @click.prevent="openMedia('${idp}-img-'+${t}.id, v => ${t}.bg_image = v)" title="Bild wählen"><i class="rex-icon rex-icon-open-mediapool"></i></a>
            <a v-if="${t}.bg_image" class="btn btn-default" href="javascript:void(0)" @click.prevent="${t}.bg_image = ''" title="Entfernen"><i class="rex-icon rex-icon-delete"></i></a>
          </div>
        </div>
        <div class="pb-field">
          <label class="pb-label">Video (.mp4)</label>
          <div class="rex-mediawidget">
            <input class="form-control" type="text" :id="'REX_MEDIA_${idp}-vid-'+${t}.id" :value="${t}.bg_video" @input="${t}.bg_video = $event.target.value" placeholder="Kein Video">
            <a class="btn btn-popup" href="javascript:void(0)" @click.prevent="openMedia('${idp}-vid-'+${t}.id, v => ${t}.bg_video = v, 'mp4')" title="Video wählen"><i class="rex-icon rex-icon-open-mediapool"></i></a>
            <a v-if="${t}.bg_video" class="btn btn-default" href="javascript:void(0)" @click.prevent="${t}.bg_video = ''" title="Entfernen"><i class="rex-icon rex-icon-delete"></i></a>
          </div>
        </div>
      </div>`;

    // ── Erweitert: Schatten bei Hover + eigene CSS-Klasse ─────────────────────
    const ADVANCED = (t) => `
      <div class="pb-panel-grid cols-2 pb-grid-mid">
        <div class="pb-field">
          <label class="pb-label">Effekt</label>
          ${TOGGLE(t + '.shadow_hover', 'Schatten bei Hover')}
        </div>
        <div class="pb-field">
          <label class="pb-label">Eigene CSS-Klasse</label>
          <input type="text" class="form-control" v-model="${t}.custom_class" @input="${t}.custom_class = sanitizeClass($event.target.value)" placeholder="z.B. my-highlight shadow-2xl">
          <small class="pb-hint">Mehrere Klassen mit Leerzeichen. Müssen im Projekt-CSS existieren.</small>
        </div>
      </div>`;

    // ── Responsive 3-Breakpoint-Regler (Smartphone/Tablet/Desktop) ────────────
    // t = Zielobjekt, key = Basis-Feldname (Felder: key, key_md, key_lg), label = Überschrift.
    // Wiederverwendbar für Innen- und Außen-Abstände.
    const RESP_RANGE = (t, key, label) => `
      <div class="pb-panel-section pb-resp-group">
        <label class="pb-label pb-resp-label">${label}</label>
        <div class="pb-resp-cols">
          <div class="pb-resp-col pb-bp-mob"><span class="pb-resp-col-hd">Smartphone</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="${t}.${key}"><span class="pb-range-val">{{ ${t}.${key} }}</span></div></div>
          <div class="pb-resp-col pb-bp-md"><span class="pb-resp-col-hd">Tablet</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="${t}.${key}_md"><span class="pb-range-val">{{ ${t}.${key}_md }}</span></div></div>
          <div class="pb-resp-col pb-bp-lg"><span class="pb-resp-col-hd">Desktop</span><div class="pb-resp-col-row"><input type="range" min="0" max="16" class="pb-range" v-model="${t}.${key}_lg"><span class="pb-range-val">{{ ${t}.${key}_lg }}</span></div></div>
        </div>
      </div>`;

    // ── Verlinkung: ganze Zeile/Zelle als interner Link (REDAXO-Struktur) ─────
    // t = Zielobjekt, idp = ID-Präfix, label = „Zeile"/„Zelle" für die Texte.
    // Speichert Artikel-ID in .link und den Namen in .link_label (nur Anzeige).
    const LINK_FIELD = (t, idp, label) => `
      <div class="pb-panel-section">
        <label class="pb-label">Ganze ${label} verlinken (interne Seite)</label>
        <div class="rex-mediawidget">
          <input class="form-control" type="text" readonly
                 :value="${t}.link_label || (${t}.link ? 'Artikel-ID ' + ${t}.link : '')"
                 placeholder="Keine Verlinkung">
          <a class="btn btn-popup" href="javascript:void(0)"
             @click.prevent="openLink('${idp}-link-'+${t}.id, id => ${t}.link = id, name => ${t}.link_label = name)"
             title="Seite wählen"><i class="rex-icon rex-icon-open-linkmap"></i></a>
          <a v-if="${t}.link" class="btn btn-default" href="javascript:void(0)"
             @click.prevent="${t}.link = ''; ${t}.link_label = ''"
             title="Verlinkung entfernen"><i class="rex-icon rex-icon-delete"></i></a>
        </div>
        <small class="pb-hint">Macht die komplette ${label} klickbar. <strong>Nur</strong> verwenden, wenn der Inhalt keine eigenen Links oder Buttons enthält (verschachtelte Links sind ungültiges HTML).</small>
      </div>`;

    // ── Animation (animate.css via Alpine x-intersect-class) ──────────────────
    // Art / Verzögerung / Dauer. Wird im Frontend beim Sichtbarwerden einmalig
    // ausgelöst. Voraussetzung: animate.css + alpinejs-intersect-class im Theme.
    // Die option-values sind die animate.css-Klassennamen (ohne animate__animated).
    const ANIM_UI = (t) => `
      <div class="pb-panel-grid cols-3 pb-grid-mid">
        <div class="pb-field">
          <label class="pb-label">Art der Animation</label>
          <select class="form-control" v-model="${t}.anim">
            <option value="">Keine Animation</option>
            <optgroup label="Einblenden (Fade)">
              <option value="animate__fadeIn">Fade In</option>
              <option value="animate__fadeInUp">Fade In ↑ (von unten)</option>
              <option value="animate__fadeInDown">Fade In ↓ (von oben)</option>
              <option value="animate__fadeInLeft">Fade In → (von links)</option>
              <option value="animate__fadeInRight">Fade In ← (von rechts)</option>
            </optgroup>
            <optgroup label="Zoom">
              <option value="animate__zoomIn">Zoom In</option>
              <option value="animate__zoomInLeft">Zoom In (von links)</option>
              <option value="animate__zoomInRight">Zoom In (von rechts)</option>
            </optgroup>
            <optgroup label="Schieben (Slide)">
              <option value="animate__slideInUp">Slide In ↑ (von unten)</option>
              <option value="animate__slideInDown">Slide In ↓ (von oben)</option>
              <option value="animate__slideInLeft">Slide In → (von links)</option>
              <option value="animate__slideInRight">Slide In ← (von rechts)</option>
            </optgroup>
            <optgroup label="Zurück (Back)">
              <option value="animate__backInLeft">Back In (von links)</option>
              <option value="animate__backInRight">Back In (von rechts)</option>
              <option value="animate__backInUp">Back In (von unten)</option>
              <option value="animate__backInDown">Back In (von oben)</option>
            </optgroup>
            <optgroup label="Drehen / Kippen (Flip)">
              <option value="animate__flipInX">Flip In X</option>
              <option value="animate__flipInY">Flip In Y</option>
              <option value="animate__rotateInUpLeft">Rotate In (unten links)</option>
              <option value="animate__rotateInUpRight">Rotate In (unten rechts)</option>
            </optgroup>
            <optgroup label="Aufmerksamkeit / Spezial">
              <option value="animate__pulse">Pulse</option>
              <option value="animate__bounceIn">Bounce In</option>
              <option value="animate__lightSpeedInLeft">Lightspeed (von links)</option>
              <option value="animate__lightSpeedInRight">Lightspeed (von rechts)</option>
              <option value="animate__jackInTheBox">Jack in the Box</option>
              <option value="animate__hinge">Hinge (abfallen)</option>
            </optgroup>
          </select>
        </div>
        <div class="pb-field">
          <label class="pb-label">Verzögerung</label>
          <select class="form-control" v-model="${t}.anim_delay" :disabled="!${t}.anim">
            <option value="">Keine</option>
            <option value="1">1 Sekunde</option>
            <option value="2">2 Sekunden</option>
            <option value="3">3 Sekunden</option>
            <option value="4">4 Sekunden</option>
            <option value="5">5 Sekunden</option>
          </select>
        </div>
        <div class="pb-field">
          <label class="pb-label">Dauer</label>
          <select class="form-control" v-model="${t}.anim_duration" :disabled="!${t}.anim">
            <option value="">Standard</option>
            <option value="animate__slower">Sehr langsam</option>
            <option value="animate__slow">Langsam</option>
            <option value="animate__fast">Schnell</option>
            <option value="animate__faster">Sehr schnell</option>
          </select>
        </div>
      </div>`;

    // ── Vue App ───────────────────────────────────────────────────────────────
    createApp({
      setup() {
        onMounted(() => {
          rows.forEach(r => r.cells.forEach(c => { if (c.modules.length) refreshCellPreview(c); }));
        });
        return {
          rows, panel, modules, rowDrag, cellDrag, clip, toast,
          pbFormId: FORM_CONTAINER_ID(mountId),
          activeSlot,
          addRow, removeRow, moveRow, setRowCols,
          duplicateRow, copyRow, pasteRow,
          duplicateCell, copyCell, pasteCell,
          openCellPanel, openRowPanel, closePanel, applyAndClose,
          addSlot, removeSlot, selectSlot, moveSlot, duplicateSlot, onModuleChange,
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
          openLink,
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
            { value: 'bg-secondary-500', label: 'Sekundärfarbe' },
            { value: 'bg-neutral-200',   label: 'Neutral 200' },
            { value: 'bg-neutral-100',   label: 'Neutral 100' },
            { value: 'bg-neutral-50',    label: 'Neutral 50' },
          ],
          textAlignOptions: [
            { value: '',            label: 'Standard (links)' },
            { value: 'text-center', label: 'Zentriert' },
            { value: 'text-right',  label: 'Rechts' },
          ],
          // Border-Radius (Tailwind v4): Index 0-9 → Label
          radiusScale: ['0', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'],
          radiusLabel: (idx) => (['0', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'])[+idx] || '0',
          hasRadius: (t) => [t.radius_tl, t.radius_tr, t.radius_bl, t.radius_br].some((v) => +v > 0),
          // Außen-Abstand gesetzt? (irgendeine Achse/Breakpoint != 0)
          hasMargin: (t) => ['mt','mt_md','mt_lg','mb','mb_md','mb_lg','mx','mx_md','mx_lg'].some((k) => (t[k] || '0') !== '0'),
          // Kurzlabel für Backend-Tags: „animate__fadeInUp" → „fadeInUp"
          animLabel: (v) => String(v || '').replace(/^animate__/, ''),
          sanitizeClass,
          // Gemeinsamer Regler: repräsentativer Wert (alle gleich → dieser Wert, sonst '')
          radiusAll: (t) => {
            const v = t.radius_tl;
            return (t.radius_tr === v && t.radius_bl === v && t.radius_br === v) ? v : '';
          },
          setAllRadius: (t, val) => {
            const v = String(val);
            t.radius_tl = v; t.radius_tr = v; t.radius_bl = v; t.radius_br = v;
          },
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
        <button type="button" class="pb-icon-btn" @click.stop="openRowPanel(row)" title="Zeilen-Einstellungen" aria-label="Zeilen-Einstellungen"><i class="rex-icon fa fa-cog"></i></button>
        <div class="pb-row-actions">
          <button type="button" class="pb-icon-btn" :class="{ active: row.expanded }" @click.stop="row.expanded = !row.expanded" title="Vorschau ein-/ausklappen" aria-label="Vorschau ein-/ausklappen"><i class="rex-icon fa fa-eye"></i></button>
          <button type="button" class="pb-icon-btn" @click.stop="duplicateRow(rIdx)" title="Zeile duplizieren" aria-label="Zeile duplizieren"><i class="rex-icon fa fa-clone"></i></button>
          <button type="button" class="pb-icon-btn" @click.stop="copyRow(rIdx)" title="Zeile kopieren (auch für andere Artikel)" aria-label="Zeile kopieren"><i class="rex-icon fa fa-copy"></i></button>
          <button type="button" class="pb-icon-btn" v-if="clip.hasRow" @click.stop="pasteRow(rIdx)" title="Kopierte Zeile hier einfügen" aria-label="Kopierte Zeile einfügen"><i class="rex-icon fa fa-clipboard"></i></button>
          <button type="button" class="pb-icon-btn" @click.stop="moveRow(rIdx, -1)" :disabled="rIdx === 0" title="Nach oben" aria-label="Zeile nach oben"><i class="rex-icon fa fa-arrow-up"></i></button>
          <button type="button" class="pb-icon-btn" @click.stop="moveRow(rIdx, 1)"  :disabled="rIdx === rows.length - 1" title="Nach unten" aria-label="Zeile nach unten"><i class="rex-icon fa fa-arrow-down"></i></button>
          <button type="button" class="pb-icon-btn danger" @click.stop="removeRow(rIdx)" title="Zeile löschen" aria-label="Zeile löschen"><i class="rex-icon fa fa-trash"></i></button>
        </div>
      </div>

      <!-- Row Meta -->
      <div class="pb-row-meta" v-if="row.bg || row.bg_image || row.bg_video || row.gap !== '4' || row.gap_md !== '4' || row.gap_lg !== '4' || row.container !== 'standard' || row.content_width !== 'standard' || row.py_top !== '3' || row.py_top_md !== '3' || row.py_top_lg !== '3' || row.py_bottom !== '3' || row.py_bottom_md !== '3' || row.py_bottom_lg !== '3' || row.mobile_reverse || row.text_align || row.align_v || hasRadius(row) || row.shadow_hover || row.custom_class || row.anim || row.link || hasMargin(row)">
        <span v-if="row.container !== 'standard'" class="pb-tag">{{ row.container }}</span>
        <span v-if="row.content_width !== 'standard'" class="pb-tag">Inhalt: {{ row.content_width }}</span>
        <span v-if="row.bg" class="pb-tag">{{ row.bg }}</span>
        <span v-if="row.bg_image" class="pb-tag"><i class="rex-icon fa fa-image"></i> {{ row.bg_image }}</span>
        <span v-if="row.bg_video" class="pb-tag"><i class="rex-icon fa fa-film"></i> {{ row.bg_video }}</span>
        <span v-if="row.gap !== '4' || row.gap_md !== '4' || row.gap_lg !== '4'" class="pb-tag">Gap {{ row.gap }}/{{ row.gap_md }}/{{ row.gap_lg }}</span>
        <span v-if="row.py_top !== '3' || row.py_top_md !== '3' || row.py_top_lg !== '3'" class="pb-tag">↑ {{ row.py_top }}/{{ row.py_top_md }}/{{ row.py_top_lg }}</span>
        <span v-if="row.py_bottom !== '3' || row.py_bottom_md !== '3' || row.py_bottom_lg !== '3'" class="pb-tag">↓ {{ row.py_bottom }}/{{ row.py_bottom_md }}/{{ row.py_bottom_lg }}</span>
        <span v-if="row.mt !== '0' || row.mt_md !== '0' || row.mt_lg !== '0'" class="pb-tag">M↑ {{ row.mt }}/{{ row.mt_md }}/{{ row.mt_lg }}</span>
        <span v-if="row.mb !== '0' || row.mb_md !== '0' || row.mb_lg !== '0'" class="pb-tag">M↓ {{ row.mb }}/{{ row.mb_md }}/{{ row.mb_lg }}</span>
        <span v-if="row.mx !== '0' || row.mx_md !== '0' || row.mx_lg !== '0'" class="pb-tag">M↔ {{ row.mx }}/{{ row.mx_md }}/{{ row.mx_lg }}</span>
        <span v-if="row.mobile_reverse" class="pb-tag"><i class="rex-icon fa fa-mobile"></i> Mobil umkehren</span>
        <span v-if="row.text_align" class="pb-tag">{{ row.text_align }}</span>
        <span v-if="hasRadius(row)" class="pb-tag"><i class="rex-icon fa fa-circle-notch"></i> Ecken</span>
        <span v-if="row.shadow_hover" class="pb-tag"><i class="rex-icon fa fa-square-o"></i> Hover-Schatten</span>
        <span v-if="row.custom_class" class="pb-tag">.{{ row.custom_class }}</span>
        <span v-if="row.anim" class="pb-tag"><i class="rex-icon fa fa-magic"></i> {{ animLabel(row.anim) }}</span>
        <span v-if="row.link" class="pb-tag"><i class="rex-icon fa fa-link"></i> {{ row.link_label || ('Artikel ' + row.link) }}</span>
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
                <div v-if="cell.bg || cell.bg_image || cell.bg_video || cell.py_top !== '0' || cell.py_top_md !== '0' || cell.py_top_lg !== '0' || cell.py_bottom !== '0' || cell.py_bottom_md !== '0' || cell.py_bottom_lg !== '0' || cell.px !== '0' || cell.px_md !== '0' || cell.px_lg !== '0' || cell.align !== 'start' || cell.text_align || hasRadius(cell) || cell.shadow_hover || cell.custom_class || cell.anim || cell.link || hasMargin(cell)" class="pb-cell-tags">
                  <span v-if="cell.bg" class="pb-tag">{{ cell.bg }}</span>
                  <span v-if="cell.bg_image" class="pb-tag"><i class="rex-icon fa fa-image"></i> {{ cell.bg_image }}</span>
                  <span v-if="cell.bg_video" class="pb-tag"><i class="rex-icon fa fa-film"></i> {{ cell.bg_video }}</span>
                  <span v-if="cell.py_top !== '0' || cell.py_top_md !== '0' || cell.py_top_lg !== '0'" class="pb-tag">↑ {{ cell.py_top }}/{{ cell.py_top_md }}/{{ cell.py_top_lg }}</span>
                  <span v-if="cell.py_bottom !== '0' || cell.py_bottom_md !== '0' || cell.py_bottom_lg !== '0'" class="pb-tag">↓ {{ cell.py_bottom }}/{{ cell.py_bottom_md }}/{{ cell.py_bottom_lg }}</span>
                  <span v-if="cell.px !== '0' || cell.px_md !== '0' || cell.px_lg !== '0'" class="pb-tag">↔ {{ cell.px }}/{{ cell.px_md }}/{{ cell.px_lg }}</span>
                  <span v-if="cell.mt !== '0' || cell.mt_md !== '0' || cell.mt_lg !== '0'" class="pb-tag">M↑ {{ cell.mt }}/{{ cell.mt_md }}/{{ cell.mt_lg }}</span>
                  <span v-if="cell.mb !== '0' || cell.mb_md !== '0' || cell.mb_lg !== '0'" class="pb-tag">M↓ {{ cell.mb }}/{{ cell.mb_md }}/{{ cell.mb_lg }}</span>
                  <span v-if="cell.mx !== '0' || cell.mx_md !== '0' || cell.mx_lg !== '0'" class="pb-tag">M↔ {{ cell.mx }}/{{ cell.mx_md }}/{{ cell.mx_lg }}</span>
                  <span v-if="cell.align !== 'start'" class="pb-tag">{{ cell.align === 'center' ? 'Mitte' : 'Unten' }}</span>
                  <span v-if="cell.text_align" class="pb-tag">{{ cell.text_align }}</span>
                  <span v-if="hasRadius(cell)" class="pb-tag"><i class="rex-icon fa fa-circle-notch"></i></span>
                  <span v-if="cell.shadow_hover" class="pb-tag"><i class="rex-icon fa fa-square-o"></i></span>
                  <span v-if="cell.custom_class" class="pb-tag">.{{ cell.custom_class }}</span>
                  <span v-if="cell.anim" class="pb-tag"><i class="rex-icon fa fa-magic"></i> {{ animLabel(cell.anim) }}</span>
                  <span v-if="cell.link" class="pb-tag"><i class="rex-icon fa fa-link"></i></span>
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
      <div class="pb-empty-icon"><i class="rex-icon fa fa-th-large"></i></div>
      <div>Noch keine Zeilen — klicke auf „+ Zeile hinzufügen"</div>
    </div>
  </div>

  <!-- Side Panel -->
  <transition name="pb-slide">
    <div v-if="panel.open" class="pb-panel">

      <div class="pb-panel-header">
        <span>{{ panel.tab === 'row' ? 'Zeilen-Einstellungen' : 'Zelle bearbeiten' }}</span>
        <button type="button" class="pb-panel-close" @click="closePanel" title="Schließen" aria-label="Schließen"><i class="rex-icon fa fa-times"></i></button>
      </div>

      <!-- MODULE TAB (cell panel) -->
      <div v-if="panel.tab === 'module' && panel.cell" class="pb-panel-body">

        <!-- Inner Tabs -->
        <div class="pb-inner-tabs">
          <button type="button" class="pb-inner-tab" :class="{ active: panel.cellTab === 'content' }" @click="switchToContent()">Inhalt</button>
          <button type="button" class="pb-inner-tab" :class="{ active: panel.cellTab === 'settings' }" @click="collectFromDom(); panel.cellTab = 'settings'">Einstellungen</button>
        </div>

        <!-- Zell-Aktionen: duplizieren / kopieren / einfügen -->
        <div class="pb-cell-actions">
          <button type="button" class="btn btn-default btn-xs" @click="duplicateCell()" title="Zelle als neue Spalte duplizieren"><i class="rex-icon fa fa-clone"></i> Duplizieren</button>
          <button type="button" class="btn btn-default btn-xs" @click="copyCell()" title="Zelle kopieren (auch für andere Artikel)"><i class="rex-icon fa fa-copy"></i> Kopieren</button>
          <button type="button" class="btn btn-default btn-xs" v-if="clip.hasCell" @click="pasteCell()" title="Kopierte Zelle als neue Spalte einfügen"><i class="rex-icon fa fa-clipboard"></i> Einfügen</button>
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
                <button type="button" class="pb-icon-btn" @click.stop="moveSlot(sIdx, -1)" :disabled="sIdx === 0" title="Nach oben" aria-label="Modul nach oben"><i class="rex-icon fa fa-arrow-up"></i></button>
                <button type="button" class="pb-icon-btn" @click.stop="moveSlot(sIdx, 1)"  :disabled="sIdx === panel.cell.modules.length - 1" title="Nach unten" aria-label="Modul nach unten"><i class="rex-icon fa fa-arrow-down"></i></button>
                <button type="button" class="pb-icon-btn" @click.stop="duplicateSlot(sIdx)" :disabled="!slot.module_id" title="Modul duplizieren" aria-label="Modul duplizieren"><i class="rex-icon fa fa-clone"></i></button>
                <button type="button" class="pb-icon-btn danger" @click.stop="removeSlot(sIdx)" title="Entfernen" aria-label="Modul entfernen"><i class="rex-icon fa fa-trash"></i></button>
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
          <div class="pb-panel-group-label">Hintergrund</div>
          ${BG_FIELDS('panel.cell', 'pb-cell')}

          <div class="pb-panel-group-label">Innen-Abstände</div>
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

          <div class="pb-panel-group-label">Außen-Abstände</div>
          ${RESP_RANGE('panel.cell', 'mt', 'Abstand oben')}
          ${RESP_RANGE('panel.cell', 'mb', 'Abstand unten')}
          ${RESP_RANGE('panel.cell', 'mx', 'Links/Rechts')}

          <div class="pb-panel-group-label">Ausrichtung</div>
          <div class="pb-panel-grid cols-2">
            <div class="pb-field">
              <label class="pb-label">Text</label>
              <select class="form-control" v-model="panel.cell.text_align">
                <option v-for="o in textAlignOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
            <div class="pb-field">
              <label class="pb-label">Vertikal</label>
              <select class="form-control" v-model="panel.cell.align">
                <option value="start">Oben</option>
                <option value="center">Mitte</option>
                <option value="end">Unten</option>
              </select>
            </div>
          </div>

          <div class="pb-panel-group-label">Ecken</div>
          ${RADIUS_UI('panel.cell')}

          <div class="pb-panel-group-label">Animation</div>
          ${ANIM_UI('panel.cell')}

          <div class="pb-panel-group-label">Verlinkung</div>
          ${LINK_FIELD('panel.cell', 'pb-cell', 'Spalte')}

          <div class="pb-panel-group-label">Effekte &amp; Erweitert</div>
          ${ADVANCED('panel.cell')}
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
          <select class="form-control" v-model="panel.row.content_width" :disabled="panel.row.container !== 'full'">
            <option v-for="o in contentWidthOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <small v-if="panel.row.container !== 'full'" class="pb-hint">Nur wählbar, wenn Container = „Volle Browserbreite".</small>
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

        <div class="pb-panel-group-label">Außen-Abstände</div>
        ${RESP_RANGE('panel.row', 'mt', 'Abstand oben')}
        ${RESP_RANGE('panel.row', 'mb', 'Abstand unten')}
        ${RESP_RANGE('panel.row', 'mx', 'Links/Rechts')}

        <div class="pb-panel-group-label">Hintergrund</div>
        ${BG_FIELDS('panel.row', 'pb-row')}

        <div class="pb-panel-group-label">Ausrichtung</div>
        <div class="pb-panel-grid cols-2">
          <div class="pb-field">
            <label class="pb-label">Text</label>
            <select class="form-control" v-model="panel.row.text_align">
              <option v-for="o in textAlignOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div class="pb-field">
            <label class="pb-label">Vertikal</label>
            <select class="form-control" v-model="panel.row.align_v">
              <option value="">Normal (Standard)</option>
              <option value="items-center">Zentriert</option>
              <option value="items-end">Unten</option>
            </select>
          </div>
        </div>

        <div class="pb-panel-group-label">Ecken</div>
        ${RADIUS_UI('panel.row')}

        <div class="pb-panel-group-label">Grid</div>
        <div class="pb-panel-section pb-panel-section-row">
          ${TOGGLE('panel.row.mobile_reverse', 'Mobil umkehren')}
        </div>

        <div class="pb-panel-group-label">Animation</div>
        ${ANIM_UI('panel.row')}

        <div class="pb-panel-group-label">Verlinkung</div>
        ${LINK_FIELD('panel.row', 'pb-row', 'Zeile')}

        <div class="pb-panel-group-label">Effekte &amp; Erweitert</div>
        ${ADVANCED('panel.row')}

        <div class="pb-panel-footer">
          <button type="button" class="btn btn-save" style="width:100%" @click="applyAndClose">
            {{ panel.saved ? '✓ Übernommen' : 'Übernehmen & Schließen' }}
          </button>
        </div>
      </div>

    </div>
  </transition>

  <div v-if="panel.open" class="pb-overlay" @click="applyAndClose"></div>

  <transition name="pb-toast-fade">
    <div v-if="toast.show" class="pb-toast">{{ toast.msg }}</div>
  </transition>
</div>
      `,
    }).mount('#' + mountId);

    nextTick(serialize);
  }
})();
