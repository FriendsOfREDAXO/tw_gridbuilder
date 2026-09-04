# Farbkontext (`data-surface`) – Konzept & Einrichtung

Der TW GridBuilder kann pro Zeile und pro Zelle ein Attribut `data-surface="…"`
ausgeben (Panel-Abschnitt **Hintergrund** → Feld **Farbkontext**). Das Attribut
allein tut nichts – es ist ein **Haken für dein Projekt-CSS**, an dem du Schrift-,
Link- und Hover-Farben passend zum Untergrund festlegst.

Dieses Dokument beschreibt das Konzept und zeigt eine fertige, **Addon-unabhängige**
Umsetzung zum Kopieren. Du brauchst dafür **kein** weiteres Addon.

> Wer das getaweb-`base`-Addon (≥ 12.4.0) einsetzt, bekommt genau dieses CSS als
> `theme/private/styles/theme-tokens.css` bereits mitgeliefert – dann ist hier
> nichts zu tun.

---

## 1. Das Problem

Farbige oder dunkle Flächen brauchen andere Schrift-/Linkfarben als der normale
Seitenhintergrund. Der übliche Weg – im Theme eine feste Liste dunkler
Hintergrund-Klassen zu pflegen:

```css
:is(.bg-black, .bg-primary-700, .bg-primary-800, .bg-primary-900, .bg-neutral-800 /* … */) .content {
  color: #fff;
}
```

… bricht bei jeder neuen Palette: Was „dunkel genug für weiße Schrift" ist, hängt
von den konkreten Farben ab, Link-Hover werden „rot auf rot", die Liste veraltet.

**Lösung:** Die Fläche sagt, *welche Rolle* sie hat (`data-surface="inverse"`), und
**eine** CSS-Regel setzt daraufhin die passenden Farben. Kein Nachpflegen von
Klassenlisten mehr.

---

## 2. Was der GridBuilder ausgibt

| Auswahl im Panel | Attribut | gedachte Bedeutung |
|---|---|---|
| Automatisch (Default) | *keins* | unverändertes Markup – dein bisheriges CSS greift weiter |
| Hell (zurücksetzen) | `data-surface="base"` | heller Standardgrund (z. B. innerhalb einer dunklen Elternzeile) |
| Abgesetzt / hell | `data-surface="alt"` | leicht abgesetzte helle Fläche (Cards, Sektionswechsel) |
| Dunkel (invers) | `data-surface="inverse"` | dunkle Fläche, helle Schrift |
| Primärfarbe | `data-surface="primary"` | Fläche in der Primär-Markenfarbe |
| Sekundärfarbe | `data-surface="secondary"` | Fläche in der Sekundär-Markenfarbe |

- Bei **Zeilen** sitzt das Attribut auf demselben Element wie der Hintergrund:
  `<section>` bei „Volle Browserbreite", sonst der innere Container.
- Bei **Zellen** auf dem Zell-Element (`<div class="twgb-cell …">`).
- „Automatisch" gibt **kein** Attribut aus – die Ausgabe ist dann identisch zu
  Versionen vor 2.20.0.

Das Feld **Hintergrundfarbe** (`bg-*`-Utility) und **Farbkontext** (`data-surface`)
sind unabhängig. `bg` malt den Hintergrund, `data-surface` steuert die Schrift.

---

## 3. Der CSS-Vertrag

Dein Projekt-CSS muss für jeden `data-surface`-Wert drei Dinge bereitstellen:

1. eine **Vordergrundfarbe** (Fließtext, Überschriften),
2. eine **Linkfarbe** + **Link-Hover-Farbe**,
3. optional eine **Hintergrundfarbe** für die Fläche selbst.

Umgesetzt über CSS-Custom-Properties, die kaskadieren:

| Property | Zweck |
|---|---|
| `--surface-fg` | Schriftfarbe innerhalb der Fläche |
| `--surface-link` | Linkfarbe innerhalb der Fläche |
| `--surface-link-hover` | Link-Hover innerhalb der Fläche |
| `--surface-bg` | Hintergrund der Fläche (optional) |

---

## 4. Fertige Umsetzung – Tailwind v4

