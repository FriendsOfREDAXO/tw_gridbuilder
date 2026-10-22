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

## Updatehinweis für 2.21.0

Neues, optionales **Frontend-Editing** (standardmäßig aus, siehe Abschnitt „Frontend-Editing“).
Das JSON-Format in `REX_VALUE[1]` ist unverändert, es findet keine Datenmigration statt. Bestehende
Seiten rendern nach dem reinen AddOn-Update unverändert weiter.

Damit das Frontend-Editing funktioniert, bitte in der bestehenden GridBuilder-Moduldefinition
**„0100 – Standard (TW GridBuilder)“** den **Output** durch `module/output.php` (Modulversion **2.21.0**)
ersetzen – nur den Code ersetzen, das Modul nicht löschen oder neu anlegen. Ohne diese Aktualisierung und
ohne aktivierte Config ändert sich nichts. Projektspezifische Anpassungen am Output vorher prüfen: Neu ist
nur der Slot-Wrapper im Frontend-Zweig (`Frontend::open(...)`).

## Updatehinweis für 2.14.0

Die gespeicherten Inhalte sind vollständig abwärtskompatibel: Das JSON-Format
in `REX_VALUE[1]` wurde nicht geändert und es findet keine Datenmigration statt.
Bestehende Seiten rendern nach dem reinen AddOn-Update weiterhin mit ihrer
bisherigen GridBuilder-Moduldefinition.

Damit eingebettete Module den neuen `$twgbContext` erhalten, müssen anschließend
jedoch **Input und Output der bestehenden GridBuilder-Moduldefinition auf
Modulversion 2.10.0 aktualisiert** werden:

1. Vorhandenes Modul **„0100 – Standard (TW GridBuilder)“** im REDAXO-Backend öffnen.
2. Den Input durch `module/input.php` und den Output durch `module/output.php` aus diesem AddOn ersetzen.
3. Das vorhandene Modul speichern – **nicht löschen, nicht neu anlegen und weder Modul-ID noch Modul-Key ändern**.

Der Austausch ändert ausschließlich den Code der Moduldefinition. Die vorhandene
Modul-ID, alle `rex_article_slice`-Datensätze und das darin gespeicherte
GridBuilder-JSON bleiben erhalten. Es gehen daher keine bestehenden Inhalte
verloren. Projektspezifische Änderungen an der bisherigen Moduldefinition sollten
vor dem Ersetzen geprüft und bei Bedarf in die neue Vorlage übernommen werden.

