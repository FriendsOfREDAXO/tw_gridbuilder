# Changelog — TW GridBuilder

## [2.1.1] — 2026-07-01

### Fixes
- **Eigenes GridBuilder-Modul erschien in der Modul-Auswahlliste**: Beim Einbetten eines Moduls in eine Zelle (`module/input.php`) wurde das GridBuilder-Modul selbst fälschlich mit ausgewählt, da der Selbst-Ausschluss über einen Namens-Abgleich (`name NOT LIKE '%tw-gridbuilder%'`) erfolgte — abhängig vom exakten Modulnamen in der Backend-Instanz. Umgestellt auf einen dedizierten Marker-Kommentar (`/* tw_gridblock selbst - NICHT LÖSCHEN, ... */`) direkt im Input-Code des GridBuilder-Moduls, der instanzunabhängig per SQL ausgeschlossen wird
- **`REX_VALUE[id=n output=html]`-Syntax wurde bei eingebetteten Modulen nicht ersetzt**: `Helper::injectValues()` erkannte nur `REX_VALUE[n]` und `REX_VALUE[id=n]`, nicht aber die reguläre REDAXO-Syntax mit Zusatzparametern (z. B. `output=html`), die bei normalen Nicht-mform-Modulen üblich ist. Dadurch blieb der Roh-Token in der gerenderten Ausgabe sichtbar statt durch den gespeicherten Wert ersetzt zu werden. Regex erweitert, um beliebige Zusatzparameter nach der ID zu tolerieren

## [2.1.0] — 2026-07-01

### Neu
- **Struktur-Klassen für Zeilen und Zellen**: Jede Zeile bekommt `twgb-row`, `twgb-row--cols-{n}` und `twgb-row--span-{a}-{b}-...` (Span-Verhältnis der Zellen, z.B. `twgb-row--span-4-8` bei 1/3+2/3). Jede Zelle bekommt `twgb-cell`, `twgb-cell--{i}-of-{n}` und `twgb-cell--span-{n}`. Ermöglicht gezieltes CSS-Targeting bestimmter Spaltenaufteilungen ohne manuelle Markierung im Backend. Details siehe README → „Struktur-Klassen (Zeilen & Zellen)"
- Rein additiv, keine Breaking Changes: bestehende Layout-Utility-Klassen (`grid-cols-12`, `col-span-{n}` etc.) bleiben unverändert

## [2.0.0] — 2026-07-01

### ⚠️ Breaking Change
- Addon wird als offizielles **FriendsOfREDAXO**-Addon geführt. Namespace geändert von `TwGridBuilder\*` zu `FriendsOfRedaxo\TwGridBuilder\*` (PSR-4, siehe `composer.json`)
- **Migration nötig:** Eigene Kopien von `module/output.php` (z.B. im Theme unter `theme/private/redaxo/modules/tw-gridbuilder [id]/`) müssen die Aufrufe `TwGridBuilder\Helper::…` auf `\FriendsOfRedaxo\TwGridBuilder\Helper::…` anpassen

### Sicherheit
- Verwaiste, öffentlich erreichbare Kopie von `TwGridBuilderApi.php` unter `assets/addons/tw_gridbuilder/` entfernt (totes PHP-File im Web-Root)

### Fixes
- **Fälschlich harte Abhängigkeiten entfernt**: `package.yml` verlangte `mform` und `focuspoint` als Pflicht-Pakete, obwohl der Code das nicht braucht. `mform` wird nirgends im Addon aufgerufen (nur potenziell von den in den Zellen platzierten Inhaltsmodulen). `focuspoint` wird in `module/output.php` bereits mit `class_exists(...)` abgesichert und fällt sauber auf `background-position: 50% 50%` zurück. Die harte Anforderung hat die Aktivierung von tw_gridbuilder in Projekten ohne diese Addons unnötig blockiert.

### Verbesserungen
- `package.yml`: Autor auf „Friends Of REDAXO" geändert, Supportpage auf GitHub-Repo, PHP-Mindestversion `>=8.1` ergänzt
- `composer.json` mit PSR-4-Autoload hinzugefügt
- `LICENSE` → `LICENSE.md` umbenannt (FOR-Konvention), Copyright auf Friends Of REDAXO umgestellt (ursprünglich entwickelt von getaweb)