In deine zentrale CSS-Datei (die mit `@import "tailwindcss";`). Passe nur den
`@theme`-Block an deine Marke an.

```css
@theme {
  /* ---- pro Projekt anpassen ------------------------------------------ */
  --color-primary:   #256EB5;
  --color-secondary: #ffc02b;

  /* Schrift/Icons AUF der jeweiligen Fläche.
     Regel: dunkle Fläche → helle Schrift, helle Fläche → dunkle Schrift. */
  --color-on-primary:   #ffffff;
  --color-on-secondary: #141414;   /* Gelb ist hell → dunkle Schrift */

  --color-surface:            #ffffff;
  --color-surface-alt:        #f5f4f1;
  --color-surface-inverse:    #141414;
  --color-on-surface:         #1c1c1c;
  --color-on-surface-alt:     #1c1c1c;
  --color-on-surface-inverse: #ffffff;
}

/* ---- ab hier projektunabhängig ------------------------------------------ */

:root {
  --surface-bg:         var(--color-surface);
  --surface-fg:         var(--color-on-surface);
  --surface-link:       var(--color-primary);
  --surface-link-hover: color-mix(in oklab, var(--color-primary), black 12%);
}

[data-surface="base"] {
  --surface-bg: var(--color-surface);
  --surface-fg: var(--color-on-surface);
  --surface-link: var(--color-primary);
  --surface-link-hover: color-mix(in oklab, var(--color-primary), black 12%);
}
[data-surface="alt"] {
  --surface-bg: var(--color-surface-alt);
  --surface-fg: var(--color-on-surface-alt);
}
[data-surface="inverse"] {
  --surface-bg:         var(--color-surface-inverse);
  --surface-fg:         var(--color-on-surface-inverse);
  --surface-link:       var(--color-on-surface-inverse);
  --surface-link-hover: color-mix(in oklab, var(--color-on-surface-inverse), transparent 22%);
}
[data-surface="primary"] {
  --surface-bg:         var(--color-primary);
  --surface-fg:         var(--color-on-primary);
  --surface-link:       var(--color-on-primary);
  --surface-link-hover: color-mix(in oklab, var(--color-on-primary), transparent 22%);
}
[data-surface="secondary"] {
  --surface-bg:         var(--color-secondary);
  --surface-fg:         var(--color-on-secondary);
  --surface-link:       var(--color-on-secondary);
  --surface-link-hover: color-mix(in oklab, var(--color-on-secondary), transparent 22%);
}

/* Fläche + Inhalt einfärben.
   Passe „.content" an deinen Redaktionsinhalts-Wrapper an. */
[data-surface] {
  background-color: var(--surface-bg);
  color: var(--surface-fg);
}
[data-surface] :is(.content, .content *) {
  color: var(--surface-fg);
}
[data-surface] .content a:not(.linkbutton__element) {
  color: var(--surface-link);
  text-decoration-color: color-mix(in oklab, currentColor, transparent 55%);
}
[data-surface] .content a:not(.linkbutton__element):hover {
  color: var(--surface-link-hover);
  text-decoration-color: currentColor;
}
```

### Optional: `bg`-Feld nicht doppelt setzen

Wenn du `data-surface="primary|secondary|inverse"` nutzt, malt die Regel oben den
Hintergrund bereits. Setzt du im Panel **zusätzlich** eine „Hintergrundfarbe"
(`bg-*`), gewinnt die Tailwind-Utility – lass das `bg`-Feld dann auf „Transparent".

### Optional: Kompat-Shim für bestehende dunkle `bg-*`-Flächen

Damit Bestandszeilen, die noch per dunkler `bg-*`-Klasse (statt `data-surface`)
gebaut sind, denselben Schrift-Kontext bekommen:

```css
:where(.bg-black, .bg-primary-700, .bg-primary-800, .bg-primary-900,
       .bg-secondary-700, .bg-secondary-800, .bg-secondary-900,
       .bg-neutral-800, .bg-neutral-900, .bg-gray-800, .bg-gray-900) {
  --surface-fg:         var(--color-on-surface-inverse);
  --surface-link:       var(--color-on-surface-inverse);
  --surface-link-hover: color-mix(in oklab, var(--color-on-surface-inverse), transparent 22%);
  color: var(--surface-fg);
}
```