Ohne Austausch bleibt die Website funktionsfähig; lediglich `$twgbContext` steht
in eingebetteten Modulen noch nicht zur Verfügung.

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
| [fluid-tailwindcss](https://www.npmjs.com/package/fluid-tailwindcss) | Optionales, fließendes Seitengutter für Standard- und Full-Width-Inhalte | Standardmäßig deaktiviert; ohne Plugin bleibt die bisherige Ausgabe mit `px-4` unverändert |

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
│   ├── tw-gridbuilder-grid.css    # Safelist (@source) + Custom-CSS; benötigt Tailwind-v4-Build
│   ├── tw-gridbuilder-fe.js       # Frontend-Editing (Button, Panel, Live-Vorschau, Pickers, CKEditor)
│   └── tw-gridbuilder-fe.css      # Styles des Frontend-Editing-Panels (liegt im Shadow DOM/iframe)
├── lib/
│   ├── TwGridBuilderApi.php       # AJAX-API: Modul-Formulare & Previews
│   ├── TwGridBuilderHelper.php    # REX_VALUE/REX_MEDIA Token-Auflösung
│   ├── TwGridBuilderFrontend.php  # Frontend-Editing: Aktivierung, Modul-Flag, Slot-Wrapper, Assets
│   └── TwGridBuilderFrontendApi.php # Frontend-Editing: API `twgb_fe` (Formular, Vorschau, Speichern, Medien-/Artikelsuche)
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

### Laufzeitkontext eingebetteter Module: `$twgbContext`

Ein im GridBuilder platziertes Modul ist kein eigener `rex_article_slice`. Sein
Output erhält deshalb weder eine eigene `REX_SLICE_ID` noch einen verlässlich
verfügbaren REDAXO-Renderer über `$this`. Stattdessen stellt der GridBuilder in
der Ausgabe jedes eingebetteten Moduls das dokumentierte Array
`$twgbContext` bereit. Es ist im Frontend, in der Backend-Ausgabe sowie in den
serverseitigen und per AJAX geladenen Vorschauen verfügbar.

| Schlüssel | Typ | Bedeutung |
|---|---:|---|
| `parent_slice_id` | `int|null` | ID des echten GridBuilder-Slices; beim Anlegen eines noch nicht gespeicherten Slices `null` |
| `article_id` | `int` | Aktuelle REDAXO-Artikel-ID |
| `clang_id` | `int` | Aktuelle Sprach-ID |
| `ctype_id` | `int` | Aktuelle Ctype-ID |
| `row_id` | `string` | Stabile ID der Zeile aus dem GridBuilder-JSON |
| `cell_id` | `string` | Stabile ID der Zelle aus dem GridBuilder-JSON |
| `slot_id` | `string` | Stabile ID des konkreten Modulslots aus dem GridBuilder-JSON |
| `module_id` | `int` | ID der verwendeten REDAXO-Moduldefinition |

Beispiel in der Ausgabe eines GridBuilder-kompatiblen Inhaltsmoduls:

```php
<?php
$context = $twgbContext ?? [];
$slotId = (string) ($context['slot_id'] ?? 'standalone');
$parentSliceId = $context['parent_slice_id'] ?? null;

// Innerhalb eines Artikels eindeutiger und über erneutes Rendern stabiler DOM-Hook.
$domId = 'teaser-' . ($parentSliceId ?? 'new') . '-' . $slotId;
?>
<section id="<?= rex_escape($domId) ?>">
    <!-- Modulausgabe -->
</section>
```

`parent_slice_id` bezeichnet ausdrücklich den umgebenden GridBuilder-Slice,
nicht einen Slice des eingebetteten Moduls. Für eine eindeutige Instanz sollte
`slot_id` verwendet und bei seitenweiten DOM-IDs mit `parent_slice_id`
kombiniert werden. Die Kontextwerte sind Laufzeitinformationen und dürfen nicht
als Ersatz für Berechtigungsprüfungen verwendet werden. Mit dem Fallback
`$twgbContext ?? []` bleibt ein Modul auch außerhalb des GridBuilders nutzbar.

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

### Farbkontext (`data-surface`)

Zeilen und Zellen können im Panel-Abschnitt **„Hintergrund"** einen **Farbkontext**
setzen. Er gibt auf dem Element ein `data-surface="…"`-Attribut aus. Das Attribut
allein bewirkt nichts – es ist ein **Haken für dein Projekt-CSS**, an dem du
Schrift-, Link- und Hover-Farben passend zum Untergrund festlegst.

**Zweck:** Bei farbigen oder dunklen Flächen war die Lesbarkeit bisher davon
abhängig, dass das Projekt-CSS jede in Frage kommende `bg-*`-Klasse als „dunkel"
kannte (fest verdrahtete Selektor-Liste). Bei einer neuen Palette brach das
regelmäßig – weiße Schrift auf hellem Grund, unsichtbare Link-Hover. Mit
`data-surface` **deklariert die Fläche ihre Rolle**, und eine einzige CSS-Regel
setzt die Farben – ohne feste Farbwert-Listen.

| Auswahl | Attribut | gedachte Bedeutung |
|---|---|---|
| **Automatisch** (Default) | *keins* | Unverändertes Markup, dein bisheriges CSS greift weiter. |
| Hell (zurücksetzen) | `data-surface="base"` | Heller Standardgrund, z. B. in einer dunklen Elternzeile. |
| Abgesetzt / hell | `data-surface="alt"` | Leicht abgesetzte helle Fläche. |
| Dunkel (invers) | `data-surface="inverse"` | Dunkle Fläche, helle Schrift + Links. |
| Primärfarbe | `data-surface="primary"` | Fläche in der Primär-Markenfarbe. |
| Sekundärfarbe | `data-surface="secondary"` | Fläche in der Sekundär-Markenfarbe. |

**Platzierung:** Bei Zeilen auf demselben Element wie der Hintergrund – `<section>`
bei „Volle Browserbreite", sonst der innere Container. Bei Zellen auf dem
Zell-Element. Serverseitige Whitelist in `pb_surface_attr()`.

**Verhältnis zu „Hintergrundfarbe" (`bg`):** unabhängige Felder. `bg` malt den
Hintergrund (Tailwind-Utility), `data-surface` steuert die Schriftfarben.

**Einrichtung im Projekt:** Konzept, CSS-Vertrag und eine fertige Umsetzung zum
Kopieren – mit und ohne Tailwind, **ohne weiteres Addon** – stehen in
[`docs/farbkontext.md`](docs/farbkontext.md). Ohne solches CSS bleibt `data-surface`
wirkungslos (kein Fehler); „Automatisch" verhält sich wie in Versionen vor 2.20.0.
Wer das getaweb-`base`-Addon (≥ 12.4.0) nutzt, bekommt dieses CSS bereits als
`theme-tokens.css` mitgeliefert.

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
| Farbkontext | `''`, `base`, `alt`, `inverse`, `primary`, `secondary` | `data-surface="…"` (leer → kein Attribut); siehe „Farbkontext" |
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
| Farbkontext | `''`, `base`, `alt`, `inverse`, `primary`, `secondary` | `data-surface="…"` auf dem Zell-Element (leer → kein Attribut); siehe „Farbkontext" |
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

### Optional: fließendes Seitengutter mit `fluid-tailwindcss`

Ab Add-on-Version 2.13.1 kann der Modul-Output statt des festen `px-4` die Utility `px-page-gutter` verwenden. Die Integration lässt sich direkt in der `boot.php` aktivieren oder deaktivieren.

1. Plugin im Theme installieren:

```bash
npm install fluid-tailwindcss
```

2. Fluid-Token in der Tailwind-Einstiegsdatei definieren:

```css
@import 'tailwindcss';
@import '/path/to/redaxo/src/addons/tw_gridbuilder/assets/tw-gridbuilder-grid.css';

@plugin "fluid-tailwindcss" {
  --spacing-page-gutter: 1.25rem/2rem;
}
```

3. Integration direkt in der Datei `boot.php` des Add-ons ein- oder ausschalten. Es gibt dafür bewusst keine Einstellungsseite:

```php
$this->setProperty('fluid_tailwind', true);
```

Zum Deaktivieren:

```php
$this->setProperty('fluid_tailwind', false);
```

Der Schalter steht gut sichtbar am Anfang von `redaxo/src/addons/tw_gridbuilder/boot.php`. Er ist eine reine Laufzeiteinstellung und verursacht keine Datenbankzugriffe. Solange die Option deaktiviert ist, wird weiterhin exakt die bisherige Klasse `px-4` ausgegeben. Wird die Option aktiviert, ohne `fluid-tailwindcss` und das Token `--spacing-page-gutter` einzubinden, fehlt das horizontale Seitengutter im Frontend.

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

## Frontend-Editing

Seit 2.21.0 können eingeloggte Backend-User Inhalte von Modulen im Grid direkt im Frontend ändern
(„Inhalte bearbeiten“). Das **Layout** (Zeilen, Zellen, Abstände, Hintergründe) bleibt dem Backend
vorbehalten. Gespeichert wird nur der geänderte Slot, per Merge in das vorhandene Layout-JSON –
das Datenformat ist unverändert und voll abwärtskompatibel.

### Aktivieren

Das Feature ist standardmäßig **aus**. Aktivieren per Addon-Config:

```php
rex_addon::get('tw_gridbuilder')->setConfig('frontend_edit', 1);
```

Ausschalten: Wert auf `0`. Ohne Config, ohne Backend-Session oder ohne Modul-Flag ändert sich an
der Ausgabe nichts. Voraussetzung: das GridBuilder-Modul **„0100 – Standard (TW GridBuilder)“** ist auf
Version 2.21.0 aktualisiert (siehe Updatehinweis unten).

### Bedienung

Im Frontend mit der Backend-Session eingeloggt sein → Button **„Inhalte bearbeiten“** (unten mittig) →
Slot anklicken → Panel mit dem Modulformular. Änderungen erscheinen sofort als **Live-Vorschau**
(ohne zu speichern); **Speichern** schreibt in die Datenbank, Schließen ohne Speichern verwirft die
Vorschau. Der Bearbeiten-Modus bleibt pro Browser-Tab erhalten, bis „Fertig“ gewählt wird.

Berechtigung: Es gelten die **Modulrechte** des Users und die **Strukturrechte** des Artikels; alle
Aufrufe sind CSRF-geschützt. Button und Panel liegen in einem Shadow DOM, das Formular in einem
iframe – das Seiten-CSS wirkt nicht hinein.

### Ein Modul für das Frontend-Editing freigeben

Nur Module mit dem Flag `frontend_edit = "1"` im Input sind im Frontend änderbar. Alle anderen
verhalten sich unverändert. Das Flag steht im Kommentarblock `base-module-config` oder – bei Modulen
ohne diesen Header – als eigener Kommentarblock mit der Zeile `frontend_edit = "1"` (eigene Zeile,
innerhalb der ersten ca. 1500 Zeichen des Inputs). Das AddOn liest es direkt aus dem gespeicherten
Modul-Input; es sind keine weiteren Dateien oder Einstellungen nötig.

**Beispiel – Modul „Hinweisbox“**

Input:

```php
<?php
/* base-module-config
modulname = "Hinweisbox"
modulkey = "Hinweisbox"
requirements = "base,mform,cke5"
status = "1"
version = "1.0.0"
frontend_edit = "1"
base-module-config
*/
/* tw_gridblock kompatibel */
use FriendsOfRedaxo\MForm;

$id = 1;

echo MForm::factory()
    ->addTextField("$id.headline", ['label' => 'Überschrift', 'full' => true])
    ->addSelectField("$id.style", ['info' => 'Info', 'warn' => 'Warnung'], ['label' => 'Stil', 'full' => true])
    ->addTextAreaField("$id.text", ['label' => 'Text', 'class' => 'cke5-editor', 'data-profile' => 'base', 'full' => true])
    ->addMediaField(1, ['label' => 'Bild', 'full' => true])
    ->addCustomLinkField(2, ['label' => 'Link', 'data-intern' => 'enable', 'data-extern' => 'enable', 'full' => true])
    ->show();
```

Output (unverändert zu jedem anderen GridBuilder-Modul, `REX_VALUE[1]` enthält die Textfelder,
`REX_MEDIA[1]` das Bild, `REX_VALUE[2]` den Link):

```php
<?php
$box   = rex_var::toArray('REX_VALUE[1]');
$image = 'REX_MEDIA[1]';
$link  = 'REX_VALUE[2]';
?>
<div class="hinweisbox hinweisbox--<?= rex_escape($box['style'] ?? 'info') ?>">
    <h3><?= rex_escape($box['headline'] ?? '') ?></h3>
    <?= $box['text'] ?? '' ?>
</div>
```

Das Modul muss dafür **nichts weiter wissen**: kein eigenes JavaScript, kein Frontend-Zweig.

### Unterstützte Felder

| Feld | Im Frontend |
|---|---|
| Text, Zahl, E-Mail, Datum | ja |
| Textarea | ja; mit Klasse `cke5-editor` als **CKEditor 5** (siehe unten) |
| Select, Radio, Checkbox | ja (Select als einfache Auswahlliste, kein Bootstrap-Select) |
| Spalten, Fieldsets, Hinweistexte | ja (Spalten: verschachtelte Spalten stehen nebeneinander, äußere untereinander) |
| MForm-Tabs | ja – die Tabs stehen **untereinander**, der Tab-Titel dient als Überschrift |
| MForm-Flex-Repeater | ja – als Listen-Editor (Karten mit Hinzufügen, Verschieben ↑↓, Entfernen); Format (Liste und `__v`-Hülle) und unbekannte Felder pro Eintrag bleiben erhalten |
| Medienfeld (`addMediaField`) | ja – Auswahl aus dem Medienpool (nur Bilder, Suche, Kategorie-Filter, „Mehr laden“; es zählen die Medienpool-Rechte des Users) |
| Linkfeld (`addCustomLinkField`) | ja – freie URL / `mailto:` / `tel:` tippen oder einen Online-Artikel wählen (Wert `redaxo://ID`) |
| Medienliste, Linkliste, verschachtelte Repeater | nein – erscheinen nicht im Panel, die gespeicherten Werte bleiben aber erhalten |
| Eigenes JavaScript im Input (`<script>`) | nein – Skripte laufen im Panel nicht |

**Einzelne Felder ausblenden:** Ein Feld mit dem Attribut `'data-fe' => '0'` erscheint im Frontend
nicht; sein gespeicherter Wert bleibt beim Speichern erhalten (es wird immer *gemerged*, nie ersetzt).

```php
->addTextField("$id.css_class", ['label' => 'CSS-Klasse', 'data-fe' => '0'])
```

**Hinweis zu Modulen mit JavaScript-Logik** (z. B. Felder, die per Skript ein-/ausgeblendet werden):
Im Frontend sind dann alle Felder sichtbar. Solche Module besser nicht freigeben oder die
betroffenen Felder mit `data-fe="0"` ausblenden.

### Besonderheiten bei CKEditor 5 (`cke5-editor`)

- **Derselbe Editor wie im Backend:** Textfelder mit der Klasse `cke5-editor` bekommen im Frontend den
  echten cke5-Editor mit dem **Profil aus `data-profile`** (Toolbar, Tabellen, Farben, Listen, Links …).
  Es wird dazu derselbe Stack wie im Backend geladen (jQuery, CKEditor-Build, Übersetzungen, die
  cke5-Plugins, `cke5profiles.js`, `cke5.js`), und zwar lazy, nur im iframe des Panels und nur, wenn
  das Formular ein solches Feld enthält (rund 2 MB beim ersten Öffnen). Da das Profil gilt, entspricht das
  gespeicherte HTML dem aus dem Backend – eigene Profile funktionieren ohne Anpassung.
- **Voraussetzung:** das cke5-AddOn ist installiert und aktiv. Ohne cke5 (oder wenn der Editor nicht laden
  kann) bleibt das Feld eine einfache Textarea mit dem rohen HTML; im Panel erscheint ein Hinweis.
- **Was im Frontend nicht geht:** Funktionen, die ein Backend-Fenster öffnen – z. B. interne Links über die
  Linkmap (`rexlink`), Bilder aus dem Medienpool, Snippets. Externe Links, Formatierung, Tabellen und
  Farben funktionieren. Wer interne Verlinkungen oder Medien im Text pflegt, nutzt dafür das Backend.
- Die Live-Vorschau läuft bei jeder Änderung; der Inhalt wird beim Speichern aus dem Editor übernommen.

### Rückbau

Config `frontend_edit` auf `0` setzen (oder das Flag aus dem Modul-Input entfernen). Es werden keine
Daten verändert, die gespeicherten Inhalte bleiben unberührt.

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
