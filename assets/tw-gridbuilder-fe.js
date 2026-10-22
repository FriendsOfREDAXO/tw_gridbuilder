/* TW GridBuilder – Frontend-Editing. Nur geladen, wenn der Server Slots markiert hat. */
(function () {
  'use strict';
  const cfg = window.TWGB_FE;
  if (!cfg) return;

  const post = (params) => {
    const body = new URLSearchParams({ 'rex-api-call': 'twgb_fe', ...params });
    body.set(cfg.csrfField, cfg.csrf);
    return fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: body.toString(),
    }).then((r) => r.json());
  };

  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };

  // Button + Drawer
  const toggle = el('<button type="button" class="twgb-fe-toggle">Inhalte bearbeiten</button>');
  const drawer = el('<aside class="twgb-fe-drawer" hidden><header><strong>Inhalte bearbeiten</strong><button type="button" data-close aria-label="Schließen">×</button></header><div class="twgb-fe-formwrap"><iframe class="twgb-fe-frame" title="Inhalte bearbeiten"></iframe></div><footer><button type="button" data-save>Speichern</button><span class="twgb-fe-msg"></span></footer></aside>');
  // Shadow DOM: Button + Drawer sind vom Seiten-CSS entkoppelt (nur CSS-Variablen/Tokens wirken durch)
  const host = document.createElement('div');
  host.id = 'twgb-fe-root';
  const shadow = host.attachShadow({ mode: 'open' });
  // CSS inline (kein Nachladen) → kein Aufblitzen/Einfahren vor dem Styling
  const style = document.createElement('style');
  style.textContent = cfg.css;
  shadow.append(style, toggle, drawer);
  document.body.append(host);
  // Einzige Seitenregel: Hover-Rahmen um bearbeitbare Slots
  document.head.append(el('<style>.twgb-fe-on [data-twgb-slot]:hover>*{outline:2px dashed #2563eb;outline-offset:2px;cursor:pointer}</style>'));
  // Formular + CKEditor leben in einem eigenen Dokument (iframe): komplett vom Seiten-CSS getrennt, und
  // CKEditor braucht ein echtes Dokument (Selection-API funktioniert im Shadow DOM nicht zuverlässig).
  const frame = drawer.querySelector('iframe');
  let form;
  const frameReady = new Promise((resolve) => {
    frame.addEventListener('load', () => {
      form = frame.contentDocument.querySelector('form');
      form.addEventListener('submit', (e) => e.preventDefault());
      form.addEventListener('input', () => preview());
      form.addEventListener('change', () => preview());
      resolve();
    }, { once: true });
    frame.srcdoc = '<!doctype html><html lang="de"><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box}html,body{overflow-x:hidden;margin:0;background:transparent;color:#fff;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark}.twgb-fe-form{overflow:visible}'
      + cfg.css + '</style></head><body><form class="twgb-fe-form"></form></body></html>';
  });
  const msg = drawer.querySelector('.twgb-fe-msg');
  let current = null; // { wrap, params, prefix }
  let editors = []; // aktive CKEditor-Instanzen im Drawer

  // CKEditor 5: derselbe Stack wie im Backend (jQuery, Build, Übersetzungen, Plugins, Profile, cke5.js), lazy und nur
  // im iframe-Dokument geladen. Dadurch gelten die echten cke5-Profile (data-profile) – Tabellen, Farben, Links ...
  let ckePromise;
  const loadCke = () => ckePromise || (ckePromise = new Promise((resolve, reject) => {
    if (!cfg.cke) return reject(new Error('cke5 nicht verfügbar'));
    const doc = frame.contentDocument, win = frame.contentWindow;
    win.rex = cfg.cke.rex;
    cfg.cke.css.forEach((href) => { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = href; doc.head.append(l); });
    cfg.cke.scripts.reduce((chain, src) => chain.then(() => new Promise((ok, fail) => {
      const t = doc.createElement('script');
      t.src = src; t.onload = ok; t.onerror = () => fail(new Error('Laden fehlgeschlagen: ' + src));
      doc.head.append(t);
    })), Promise.resolve()).then(() => resolve(win)).catch(reject);
  }));

  function initEditors() {
    if (!form.querySelector('textarea.cke5-editor')) return;
    loadCke().then((win) => {
      const $ = win.jQuery;
      $(win).off('rex:cke5IsInit.twgb').on('rex:cke5IsInit.twgb', (e, ed) => {
        editors.push(ed);
        const ta = ed.sourceElement;
        ed.model.document.on('change:data', () => { ta.value = ed.getData(); ta.dispatchEvent(new win.Event('input', { bubbles: true })); });
      });
      $(frame.contentDocument).trigger('rex:ready', [$(form)]); // cke5.js initialisiert alle .cke5-editor im Formular
    }).catch((e) => { console.warn('TWGB FE: CKEditor nicht geladen', e); msg.textContent = 'Editor konnte nicht geladen werden – Feld bleibt als HTML-Text.'; });
  }
  // cke5_destroy synchronisiert den Inhalt in die Textarea und räumt die Registry auf (nötig, damit gleiche IDs neu initialisiert werden)
  const destroyEditors = () => {
    const win = frame.contentWindow;
    if (win && win.cke5_destroy && win.jQuery) editors.forEach((ed) => { if (ed.sourceElement) win.cke5_destroy(win.jQuery(ed.sourceElement)); });
    editors = [];
  };

  const on = () => document.documentElement.classList.contains('twgb-fe-on');
  // Bearbeiten-Modus pro Tab merken, damit er nach Reload/Seitenwechsel aktiv bleibt
  const setMode = (v) => {
    document.documentElement.classList.toggle('twgb-fe-on', v);
    toggle.textContent = v ? 'Fertig' : 'Inhalte bearbeiten';
    try { v ? sessionStorage.setItem('twgbFe', '1') : sessionStorage.removeItem('twgbFe'); } catch (e) {}
    if (!v) close();
  };
  toggle.addEventListener('click', () => setMode(!on()));
  try { if (sessionStorage.getItem('twgbFe')) setMode(true); } catch (e) {}
  drawer.querySelector('[data-close]').addEventListener('click', close);
  function close() {
    // Ohne Speichern: Original-HTML des Slots wiederherstellen (Live-Vorschau verwerfen)
    if (current && current.dirty) current.wrap.innerHTML = current.original;
    destroyEditors();
    drawer.hidden = true; current = null; if (form) form.innerHTML = '';
  }

  document.addEventListener('click', (e) => {
    const wrap = on() && e.target.closest('[data-twgb-slot]');
    if (!wrap || host.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    open(wrap);
  }, true);

  function open(wrap) {
    const params = { slice: wrap.dataset.slice, cell: wrap.dataset.cell, slot: wrap.dataset.slot };
    msg.textContent = 'Lade …';
    drawer.hidden = false;
    Promise.all([post({ op: 'form', ...params }), frameReady]).then(([data]) => {
      if (data.error) { msg.textContent = data.error; return; }
      msg.textContent = '';
      const prefix = 'REX_INPUT_VALUE[twgb][' + params.cell + '_' + params.slot + ']';
      destroyEditors();
      form.innerHTML = data.html;
      // Medien-/Link-Widgets gibt es im Frontend nicht → Feld ausblenden, Wert bleibt serverseitig erhalten
      form.querySelectorAll('script').forEach((s) => s.remove());
      // MForm-Tabs untereinander: Tab-Titel als Überschrift vor jedem Bereich, Tab-Leiste weg
      form.querySelectorAll('.mform-tabs').forEach((tabs) => {
        const titles = [...tabs.querySelectorAll(':scope > .nav-tabs > li > a')].map((a) => a.textContent.trim());
        tabs.querySelectorAll(':scope > .tab-content > .tab-pane').forEach((pane, i) => {
          if (titles[i]) pane.prepend(Object.assign(frame.contentDocument.createElement('h4'), { textContent: titles[i] }));
        });
      });
      prefill(form, prefix, data.values);
      mountPickers();
      // übrige Widgets (Medialisten, Linklisten ...) und per data-fe="0" gesperrte Felder ausblenden; Werte bleiben serverseitig erhalten
      form.querySelectorAll('[class*="rex-js-widget"], [data-fe="0"]').forEach((w) => (w.closest('.form-group') || w).remove());
      buildRepeaters();
      initEditors();
      current = { wrap, params, prefix, original: wrap.innerHTML, dirty: false };
    }).catch(() => { msg.textContent = 'Fehler beim Laden.'; });
  }

  // Medien-/Link-Widgets des Backends durch einfache Auswahl ersetzen (Bilder aus dem Medienpool, Online-Artikel,
  // freie URL). Das eigentliche Feld bleibt als hidden-Input im Formular, damit Prefill/Collect/Speichern unverändert laufen.
  const mediaUrl = (name) => {
    const u = new URL(cfg.url, location.href);
    u.searchParams.set('rex_media_type', 'rex_mediapool_preview');
    u.searchParams.set('rex_media_file', name);
    return u.href;
  };
  function mountPickers() {
    const doc = frame.contentDocument;
    const mount = (w, input, kind) => {
      input.type = 'hidden';
      const box = doc.createElement('div');
      box.className = 'twgb-pick';
      box.innerHTML = (kind === 'media'
        ? '<div class="twgb-pick-cur"><img alt="" hidden><span></span></div>'
        : '<input type="text" class="twgb-pick-url" placeholder="https://… · mailto: · tel: · redaxo://ID">')
        + '<div class="twgb-pick-actions"><button type="button" data-a="choose">' + (kind === 'media' ? 'Auswählen' : 'Artikel wählen') + '</button><button type="button" data-a="clear">Entfernen</button></div>'
        + '<div class="twgb-pick-pop" hidden><input type="search" placeholder="Suchen …">' + (kind === 'media' ? '<select class="twgb-pick-cat"><option value="-1">Alle Kategorien</option></select>' : '') + '<div class="twgb-pick-list"></div></div>';
      const img = box.querySelector('img') || doc.createElement('img'), label = box.querySelector('.twgb-pick-cur span') || doc.createElement('span');
      const urlInput = box.querySelector('.twgb-pick-url');
      const pop = box.querySelector('.twgb-pick-pop'), list = box.querySelector('.twgb-pick-list');
      const search = box.querySelector('input[type=search]');
      const show = () => {
        const v = input.value;
        img.hidden = kind !== 'media' || !v;
        if (kind === 'media' && v) img.src = mediaUrl(v);
        label.textContent = v || 'Kein Bild';
        if (urlInput) urlInput.value = v;
      };
      // freie URL direkt tippen: hidden-Wert mitführen (der input-Event löst die Vorschau aus)
      if (urlInput) urlInput.addEventListener('input', () => { input.value = urlInput.value.trim(); });
      const set = (v) => { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); show(); pop.hidden = true; };
      const cat = box.querySelector('.twgb-pick-cat');
      let offset = 0;
      // append=false: neue Suche/Kategorie; append=true: „Mehr laden“
      const load = (append) => {
        if (!append) offset = 0;
        return post({ op: kind, q: search.value, cat: cat ? cat.value : -1, offset }).then((d) => {
          if (!append) list.innerHTML = '';
          list.querySelector('.twgb-pick-more')?.remove();
          if (cat && !cat.dataset.ready && d.cats) {
            d.cats.forEach((c) => cat.append(Object.assign(doc.createElement('option'), { value: c.id, textContent: c.name })));
            cat.dataset.ready = '1';
          }
          (d.items || []).forEach((it) => {
            const b = doc.createElement('button');
            b.type = 'button';
            b.className = kind === 'media' ? 'twgb-pick-tile' : 'twgb-pick-row';
            if (kind === 'media') { b.title = it.title || it.name; b.innerHTML = '<img alt="" loading="lazy"><small></small>'; b.querySelector('img').src = mediaUrl(it.name); b.querySelector('small').textContent = it.name; }
            else b.textContent = it.name;
            b.addEventListener('click', () => set(kind === 'media' ? it.name : it.value));
            list.append(b);
          });
          offset += (d.items || []).length;
          if (d.more) {
            const m = doc.createElement('button');
            m.type = 'button'; m.className = 'twgb-pick-more'; m.textContent = 'Mehr laden';
            m.addEventListener('click', () => load(true));
            list.append(m);
          }
          if (!list.children.length) list.textContent = 'Nichts gefunden.';
        });
      };
      if (cat) cat.addEventListener('change', (e) => { e.stopPropagation(); load(false); });
      let t;
      search.addEventListener('input', (e) => { e.stopPropagation(); clearTimeout(t); t = setTimeout(() => load(false), 250); });
      box.addEventListener('click', (e) => {
        const a = e.target.dataset && e.target.dataset.a;
        if (a === 'choose') { pop.hidden = !pop.hidden; if (!pop.hidden) load(false); }
        else if (a === 'clear') set('');
      });
      w.replaceWith(box);
      box.prepend(input);
      show();
    };
    form.querySelectorAll('.rex-js-widget-media').forEach((w) => { const i = w.querySelector('input[type=text][name]'); if (i) mount(w, i, 'media'); });
    form.querySelectorAll('.rex-js-widget-customlink').forEach((w) => { const i = w.querySelector('input[type=hidden][name]'); if (i) mount(w, i, 'links'); });
  }

  // MForm-Flex-Repeater (.mfr-container) durch einen schlichten Listen-Editor ersetzen: die originale
  // Repeater-JS läuft im Frontend nicht. Gelesen/geschrieben wird das JSON im versteckten .mfr-value.
  function buildRepeaters() {
    const doc = frame.contentDocument;
    form.querySelectorAll('.mfr-container').forEach((box) => {
      const hidden = box.querySelector(':scope > .mfr-value');
      const tpl = box.querySelector(':scope > template.mfr-item-template');
      if (!hidden || !tpl) return;
      let raw; try { raw = JSON.parse(hidden.value || '[]'); } catch (e) { raw = []; }
      const envelope = !!raw && !Array.isArray(raw) && Array.isArray(raw.items);
      const items = envelope ? raw.items : (Array.isArray(raw) ? raw : []);
      const bodyTpl = tpl.content.firstElementChild.cloneNode(true);
      bodyTpl.querySelector('.mfr-item-header')?.remove();
      const wrap = doc.createElement('div');
      wrap.className = 'twgb-rep';
      box.append(wrap);

      const commit = () => {
        hidden.value = JSON.stringify(envelope ? { ...raw, items } : items);
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const render = () => {
        destroyEditors();
        wrap.innerHTML = '';
        items.forEach((item, i) => {
          const card = doc.createElement('div');
          card.className = 'twgb-rep-item';
          card.innerHTML = '<div class="twgb-rep-head"><strong></strong><span><button type="button" data-a="up" title="Nach oben">↑</button><button type="button" data-a="down" title="Nach unten">↓</button><button type="button" data-a="del" title="Entfernen">×</button></span></div>';
          const title = card.querySelector('strong');
          const setTitle = () => {
            const first = Object.values(item).find((v) => typeof v === 'string' && v.trim());
            title.textContent = (first ? first.replace(/<[^>]*>/g, '').trim().slice(0, 40) : '') || 'Eintrag ' + (i + 1);
          };
          const body = bodyTpl.cloneNode(true);
          body.querySelectorAll('[class*="rex-js-widget"], .mfr-nested-repeater').forEach((w) => (w.closest('.form-group') || w).remove());
          body.querySelectorAll('[data-mfr-field]').forEach((f) => {
            const k = f.dataset.mfrField, v = item[k];
            if (f.type === 'checkbox') f.checked = v === f.value || v === true;
            else if (f.type === 'radio') { f.name = 'twgb_r' + i + '_' + k; f.checked = String(v) === f.value; }
            else f.value = v ?? '';
            const write = () => {
              if (f.type === 'radio' && !f.checked) return;
              item[k] = f.type === 'checkbox' ? (f.checked ? f.value : '') : f.value;
              setTitle();
              commit();
            };
            f.addEventListener('input', write);
            f.addEventListener('change', write);
          });
          setTitle();
          card.append(body);
          card.querySelector('.twgb-rep-head').addEventListener('click', (e) => {
            const a = e.target.dataset && e.target.dataset.a;
            if (!a) return;
            if (a === 'del') items.splice(i, 1);
            else { const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; }
            commit(); render(); initEditors();
          });
          wrap.append(card);
        });
        const add = doc.createElement('button');
        add.type = 'button';
        add.className = 'twgb-rep-add';
        add.textContent = '+ Hinzufügen';
        add.addEventListener('click', () => { items.push({}); commit(); render(); initEditors(); });
        wrap.append(add);
      };
      render();
    });
  }

  function prefill(root, prefix, values) {
    const walk = (obj, path) => {
      if (obj === null || typeof obj !== 'object') return set(path, obj);
      Object.entries(obj).forEach(([k, v]) => walk(v, path + '[' + k + ']'));
    };
    const set = (name, val) => root.querySelectorAll('[name="' + CSS.escape(name) + '"]').forEach((f) => {
      if (f.type === 'checkbox') f.checked = !!val;
      else if (f.type === 'radio') f.checked = f.value === String(val);
      else f.value = String(val ?? '');
    });
    walk(values, prefix);
  }

  function collect(prefix) {
    const out = {};
    form.querySelectorAll('[name]').forEach((f) => {
      if (!f.name.startsWith(prefix)) return;
      if (f.type === 'radio' && !f.checked) return;
      const val = f.type === 'checkbox' ? (f.checked ? f.value || '1' : '') : f.value;
      const keys = [...f.name.slice(prefix.length).matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]);
      keys.reduce((o, k, i) => (i === keys.length - 1 ? (o[k] = val) : (o[k] = o[k] || {})), out);
    });
    return out;
  }

  // Live-Vorschau: ungespeicherte Werte serverseitig rendern und im Slot anzeigen
  let timer, seq = 0;
  const preview = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!current) return;
      const c = current, n = ++seq;
      post({ op: 'preview', ...c.params, values: JSON.stringify(collect(c.prefix)) }).then((data) => {
        if (data.ok && current === c && n === seq) { c.wrap.innerHTML = data.html; c.dirty = true; }
      });
    }, 300);
  };

  drawer.querySelector('[data-save]').addEventListener('click', () => {
    if (!current) return;
    editors.forEach((ed) => ed.updateSourceElement());
    msg.textContent = 'Speichere …';
    post({ op: 'save', ...current.params, values: JSON.stringify(collect(current.prefix)) }).then((data) => {
      if (!data.ok) { msg.textContent = data.error || 'Fehler beim Speichern.'; return; }
      // Slot-Inhalt austauschen, Wrapper bleibt stehen
      current.wrap.innerHTML = data.html;
      current.original = data.html;
      current.dirty = false;
      msg.textContent = 'Gespeichert.';
    }).catch(() => { msg.textContent = 'Fehler beim Speichern.'; });
  });
})();
