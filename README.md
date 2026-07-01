# TW GridBuilder

Flexibler Tailwind-Grid-Pagebuilder für REDAXO 5. Ermöglicht das visuelle Aufbauen von Layouts aus Zeilen, Spalten und beliebigen REDAXO-Modulen — direkt im Backend. Inspiriert von [gridblock](https://github.com/iceman-fx/gridblock) — vielen Dank an die Entwickler!

---

**Nicht nur für Tailwind Nutzer**

TW GridBuilder generiert Tailwind-Utility-Klassen (Grid, Spacing, Container), benötigt dafür aber keinen eigenen Tailwind-Build-Prozess im Projekt: Alle nötigen Klassen liegen fertig kompiliert in `tw-gridbuilder-grid.css` und lassen sich direkt einbinden. Damit auch für Projekte geeignet, die (noch) keine Tailwind-Toolchain im Einsatz haben.

**Version:** 2.1.0  
**Lizenz:** MIT  
**Autor:** Friends Of REDAXO — [github.com/FriendsOfREDAXO/tw_gridbuilder](https://github.com/FriendsOfREDAXO/tw_gridbuilder)

---

## Abhängigkeiten

### Pflicht

| Paket | Mindestversion | Zweck |
|---|---|---|
| REDAXO | 5.15 | Core |
| PHP | 8.1 | Sprachfeatures |

### Optional

TW GridBuilder selbst hat keine harte Abhängigkeit zu MForm oder Focuspoint — beide werden nur genutzt, wenn sie aktiv sind, und degradieren sonst sauber:

| Paket | Zweck | Verhalten wenn nicht aktiv |
|---|---|---|
| [MForm](https://github.com/FriendsOfREDAXO/mform) | Wird von den *Inhaltsmodulen*, die in den Zellen platziert werden, für deren eigene Formularfelder genutzt — nicht von tw_gridbuilder selbst | Kein Einfluss auf tw_gridbuilder; nur relevant, falls einzelne Inhaltsmodule MForm voraussetzen |
| [Focuspoint](https://github.com/FriendsOfREDAXO/focuspoint) | Bildausschnitt für Hintergrundbilder (Zeilen & Zellen) | Fallback auf `background-position: 50% 50%` (Bild-Center), keine Fehler |

### Frontend

tw_gridbuilder selbst rendert reines HTML/CSS (Grid, Spacing, Container) — kein JavaScript nötig. Tailwind bzw. Alpine.js sind nur relevant, falls einzelne *Inhaltsmodule* in den Zellen sie voraussetzen (z.B. für eigene Farb-/Typografie-Klassen oder reaktive Interaktionen) — das hängt vom jeweiligen Modul ab, nicht von tw_gridbuilder.

### Backend (wird vom Addon selbst geladen)

| Datei | Zweck |
|---|---|
| `assets/tw-gridbuilder.js` | Vue 3 (via REDAXO-Backend-CDN), gesamte Pagebuilder-UI |
| `assets/tw-gridbuilder.css` | Backend-Styles für den Editor |
| `assets/tw-gridbuilder-grid.css` | Grid- und Layout-CSS für das Frontend (nicht automatisch eingebunden, siehe „Grid-CSS in den Build-Prozess einbinden") |

---

## Installation

1. Addon in `redaxo/src/addons/tw_gridbuilder/` ablegen
2. Im REDAXO-Backend unter **AddOns → tw_gridbuilder** installieren und aktivieren
3. Neues Modul anlegen:
   - **Input:** Inhalt aus `module/input.php` einfügen
   - **Output:** Inhalt aus `module/output.php` einfügen
4. Modul einer Seite/Template zuweisen und im Slice verwenden
5. Eigene Inhaltsmodule mit dem Kommentar `/* tw_gridblock kompatibel */` im Input markieren — nur diese erscheinen in der Modulauswahl des Pagebuilders

---

## Dateistruktur

```
tw_gridbuilder/
├── assets/
│   ├── tw-gridbuilder.js          # Backend-UI (Vue 3)
│   ├── tw-gridbuilder.css         # Backend-Styles
│   └── tw-gridbuilder-grid.css    # Frontend-Grid- und Layout-CSS (vollständig, kein Tailwind-Build nötig)
├── lib/
│   ├── TwGridBuilderApi.php       # AJAX-API: Modul-Formulare & Previews
│   └── TwGridBuilderHelper.php    # REX_VALUE/REX_MEDIA Token-Auflösung
├── module/
│   ├── input.php                  # Modul-Input (Kopiervorlage)
│   └── output.php                 # Modul-Output (Kopiervorlage)
├── boot.php                       # Addon-Bootstrap
├── package.yml                    # Metadaten & Abhängigkeiten
├── composer.json                  # PSR-4-Autoload (FriendsOfRedaxo\TwGridBuilder\)
├── CHANGELOG.md                   # Versionshistorie
├── LICENSE.md                     # Lizenz
└── README.md                      # Diese Datei
```

---

## Funktionsweise

### Datenspeicherung

Das gesamte Layout wird als JSON in `REX_VALUE[1]` des Slices gespeichert:

```json
{
  "rows": [
    {
      "id": "...",
      "container": "standard",
      "content_width": "standard",
      "bg": "",
      "bg_image": "",
      "bg_video": "",
      "py_top": "3",
      "py_bottom": "3",
      "gap": "4",
      "text_align": "",
      "mobile_reverse": false,
      "cells": [
        {
          "id": "...",
          "span": 6,
          "bg": "",
          "bg_image": "",
          "bg_video": "",
          "py_top": "0",
          "py_bottom": "0",
          "px": "0",
          "align": "start",
          "text_align": "",
          "rounded": false,
          "modules": [
            {
              "id": "...",
              "module_id": 5,
              "values": {
                "1": "Überschrift",
                "__media_1": "bild.jpg"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### Modul-Formular-Namespace

Formularfelder innerhalb einer Zelle werden umbenannt um Konflikte zu vermeiden:
- `REX_INPUT_VALUE[n]` → `REX_INPUT_VALUE[twgb][{cell_id}][n]`
- `REX_INPUT_MEDIA[n]` → `REX_INPUT_VALUE[twgb][{cell_id}][__media_n]`

### Responsive Abstände

Alle Abstände (Zeile: oben/unten/Gap, Zelle: oben/unten/innen) sind pro Breakpoint einstellbar:

| Breakpoint | Klassen-Präfix | Bereich |
|---|---|---|
| Smartphone (alle Größen) | `pt-`, `pb-`, `px-`, `gap-` | Basiswert |
| Tablet (ab 768px) | `md:pt-`, `md:pb-`, … | überschreibt Smartphone |
| Desktop (ab 1024px) | `lg:pt-`, `lg:pb-`, … | überschreibt Tablet |

Tablet- und Desktop-Klassen werden nur ausgegeben wenn sie vom jeweils kleineren Breakpoint abweichen.

### Hintergrundmedien

- **Bilder:** `style="background-image: url(...);"` direkt auf dem Element — kein z-index nötig
- **Videos:** `relative z-10` auf dem Container + `.video-docker`-Div
- **Focuspoint:** wird automatisch ausgelesen wenn das Addon aktiv ist

### Modulfilter

Nur Module mit dem Kommentar `/* tw_gridblock kompatibel */` irgendwo im Input-Code erscheinen in der Modulauswahl. So lässt sich gezielt steuern welche Module im Pagebuilder nutzbar sind.

### Struktur-Klassen (Zeilen & Zellen)

Jede Zeile und jede Zelle bekommt im Frontend zusätzlich zu den Layout-Utility-Klassen (`grid-cols-12`, `col-span-4` etc.) feste, sprechende Klassen, die das Spalten-Layout beschreiben — unabhängig von Farbe, Abstand oder Inhalt. Damit lassen sich Layouts gezielt per CSS ansprechen (z.B. ein individuelles Design nur für eine bestimmte Spaltenaufteilung), ohne jede Zeile einzeln im Backend markieren zu müssen.

**Zeilen-Wrapper:**

| Klasse | Bedeutung |
|---|---|
| `twgb-row` | Kennzeichnet jeden Zeilen-Wrapper generell |
| `twgb-row--cols-{n}` | Anzahl der Zellen in der Zeile, z.B. `twgb-row--cols-2` bei zwei Spalten |
| `twgb-row--span-{a}-{b}-...` | Span-Verhältnis der Zellen in Reihenfolge (auf Basis des 12er-Grids), z.B. `twgb-row--span-4-8` bei einer 1/3+2/3-Aufteilung, `twgb-row--span-6-3-3` bei 1/2+1/4+1/4 |

**Zellen:**

| Klasse | Bedeutung |
|---|---|
| `twgb-cell` | Kennzeichnet jede Zelle generell |
| `twgb-cell--{i}-of-{n}` | Position der Zelle in der Zeile, 1-basiert, z.B. `twgb-cell--1-of-2`, `twgb-cell--2-of-2` |
| `twgb-cell--span-{n}` | Eigener Span-Wert dieser Zelle (0–12), z.B. `twgb-cell--span-4` |

**Beispiel** — zwei Spalten mit 1/3 + 2/3 (Span 4 + 8):

```html
<div class="grid grid-cols-12 gap-4 twgb-row twgb-row--cols-2 twgb-row--span-4-8">
  <div class="col-span-4 twgb-cell twgb-cell--1-of-2 twgb-cell--span-4">…</div>
  <div class="col-span-8 twgb-cell twgb-cell--2-of-2 twgb-cell--span-8">…</div>
</div>
```

**Warum Span-Zahlen statt Brüche (z.B. `1_3`/`2_3`)?** Intern wird jede Spaltenbreite ohnehin als Span-Wert auf Basis von 12 Spalten gespeichert (`col-span-{n}`). Eine Umrechnung in gekürzte Brüche (⅓, ⅔, ½ …) wäre verlustbehaftet und mehrdeutig — z.B. sähen `span-6` und eine andere, tatsächlich abweichende Aufteilung nach dem Kürzen identisch aus. Die rohen Span-Zahlen sind eindeutig und brauchen keine Umrechnung.

**Warum keine IDs?** IDs müssen pro Seite eindeutig sein. Zwei Zeilen mit identischem Layout (z.B. zwei `1/3`+`2/3`-Zeilen) hätten sonst doppelte IDs — ungültiges HTML und kaputte `#id`-Selektoren/`getElementById`-Aufrufe. Klassen können beliebig oft vorkommen und sind daher der richtige Mechanismus für einen wiederkehrenden Struktur-Descriptor. Für echte Eindeutigkeit (z.B. Sprungmarken oder JS-Hooks pro einzelner Zeile/Zelle) existiert bereits eine `id` pro Row/Cell im gespeicherten JSON (siehe „Datenspeicherung" oben) — die lässt sich bei Bedarf zusätzlich als HTML-`id` ausgeben.

---

## Zeilen-Einstellungen

| Einstellung | Werte | Ergebnis |
|---|---|---|
| Container | `standard`, `full` | `container mx-auto px-4` / `w-full px-4` |
| Breite des Inhalts | `standard`, `full` | erzwingt `container` / `w-full` |
| Abstand oben | 0–16 pro Breakpoint | `pt-{n} md:pt-{n} lg:pt-{n}` |
| Abstand unten | 0–16 pro Breakpoint | `pb-{n} md:pb-{n} lg:pb-{n}` |
| Spalten-Gap | 0–16 pro Breakpoint | `gap-{n} md:gap-{n} lg:gap-{n}` |
| Hintergrundfarbe | TW-Klasse | direkt als Klasse |
| Hintergrundbild | Dateiname | `background-image` Style + Focuspoint |
| Hintergrundvideo | Dateiname | `.video-docker` |
| Textausrichtung | `text-left`, `text-center`, `text-right` | direkt als Klasse |
| Mobil umkehren | bool | `pb-mobile-reverse` |

## Zellen-Einstellungen

| Einstellung | Werte | Ergebnis |
|---|---|---|
| Breite | 1–12 | `col-span-{n}` |
| Abstand oben | 0–16 pro Breakpoint | `pt-{n} md:pt-{n} lg:pt-{n}` |
| Abstand unten | 0–16 pro Breakpoint | `pb-{n} md:pb-{n} lg:pb-{n}` |
| Innen links/rechts | 0–16 pro Breakpoint | `px-{n} md:px-{n} lg:px-{n}` |
| Ausrichtung vertikal | `start`, `center`, `end` | — / `flex flex-col justify-center` / `flex flex-col justify-end` |
| Abgerundet | bool | `rounded-lg` |
| Hintergrundfarbe | TW-Klasse | direkt als Klasse |
| Hintergrundbild | Dateiname | `background-image` Style + Focuspoint |
| Hintergrundvideo | Dateiname | `.video-docker` |

---

## Grid-CSS in den Build-Prozess einbinden

Die Datei `assets/tw-gridbuilder-grid.css` (~12 KB) enthält alle Grid-, Spacing- und Layout-Klassen die der Pagebuilder dynamisch generiert. Sie wird **nicht automatisch** im Frontend eingebunden, um volle Kontrolle über Ladezeiten zu behalten.

### Empfohlener Weg: Build-Integration

Die CSS-Datei in den bestehenden CSS-Build-Prozess des Projekts einbinden. Abhängig vom Toolchain z.B.:

```css
/* PostCSS / Vite / Webpack */
@import '/path/to/redaxo/src/addons/tw_gridbuilder/assets/tw-gridbuilder-grid.css';
```

```js
// Vite / Webpack JS-Einstiegspunkt
import '/path/to/redaxo/src/addons/tw_gridbuilder/assets/tw-gridbuilder-grid.css';
```

Das Ergebnis landet dann im kompilierten CSS-Bundle des Projekts — kein extra HTTP-Request, Browser-Caching über das Bundle.

### Automatisches Kopieren in ein Build-Verzeichnis

Das Addon kann die Grid-CSS bei jedem Seitenaufruf automatisch in ein konfigurierbares Zielverzeichnis kopieren (nur wenn die Quelldatei neuer ist). So liegt die Datei immer aktuell im Build-Quellordner.

Einmalig konfigurieren, z.B. in der REDAXO-Konsole oder einer `install.php`:

```php
rex_addon::get('tw_gridbuilder')->setConfig(
    'css_output_path',
    rex_path::base('theme/private/css/tw-gridbuilder-grid.css')
);
```

Leer lassen oder auf `''` setzen um das Kopieren zu deaktivieren.

### Manuelles Einbinden (ohne Build-Prozess)

Die Datei direkt per `<link>`-Tag im Template referenzieren:

```html
<link rel="stylesheet" href="/assets/addons/tw_gridbuilder/tw-gridbuilder-grid.css?v=2.1.0">
```

---

## Sicherheit

Eine Sicherheitsprüfung (Input-Validierung, XSS, CSRF, API-Zugriffe) wurde am 2026-06-30 durchgeführt. Ergebnis:

| Bereich | Status |
|---|---|
| SQL-Injection | ✅ Sicher — alle Queries parametrisiert oder `(int)`-Cast |
| CSRF | ✅ Sicher — `rex::isBackend() && rex::getUser()` als Gate |
| XSS (HTML-Output) | ✅ Sicher — `htmlspecialchars(ENT_QUOTES)` durchgängig |
| `eval()` mit User-Werten | ✅ Sicher — Werte via `var_export()` escaped |
| API-Zugriffskontrolle | ✅ Sicher — Backend-Auth-Check vor jeder Operation |
| CSS `background-image` URL | ⚠️ Hinweis — URL ungequotet (nur durch Admins ausnutzbar) |

**Hinweis:** Die Funktion `pb_bg_image_style()` bettet den Mediadateinamen ungequotet als CSS-`url()` ein. Ein Dateiname mit Sonderzeichen wie `)` oder `;` könnte die CSS-Deklaration brechen. Da nur Backend-Admins Dateien hochladen können, ist das Risiko gering. Empfehlung für künftige Versionen: `url("...")` mit gequotetem, geslashtem Dateinamen verwenden.

---

## Bekannte Einschränkungen

- **Teilweise theme-abhängig:** Projektspezifische Tailwind-Klassen (z.B. `bg-primary-500`, `bg-secondary-50`) kommen aus dem kompilierten Tailwind-Build des Themes. Alle strukturellen Klassen (Grid, Abstände, Container, video-docker) sind vollständig in `tw-gridbuilder-grid.css` enthalten.
- Modul-Input muss MForm-kompatibel sein
- CKEditor 5 wird unterstützt; andere Rich-Text-Editoren nicht getestet

---

## Lizenz

MIT License, siehe [LICENSE.md](LICENSE.md).
