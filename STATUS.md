# TW GridBuilder – Offene Punkte

## Architektur
- Vue 3 (CDN), kein Build-Step
- Addon: `redaxo/src/addons/tw_gridbuilder/`
- Helper-Klasse: `FriendsOfRedaxo\TwGridBuilder\Helper::renderModule()` / `injectValues()` (lib/TwGridBuilderHelper.php) — ersetzt REX_VALUE[n] via Regex (kein rex_var::parse)
- AJAX-API: `FriendsOfRedaxo\TwGridBuilder\Api` (lib/TwGridBuilderApi.php), registriert als `twgb_load_module`
- Datenspeicherung: JSON in `value1` via `REX_INPUT_VALUE[twgb][__layout__]` → boot.php schreibt nach `REX_INPUT_VALUE[1]`
- Frontend-CSS: kein automatisches Einbinden mehr — optional via `css_output_path`-Config oder manuell in Build-Prozess (siehe README)

## Offene Bugs / TODOs
- Keine bekannt.

## Erledigt (siehe CHANGELOG.md für Details)
- Mehrfachnutzung auf einer Seite: 2. Instanz zeigte zuvor Inhalte der 1. — behoben, getestet
- Link-Feld `REX_VALUE[id=2]`-Format: `Helper::injectValues()` deckt via Regex `REX_VALUE\[(?:id=)?(\d+)\]` beide Schreibweisen ab (`REX_VALUE[2]` und `REX_VALUE[id=2]`) — getestet, funktioniert
- v1.2.0: Responsive Abstände pro Breakpoint (Smartphone/Tablet/Desktop), `pb_resp_class()`-Helper, RexStan Level 5 sauber
- v1.1.0: Media-Prefill/Preview-Bugs behoben, Tab-Wechsel-Datenverlust behoben, Media-Picker-Speichern behoben, Container-Hintergrund-Logik korrigiert, CSS-Delivery auf config-driven umgestellt

## Wichtige Dateien
```
redaxo/src/addons/tw_gridbuilder/
  boot.php                     ← POST → REX_INPUT_VALUE[1], Asset-Einbindung, optionale CSS-Kopie
  assets/tw-gridbuilder.js     ← Vue App (Backend-Editor)
  assets/tw-gridbuilder.css    ← Backend UI
  assets/tw-gridbuilder-grid.css ← Frontend Grid-Klassen (manuell einzubinden)
  lib/TwGridBuilderApi.php     ← AJAX: Modulformular + Preview
  lib/TwGridBuilderHelper.php  ← renderModule() + injectValues()
  module/input.php             ← Kopiervorlage Backend-Editor
  module/output.php            ← Kopiervorlage Frontend-Output
```
