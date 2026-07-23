# TW GridBuilder

Flexibler Tailwind-Grid-Pagebuilder für REDAXO 5. Ermöglicht das visuelle Aufbauen von Layouts aus Zeilen, Spalten und beliebigen REDAXO-Modulen — direkt im Backend. Inspiriert von [gridblock](https://github.com/iceman-fx/gridblock) — vielen Dank an die Entwickler!

---

## ⚠️ Grundregel: Updates müssen 100 % abwärtskompatibel sein

**Jede Änderung am Addon muss auf einer Live-Seite gefahrlos einspielbar sein — bestehende Inhalte dürfen sich weder verändern noch kaputtgehen.**

Verbindliche Regeln für jede Weiterentwicklung:

- **Neue Felder immer additiv** einführen und in `module/output.php` mit Default absichern (`$obj['neu'] ?? 0`). Fehlt ein Feld in alten Daten (JSON in `rex_article_slice`), muss das exakte bisherige Verhalten herauskommen.
- **Umbenannte/ersetzte Felder** brauchen eine Migration in `assets/tw-gridbuilder.js` (`migrate*`-Funktionen), die alte Werte verlustfrei und **visuell identisch** überführt (Beispiel: altes `rounded:true` → alle Ecken `lg`, entspricht dem früheren `rounded-lg`).
- **Vor jedem Release** mit echten Alt-Daten testen: alte Seite öffnen, Slice ohne die neuen Felder rendern → Ausgabe muss unverändert sein.
- **Wenn eine Änderung bestehende Angaben doch beeinflussen könnte:** nicht still einbauen — im CHANGELOG unter „⚠️ Breaking / Achtung" klar dokumentieren **und** den Betreiber aktiv darauf hinweisen.
- **Nach dem Addon-Update muss das Modul aktualisiert werden** (Modul-Code aus `module/output.php` + `module/input.php` in die REDAXO-Modul-Definition übernehmen), sonst greift der neue Output nicht.

---

**Setzt einen Tailwind-v4-Build voraus**

TW GridBuilder generiert Tailwind-Utility-Klassen (Grid, Spacing, Container, Hintergrundfarben). Ab Version 2.2.0 werden diese Klassen **vom Tailwind-Build des Projekts erzeugt** (Farben stammen aus den Theme-Variablen, Responsive-Varianten funktionieren korrekt), nicht mehr als vorkompilierte, unlayered Utilities mitgeliefert. `tw-gridbuilder-grid.css` enthält dazu eine Tailwind-`@source inline(...)`-Safelist plus die wenigen echten Custom-Klassen (Video-Hintergrund, Mobile-Reihenfolge). Voraussetzung ist daher, dass die Datei per `@import` in einen **Tailwind-v4-Build** eingebunden ist — siehe „Grid-CSS in den Build-Prozess einbinden".

> Hintergrund des Umbaus: Die früher mitgelieferten generischen Utilities (`.flex`, `.gap-*`, `.container` …) waren *unlayered* CSS und überschrieben in Tailwind-Projekten die `@layer`-Utilities — dadurch griffen Responsive-Varianten wie `lg:hidden` nicht mehr. Der Safelist-Ansatz beseitigt diese Kollision.

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
| [animate.css](https://animate.style) + [alpinejs-intersect-class](https://github.com/markmead/alpinejs-intersect-class) | **Voraussetzung für die Animationen** (Zeilen & Zellen). Wird nur benötigt, wenn im Panel eine Animation ausgewählt ist | Ohne animate.css/Plugin passiert nichts — es wird lediglich das Attribut `x-intersect-class.once="animate__animated …"` ausgegeben, das ohne die Bibliothek wirkungslos bleibt (keine Fehler, keine Darstellungsänderung) |

### Frontend

tw_gridbuilder selbst rendert reines HTML/CSS (Grid, Spacing, Container) — für das Grundlayout ist **kein JavaScript nötig**.

**Ausnahme Animationen:** Wählt man im Panel für eine Zeile oder Zelle eine Animation, gibt das Modul das Alpine-Attribut `x-data x-intersect-class.once="animate__animated …"` aus. Das setzt im Theme zwei Dinge voraus:

1. **[animate.css](https://animate.style)** (die `animate__*`-Klassen) — z.B. via npm oder CDN eingebunden.
2. **[alpinejs-intersect-class](https://github.com/markmead/alpinejs-intersect-class)** als Alpine-Plugin registriert (`Alpine.plugin(intersectClass)`) — löst die Animation einmalig aus, sobald das Element ins Sichtfeld scrollt.

Fehlt eines von beiden, bleibt das Attribut folgenlos — das Grid rendert normal, nur ohne Animation.

Tailwind bzw. Alpine.js sind darüber hinaus nur relevant, falls einzelne *Inhaltsmodule* in den Zellen sie voraussetzen — das hängt vom jeweiligen Modul ab, nicht von tw_gridbuilder.

### Backend (wird vom Addon selbst geladen)

| Datei | Zweck |
|---|---|
| `assets/tw-gridbuilder.js` | Vue 3 (via REDAXO-Backend-CDN), gesamte Pagebuilder-UI |
| `assets/tw-gridbuilder.css` | Backend-Styles für den Editor |
| `assets/tw-gridbuilder-grid.css` | Frontend-CSS: Tailwind-`@source`-Safelist der dynamischen Utilities + Custom-Klassen (Video-Hintergrund, Mobile-Reihenfolge). Muss per `@import` in den Tailwind-v4-Build eingebunden werden — siehe „Grid-CSS in den Build-Prozess einbinden" |

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
│   └── tw-gridbuilder-grid.css    # Safelist (@source) + Custom-CSS; benötigt Tailwind-v4-Build
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

## Bedienung im Editor

### Zeilen sortieren

Jede Zeile lässt sich am Griff `⠿` im Zeilen-Header greifen und per Drag & Drop an eine andere Position schieben. Alternativ verschieben die Pfeil-Buttons `↑` / `↓` im Zeilen-Header die Zeile um eine Position.

### Spalten verschieben — innerhalb einer Zeile und zeilenübergreifend

Eine Spalte lässt sich am Griff `⠿` in der Zelle (oder an der Zelle selbst) greifen und ablegen:

- **innerhalb derselben Zeile** — die Spaltenreihenfolge ändert sich
- **in einer beliebigen anderen Zeile** — die Spalte wechselt samt allen enthaltenen Modulen und allen Zell-Einstellungen die Zeile

Beim Ziehen zeigt eine blaue Einfügemarke die Zielposition an. Ob die Spalte **vor** oder **hinter** der Zelle landet, über der der Mauszeiger steht, entscheidet die linke bzw. rechte Hälfte dieser Zelle. Wird über der Freifläche einer Zeile losgelassen, hängt die Spalte hinten an — so lässt sich auch in eine leere Zeile ablegen. Die Zielzeile wird beim zeilenübergreifenden Ziehen farblich hervorgehoben, die gezogene Spalte transparent dargestellt.

Ist die verschobene Spalte gerade im Panel geöffnet, bleibt sie geöffnet und ist danach korrekt der neuen Zeile zugeordnet.

> **Die Spaltenbreite (`span`) wandert unverändert mit** und wird *nicht* automatisch an die Zielzeile angepasst. Eine Zeile kann dadurch vorübergehend mehr oder weniger als 12 Spalten belegen — im Backend rendert das proportional weiter, im Frontend bricht die Zeile um. Nach dem Verschieben die Breiten per Layout-Preset im Zeilen-Header oder per Resize-Handle zwischen den Zellen korrigieren. (Gleiches Verhalten wie bei „Duplizieren" und „Einfügen".)

> Die **letzte verbleibende Spalte** einer Zeile lässt sich nicht in eine andere Zeile ziehen — sonst bliebe eine Zeile ohne Spalten zurück. Der Editor zeigt in dem Fall einen Hinweis.

### Spalten skalieren

Zwischen zwei benachbarten Zellen liegt ein Resize-Handle: Ziehen verschiebt die Grenze und verteilt die Spans der beiden Zellen neu. Die Layout-Presets im Zeilen-Header (z.B. `4+8`, `6+3+3`) setzen gängige Aufteilungen mit einem Klick.

### Aufbau des Einstellungs-Panels

Zeilen- und Zellen-Panel sind in **aufklappbare Sektionen** gegliedert. Beim Öffnen ist nur „Layout & Abstände" aufgeklappt, alles Weitere liegt zugeklappt darunter:

| Sektion | Inhalt |
|---|---|
| **Layout & Abstände** | Container & Inhaltsbreite (nur Zeile), Innen-Abstände (oben / unten / Gap bzw. links-rechts), Außen-Abstände |
| **Hintergrund** | Farbe, Bild, Video |
| **Ausrichtung & Verhalten** | Textausrichtung, vertikale Ausrichtung, „Mobil umkehren" (nur Zeile) |
| **Ecken & Effekte** | Abgerundete Ecken, Schatten bei Hover, eigene CSS-Klasse |
| **Animation** | Art, Verzögerung, Dauer |
| **Verlinkung** | Ganze Zeile / Spalte als interner Link |

Mehrere Sektionen dürfen gleichzeitig offen sein. Ein **Punkt in der Kopfzeile** markiert Sektionen, in denen etwas vom Standard abweicht — so ist ohne Aufklappen erkennbar, wo an einer Zeile oder Spalte Werte hinterlegt sind.

### Abstände einstellen — ein Wert oder pro Bildschirmgröße

Jede Abstandszeile besteht aus **Regler + Zahlenfeld** (0–16, Eingaben werden auf den gültigen Bereich begrenzt). Im Normalfall steuert dieser eine Regler **alle drei Breakpoints gleichzeitig**:

```
Abstand oben     [────●────] [ 3 ]   🖥
```

Der Button rechts klappt die Zeile auf und macht jeden Breakpoint einzeln einstellbar:

```
Abstand oben                  3 / 3 / 5   🖥
  📱 Smartphone  [────●────] [ 3 ]
  💻 Tablet      [────●────] [ 3 ]
  🖥 Desktop     [──────●──] [ 5 ]
```

Zwei Verhaltensregeln, die verhindern, dass Werte unbemerkt verlorengehen:

- **Automatisches Aufklappen:** Weichen die drei Werte in bestehenden Daten bereits voneinander ab, wird die Zeile immer aufgeklappt dargestellt. Ein einzelner Regler würde die abweichenden Tablet-/Desktop-Werte sonst beim ersten Anfassen überschreiben.
- **Zuklappen vereinheitlicht:** Klappt man bewusst zu, werden alle drei Breakpoints auf den Smartphone-Wert gesetzt. Das ist die einzige Stelle, an der Zuklappen die Daten verändert — und die inhaltliche Bedeutung von „ein Wert für alle Bildschirmgrößen".

Die **abgerundeten Ecken** funktionieren nach demselben Muster: ein Regler für alle vier Ecken, aufklappbar auf die Einzelecken. Zugeklappt werden alle Ecken auf den Wert von „oben links" vereinheitlicht.

### Einstellungen zurücksetzen

Zeilen- und Zellen-Panel haben je einen Button **„Einstellungen zurücksetzen"** (Zeilen-Panel oben, Zellen-Panel in der Aktionsleiste des Untertabs *Einstellungen*). Die gerade geöffneten Sektionen bleiben dabei offen. Er setzt **ausschließlich Gestaltungswerte** auf die Standardwerte zurück: Hintergrund, Innen- und Außen-Abstände, Gap, Container/Breite, Ecken-Radien, Ausrichtung, Hover-Schatten, eigene CSS-Klasse, Animation und Verlinkung.

Unangetastet bleiben:

- **Zeile** — die Spaltenaufteilung und alle enthaltenen Zellen samt Inhalten
- **Zelle** — ihre Breite (`span`) und alle enthaltenen Module

Vor dem Zurücksetzen wird eine Bestätigung abgefragt.

### Kopieren, Einfügen, Duplizieren

Zeilen und Zellen lassen sich kopieren (`fa-copy`) und an anderer Stelle wieder einfügen (`fa-clipboard`) — die Zwischenablage liegt im `localStorage` und funktioniert damit **auch artikelübergreifend**. „Duplizieren" (`fa-clone`) legt direkt eine Kopie neben dem Original an. Beim Einfügen/Duplizieren werden alle IDs neu vergeben.

---

## Zeilen-Einstellungen

| Einstellung | Werte | Ergebnis |
|---|---|---|
| Container | `standard`, `full` | `container mx-auto px-4` / `w-full px-4` |
| Breite des Inhalts | `standard`, `full` | erzwingt `container` / `w-full` |
| Abstand oben (innen) | 0–16 pro Breakpoint | `pt-{n} md:pt-{n} lg:pt-{n}` |
| Abstand unten (innen) | 0–16 pro Breakpoint | `pb-{n} md:pb-{n} lg:pb-{n}` |
| Spalten-Gap | 0–16 pro Breakpoint | `gap-{n} md:gap-{n} lg:gap-{n}` |
| Außen oben/unten/seitl. | 0–16 pro Breakpoint | `mt-*` / `mb-*` / `mx-*` (+ `md:`/`lg:`) auf der `<section>` |
| Hintergrundfarbe | TW-Klasse | direkt als Klasse |
| Hintergrundbild | Dateiname | `background-image` Style + Focuspoint |
| Hintergrundvideo | Dateiname | `.video-docker` |
| Textausrichtung | `text-left`, `text-center`, `text-right` | direkt als Klasse |
| Mobil umkehren | bool | `pb-mobile-reverse` |
| Animation | animate.css-Klasse + Verzögerung + Dauer | `x-intersect-class.once="animate__animated …"` auf dem inneren Container (setzt animate.css + `alpinejs-intersect-class` voraus) |
| Verlinkung | interne Artikel-ID | rendert die Zeile als `<a href="…">` (ganze Zeile klickbar) statt `<div>` |

## Zellen-Einstellungen

| Einstellung | Werte | Ergebnis |
|---|---|---|
| Breite | 1–12 | `col-span-{n}` |
| Abstand oben | 0–16 pro Breakpoint | `pt-{n} md:pt-{n} lg:pt-{n}` |
| Abstand unten | 0–16 pro Breakpoint | `pb-{n} md:pb-{n} lg:pb-{n}` |
| Innen links/rechts | 0–16 pro Breakpoint | `px-{n} md:px-{n} lg:px-{n}` |
| Außen oben/unten/seitl. | 0–16 pro Breakpoint | `mt-*` / `mb-*` / `mx-*` (+ `md:`/`lg:`) auf dem Zell-Element |
| Ausrichtung vertikal | `start`, `center`, `end` | — / `flex flex-col justify-center` / `flex flex-col justify-end` |
| Abgerundete Ecken | Stufe 0–9 je Ecke (`0`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `full`) | `rounded-*` bzw. `rounded-tl-*` / `rounded-tr-*` / `rounded-bl-*` / `rounded-br-*` |
| Hintergrundfarbe | TW-Klasse | direkt als Klasse |
| Hintergrundbild | Dateiname | `background-image` Style + Focuspoint |
| Hintergrundvideo | Dateiname | `.video-docker` |
| Animation | animate.css-Klasse + Verzögerung + Dauer | `x-intersect-class.once="animate__animated …"` (setzt animate.css + `alpinejs-intersect-class` voraus) |
| Verlinkung | interne Artikel-ID | rendert die Zelle als `<a href="…">` (ganze Zelle klickbar). Wird ignoriert, wenn die übergeordnete Zeile bereits verlinkt ist |

---

## Grid-CSS in den Build-Prozess einbinden

Die Datei `assets/tw-gridbuilder-grid.css` enthält eine Tailwind-`@source inline(...)`-Safelist (damit Tailwind alle vom Pagebuilder dynamisch gebauten Utility-Klassen erzeugt) sowie die wenigen echten Custom-Klassen. Sie wird **nicht automatisch** im Frontend eingebunden.

> **Voraussetzung:** ein **Tailwind-v4-Build** im Projekt. Nur dort werden die `@source`-Direktiven ausgewertet. Ohne Tailwind-Build existieren die generierten Utility-Klassen (`.grid`, `.gap-*`, `.pt-*`, `.bg-primary-500` …) nicht — die Datei allein per `<link>` einzubinden genügt seit 2.2.0 **nicht** mehr.

### Einbindung

Die CSS-Datei per `@import` in die Tailwind-Einstiegsdatei des Projekts einbinden — **nach** `@import 'tailwindcss'`:

```css
@import 'tailwindcss';
/* … Theme-@theme-Variablen (--color-primary-500 etc.) … */
@import '/path/to/redaxo/src/addons/tw_gridbuilder/assets/tw-gridbuilder-grid.css';
```

Tailwind wertet die im Addon-CSS enthaltene `@source inline(...)`-Safelist mit aus und generiert die Utilities als echte `@layer utilities`. Die Hintergrundfarben (`bg-primary-500`, `bg-secondary-500`, `bg-neutral-*`) beziehen ihre Werte aus den `--color-*`-Theme-Variablen — eine andere Farbpalette im Theme wirkt automatisch, ohne Änderung am Addon.

Sollen weitere Farb- oder Spacing-Stufen im Backend wählbar sein, müssen deren Klassennamen sowohl in die `@source inline(...)`-Safelist (in `tw-gridbuilder-grid.css`) als auch in die entsprechenden Optionslisten in `assets/tw-gridbuilder.js` aufgenommen werden.

### Automatisches Kopieren in ein Build-Verzeichnis

Liegt die Tailwind-Einstiegsdatei nicht am Addon-Pfad, kann das Addon `tw-gridbuilder-grid.css` bei jedem Seitenaufruf automatisch in ein konfigurierbares Zielverzeichnis kopieren (nur wenn die Quelldatei neuer ist), das dann per `@import` eingebunden wird.

Einmalig konfigurieren, z.B. in der REDAXO-Konsole oder einer `install.php`:

```php
rex_addon::get('tw_gridbuilder')->setConfig(
    'css_output_path',
    rex_path::base('theme/private/css/tw-gridbuilder-grid.css')
);
```

Leer lassen oder auf `''` setzen um das Kopieren zu deaktivieren.

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
- **Spalten-Spans werden beim Verschieben/Duplizieren/Einfügen nicht normalisiert** — eine Zeile kann dadurch mehr oder weniger als 12 Spalten belegen und im Frontend umbrechen. Bewusste Entscheidung: eine automatische Korrektur würde manuell eingestellte Breiten überschreiben. Korrektur per Layout-Preset oder Resize-Handle.
- Modul-Input muss MForm-kompatibel sein
- CKEditor 5 (`cke5`) und CKEditor 4 (`ckeditor`) werden unterstützt; `redactor` und andere Rich-Text-Editoren nicht getestet

---

## Lizenz

MIT License, siehe [LICENSE.md](LICENSE.md).