### Doku
- README: Hinweis ergänzt, dass die Idee von [gridblock](https://github.com/iceman-fx/gridblock) inspiriert ist — TW GridBuilder benötigt dank mitgelieferter, fertig kompilierter CSS-Datei keinen eigenen Tailwind-Build-Prozess im Projekt
- README: fälschliche Angabe entfernt, dass Alpine.js im Frontend notwendig sei — tw_gridbuilder rendert reines HTML/CSS ohne JavaScript; Alpine/Tailwind sind nur relevant, falls einzelne Inhaltsmodule das voraussetzen
- README aktualisiert (Autor, Version, veraltete Angaben zu automatischer CSS-Injection entfernt)

## [1.2.0] — 2026-06-30

### Neu
- **Responsive Abstände**: Abstand oben/unten, Innen links/rechts (Zellen) und Spalten-Gap (Zeilen) sind jetzt pro Breakpoint einstellbar — Smartphone / Tablet / Desktop
- 3-Spalten-Slider-UI: alle Breakpoints auf einen Blick, kein Tab-Wechsel nötig
- `md:` und `lg:` Klassen vollständig in `tw-gridbuilder-grid.css` (pt/pb/px/gap 0–16)
- Neuer PHP-Helfer `pb_resp_class()` generiert responsive Klassen (`pt-3 md:pt-6 lg:pt-10`) — md/lg nur wenn abweichend (CSS-Kaskade)
- Migration: bestehende Daten erhalten md/lg automatisch denselben Wert wie die Basis — keine visuellen Änderungen

### Fixes
- `rex_api_exception`-Aufrufe mit falschem zweiten Parameter (`int` statt `Exception|null`) korrigiert (RexStan Level 5)

---

## [1.1.0] — 2026-06-30

### Sicherheit
- **Sicherheitsprüfung durchgeführt** (Input-Validierung, XSS, CSRF, API-Zugriffe): Keine kritischen Lücken gefunden
- Hinweis: CSS-`background-image`-URL aus Mediainamen wird ungequotet in Style-Attribut eingebettet — betrifft nur Backend-Admins mit Upload-Rechten; Empfehlung: `url("...")` mit escaped Filename verwenden

### Neu
- Modul-Input: Nur Module mit Kommentar `/* tw_gridblock kompatibel */` erscheinen in der Modulauswahl
- Modul-Input: `tw-gridbuilder`-Modul selbst wird aus der Liste ausgeschlossen
- Zellen-Einstellungen: Toggle-Switch für "Mobil umkehren" (statt nativer Checkbox)
- Kopiervorlagen für Input und Output unter `module/input.php` / `module/output.php` im Addon abgelegt
- `CHANGELOG.md` und `README.md` hinzugefügt

### Fixes
- **Tab-Wechsel verliert Formwerte**: `collectFromDom()` wird vor Wechsel zu "Einstellungen" aufgerufen; bei Rückkehr zu "Inhalt" wird das Formular neu geladen — Werte bleiben erhalten
- **Media-Picker (Zeilen-/Zellen-Einstellungen) speichert nicht**: `rex:selectMedia`-Event wird jetzt korrekt am Popup-Fenster gebunden (war fälschlich am Opener)
- **Bild nicht sichtbar in Collapsed-View**: CSS-Ausnahme für `.pb-cell-preview .form-horizontal img` (max-height: 120px)
- **REX_MEDIA-Token als Wert gespeichert** (Altdaten): Sanitize in `prefillForm` (JS) und `injectValues` (PHP) — Token werden zu leerem String bereinigt
- **Zell-/Zeilen-Hintergründe funktionieren nicht wenn Zeile Hintergrundfarbe hat**: Umstieg von `<img absolute -z-10>` auf `background-image` CSS-Property direkt am Element; Videos nutzen `.video-docker` wie gridblock
- **Stale Preview aus JSON wiederhergestellt**: `cell.preview` wird nicht mehr aus gespeichertem JSON geladen — immer frisch via API

### Verbesserungen
- **Breite des Inhalts = Standard** erzwingt jetzt immer `container`-Klasse, unabhängig von der Container-Einstellung der Zeile
- Range Slider: Label-Breite auf `165px` (fest, `white-space: nowrap`) — alle Slider gleich lang
- Backend collapsed-View: Bild-Thumbnail wird angezeigt (120px hoch)
- `onMounted`: alle Zellen mit Modulen laden Preview frisch via API beim Start
- Versionsnummer `@version 1.0.1` in Input und Output

### CSS / Assets
- `tw-gridbuilder-grid.css`: alle dynamisch generierten Klassen vollständig (pt/pb/px/gap 0–16, col-span 1–12)
- `tw-gridbuilder-grid.css`: `.video-docker` eingebaut (war nur im Theme definiert)
- `tw-gridbuilder-grid.css`: fehlende Werte ergänzt (gap-13/15, pt/pb-11/13/15, px-7/9/11–15)

---

## [1.0.0] — 2026-06-29

### Initial Release
- Flexibler Tailwind-Grid-Pagebuilder für REDAXO 5
- Zeilen mit bis zu 6 Spalten, frei konfigurierbar (1–12 Spalten-Span)
- Beliebige REDAXO-Module pro Zelle (Multi-Slot)
- Zeilen-Einstellungen: Container, Breite des Inhalts, Abstände, Gap, Hintergrund (Farbe/Bild/Video), Textausrichtung, Mobil umkehren
- Zellen-Einstellungen: Span, Abstände, Ausrichtung, Hintergrund (Farbe/Bild/Video), Abgerundet
- Drag & Drop für Zeilen und Zellen
- Spalten-Resize per Drag
- Backend collapsed-View mit Modul-Vorschau
- MForm-kompatible Modul-Formulare mit Namespace-Isolation
- CKEditor 5 Support
- Focuspoint-Integration für Hintergrundbilder
- Mehrere Instanzen pro Seite möglich
- CSRF-Schutz für AJAX-API