`:where()` hat Spezifität 0 – explizite `data-surface`-Angaben und Utilities
gewinnen. Nur Klassen aufnehmen, die bei **jeder** Palette dunkel sind.

---

## 5. Fertige Umsetzung – ohne Tailwind (reines CSS)

Gleiches Prinzip, ohne `@theme` und ohne `color-mix` (breitere Browser-Abdeckung):

```css
:root {
  --color-primary:   #256eb5;
  --color-secondary: #ffc02b;
  --color-on-primary:   #ffffff;
  --color-on-secondary: #141414;

  --color-surface:            #ffffff;
  --color-surface-alt:        #f5f4f1;
  --color-surface-inverse:    #141414;
  --color-on-surface:         #1c1c1c;
  --color-on-surface-inverse: #ffffff;

  /* Hover-Farben hier einmal von Hand festlegen */
  --primary-hover:   #1e5b96;
  --secondary-hover: #d9a316;

  --surface-bg:         var(--color-surface);
  --surface-fg:         var(--color-on-surface);
  --surface-link:       var(--color-primary);
  --surface-link-hover: var(--primary-hover);
}

[data-surface="alt"]     { --surface-bg: var(--color-surface-alt); }
[data-surface="inverse"] { --surface-bg: var(--color-surface-inverse); --surface-fg: var(--color-on-surface-inverse); --surface-link: #fff; --surface-link-hover: #d0d0d0; }
[data-surface="primary"]   { --surface-bg: var(--color-primary);   --surface-fg: var(--color-on-primary);   --surface-link: var(--color-on-primary);   --surface-link-hover: rgba(255,255,255,.8); }
[data-surface="secondary"] { --surface-bg: var(--color-secondary); --surface-fg: var(--color-on-secondary); --surface-link: var(--color-on-secondary); --surface-link-hover: rgba(20,20,20,.75); }

[data-surface] { background-color: var(--surface-bg); color: var(--surface-fg); }
[data-surface] .content, [data-surface] .content * { color: var(--surface-fg); }
[data-surface] .content a { color: var(--surface-link); }
[data-surface] .content a:hover { color: var(--surface-link-hover); }
```

---

## 6. On-Farben richtig wählen

Der `--color-on-*`-Wert ist die Schrift **auf** dieser Fläche. Faustregel:

- dunkle Markenfarbe → `#ffffff`
- helle Markenfarbe (Gelb, Hellgrün, Pastell) → `#141414` o. ä.

Prüfen mit einem Kontrast-Checker: **≥ 4.5:1** für Fließtext, **≥ 3:1** für große
Schrift und UI-Elemente. Falsche On-Farbe = genau das „unlesbar"-Problem, das
`data-surface` verhindern soll.

---

## 7. Buttons

Wenn dein Projekt eine Button-Komponente hat (z. B. das Linkbutton-Modul), stelle
deren Farb-Varianten ebenfalls auf die Tokens um, statt fixer Klassen:

```css
.btn-primary       { background: var(--color-primary);   color: var(--color-on-primary); }
.btn-primary:hover { background: color-mix(in oklab, var(--color-primary), black 12%); }
```

Dann sind Buttontexte bei jeder Palette lesbar – nicht nur der Grid-Inhalt.

---

## 8. Testseite

Beim Projektstart einmal eine Seite mit allen Kombinationen bauen:

```
Pro Farbkontext { Automatisch, alt, inverse, primary, secondary }:
  ├ Fließtext + Link + Link:hover
  ├ Überschrift
  └ Button primary / secondary (+ :hover), falls vorhanden
```

10 Sekunden drüberschauen – alle Lesbarkeitsprobleme werden sofort sichtbar.

---

## 9. Ohne dieses CSS

Ist im Projekt kein `data-surface`-CSS hinterlegt, hat das Attribut **keine
Wirkung** (kein Fehler). Die Panel-Auswahl „Automatisch" verhält sich exakt wie
frühere GridBuilder-Versionen.
