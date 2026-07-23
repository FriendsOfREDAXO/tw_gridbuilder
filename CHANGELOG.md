# Changelog — TW GridBuilder

## [2.8.1] — 2026-07-23

### UI
- **Aktions-Icons klar erkennbar**: Die zuvor schwer lesbaren Unicode-Glyphen (`⧉ ❐ ⇩ ↑ ↓ ✕ ⚙ ⊞`) in Zeilen-Header, Zell-Aktionen, Modul-Slots und Panel-Kopf durch einheitliche **Font-Awesome-Icons** ersetzt (`fa-cog`, `fa-eye`, `fa-clone`, `fa-copy`, `fa-clipboard`, `fa-arrow-up/down`, `fa-trash`, `fa-times`, `fa-th-large`).
- Icon-Buttons: kräftigerer Kontrast (volle Textfarbe statt gedämpft), etwas größere Klickfläche (30px), Hover mit Akzent-Fläche; Löschen/Schließen mit Danger-Hover. Alle Buttons haben jetzt `title` + `aria-label`.
- Nur JS/CSS betroffen — kein Modul-Update, kein CSS-Rebuild nötig.

## [2.8.0] — 2026-07-23

### Neu
- **Außen-Abstände (margin) für Zeilen und Zellen** — analog zu den Innen-Abständen: eigene Panel-Gruppe „Außen-Abstände" mit **Abstand oben / unten / links-rechts**, jeweils responsiv über drei Breakpoints (Smartphone / Tablet / Desktop). Default überall = 0.
- Erzeugt `mt-*` / `mb-*` / `mx-*` (+ `md:` / `lg:`-Varianten). Bei **Zeilen** liegt der Außenabstand auf der `<section>` (oben/unten wirkt zwischen Zeilen, links/rechts rückt die ganze Zeile ein), bei **Zellen** auf dem Zell-Element.
- Neuer wiederverwendbarer UI-Baustein `RESP_RANGE()` für responsive 3-Breakpoint-Regler (reduziert doppeltes Panel-Markup).
- Backend-Struktur- und Editor-Vorschau zeigen die gesetzten Außen-Abstände (`M↑ / M↓ / M↔` im Editor, „Außen-Abstand"-Tag in der Struktur).

### ⚠️ Nach dem Update erforderlich
- **CSS neu bauen** (`npm run build`) — die Safelist in `tw-gridbuilder-grid.css` wurde um `mt` / `mb` / `mx` erweitert (`@source inline(...)`), damit Tailwind die neuen Utility-Klassen erzeugt.
- **Modul aktualisieren!** Der neue `module/output.php` (margin-Klassen auf Section/Zelle) muss in die REDAXO-Modul-Definition übernommen werden (Backend → Module → „Standard (TW GridBuilder)").

### Migration / Kompatibilität — 100 % abwärtskompatibel
- Alle neuen Felder (`mt`/`mb`/`mx` + `_md`/`_lg`) sind rein additiv, Default `'0'`. Fehlen sie in alten Daten, wird keine margin-Klasse ausgegeben — unveränderte Darstellung.

## [2.7.1] — 2026-07-23

### Fix
- **Linkmap-Popup schließt sich nach der Auswahl** einer Zielseite jetzt korrekt. Ursache: Die REDAXO-Linkmap setzt nach Auswahl `getElementById('REX_LINK_<id>').value` und ruft anschließend `self.close()`; da das Panel kein solches DOM-Feld nutzt (die Werte kommen aus dem `rex:selectLink`-Event), schlug das `getElementById` fehl und `self.close()` wurde nie erreicht. Fix: `event.preventDefault()` im Handler (offizieller REDAXO-Hook) — das Panel übernimmt Feld-Setzen und Fenster-Schließen selbst. Nur JS betroffen, kein Modul-Update nötig.

## [2.7.0] — 2026-07-23

### Neu
- **Ganze Zeile / Zelle verlinken** (interner Link): neues Feld „Verlinkung" in Zeilen- und Zellen-Panel. Auswahl der Zielseite über das REDAXO-Struktur-Popup (Linkmap). Default = keine Verlinkung.
- Ist ein Link gesetzt, rendert das Modul den betreffenden Block als `<a href="…">` statt `<div>` — die **komplette Zeile bzw. Zelle wird klickbar**. Bei Zeilen wird der innere Container zusätzlich `block`, damit Breite/Zentrierung erhalten bleibt.
- Backend-Struktur- und Editor-Vorschau zeigen einen Link-Tag (`<i class="fa fa-link"></i>` inkl. Artikelname bei Zeilen).

### ⚠️ Hinweis zur Verwendung
- **Nur für Blöcke ohne eigene Links/Buttons** im Inhalt — verschachtelte `<a>` sind ungültiges HTML. Enthält eine verlinkte Zeile/Zelle ein Modul mit eigenem Link, ist das Ergebnis unzuverlässig.
- Schutz gegen doppelte Verschachtelung: Ist eine **Zeile** verlinkt, werden Links einzelner **Zellen** dieser Zeile im Output ignoriert.

### ⚠️ Nach dem Update erforderlich
- **Modul aktualisieren!** Der neue `module/output.php` (Helfer `pb_link_href()` + `<a>`/`<div>`-Umschaltung) muss in die REDAXO-Modul-Definition übernommen werden (Backend → Module → „Standard (TW GridBuilder)").

### Migration / Kompatibilität — 100 % abwärtskompatibel
- Die neuen Felder (`link`, `link_label`) sind rein additiv, Default `''`. Fehlen sie in alten Daten, rendert der Block wie bisher als `<div>` — keine Darstellungsänderung.
- Serverseitige Absicherung: `pb_link_href()` akzeptiert nur numerische Artikel-IDs (auch `redaxo://ID`) und löst sie über `rex_getUrl()` auf; ungültige Werte ergeben keinen Link.

## [2.6.0] — 2026-07-23

### Neu
- **Animationen für Zeilen und Zellen** (animate.css): neue Panel-Gruppe „Animation" mit drei Feldern — **Art der Animation** (gruppiertes Dropdown: Fade / Zoom / Slide / Back / Flip / Spezial), **Verzögerung** (0–5 s) und **Dauer** (Standard / langsam / schnell …). Default überall = keine Animation.
- Die Animation wird im Frontend **einmalig beim Sichtbarwerden** ausgelöst (`x-data x-intersect-class.once="animate__animated …"`). Bei Zeilen liegt sie auf dem **inneren Container** (Element mit Hintergrund/Ecken), bei Zellen auf der Zelle selbst.
- Backend-Struktur- und Editor-Vorschau zeigen einen Animations-Tag (`<i class="fa fa-magic"></i> fadeInUp`).

### Voraussetzung
- **animate.css** und das Alpine-Plugin **alpinejs-intersect-class** müssen im Theme vorhanden/registriert sein (siehe README → „Abhängigkeiten / Frontend"). Fehlt eines, bleibt das ausgegebene Attribut wirkungslos; das Grid rendert normal ohne Animation.

### ⚠️ Nach dem Update erforderlich
- **Modul aktualisieren!** Der neue `module/output.php` (Helfer `pb_anim_attr()` + Attribut-Ausgabe) muss in die REDAXO-Modul-Definition übernommen werden (Backend → Module → „Standard (TW GridBuilder)"). Solange das Modul nicht aktualisiert ist, werden Animationen nicht ausgegeben.
- Kein CSS-Rebuild nötig: `animate__*`-Klassen stammen aus animate.css (extern), nicht aus dem Tailwind-Build.

### Migration / Kompatibilität — 100 % abwärtskompatibel
- Die drei neuen Felder (`anim`, `anim_delay`, `anim_duration`) sind rein additiv, Default `''`. Fehlen sie in alten Daten, wird exakt das bisherige Verhalten gerendert — kein Attribut, keine Darstellungsänderung.
- Serverseitige Absicherung: `pb_anim_attr()` lässt nur `animate__[A-Za-z]+`-Klassen, Delay `1–5` und die vier bekannten Dauer-Klassen durch (keine Attribut-Injection).

## [2.5.0] — 2026-07-22

### Neu
- **Panel verbreitert** (680px → 860px) und Felder für Zeilen **und** Zellen neu strukturiert: Hintergrund (Farbe/Bild/Video) steht jetzt nebeneinander in einer Reihe, ebenso Text- und vertikale Ausrichtung — deutlich kompakter, weniger Scrollen.
- **„Schatten bei Hover"**: neuer Schieberegler-Toggle (wie „Mobil umkehren") für Zeilen und Zellen — fügt `hover:shadow-xl transition-shadow duration-300` hinzu.
- **Eigene CSS-Klasse**: neues Freitextfeld für Zeilen und Zellen, um zusätzliche, projektspezifische Klassen zu ergänzen. Wird sowohl im Browser (Whitelist-Filter beim Tippen) als auch serverseitig (`pb_custom_class()`) auf klassentaugliche Zeichen beschränkt (Buchstaben, Ziffern, Leerzeichen, `-_:`) — verhindert Markup-/Attribut-Injection.
- Neue Gruppe „Effekte & Erweitert" im Panel für beide Bereiche.

### ⚠️ Nach dem Update erforderlich
- **Modul aktualisieren!** Der Modul-Output/-Input muss nach dem Addon-Update in die REDAXO-Modul-Definition übernommen werden (Backend → Module → „Standard (TW GridBuilder)", Code aus `module/output.php` + `module/input.php` einspielen). Solange das Modul nicht aktualisiert ist, greifen weder die neuen Ecken (bereits mit 2.4.0 eingeführt) noch Hover-Schatten/eigene CSS-Klasse.
- **CSS neu bauen** (`npm run build`) — `hover:shadow-xl transition-shadow duration-300` ist über `@source inline(...)` in der Addon-eigenen `tw-gridbuilder-grid.css` safegelistet.

### Migration / Kompatibilität — 100 % abwärtskompatibel
- Beide neuen Felder (`shadow_hover`, `custom_class`) sind rein additiv, Default `false` / `''`. Fehlen sie in alten Daten, wird exakt das bisherige Verhalten gerendert — keine zusätzliche Klasse, keine Darstellungsänderung.
- Geprüft: alte Slices ohne diese Felder rendern unverändert; ein `<script>`-Injection-Versuch im Freitextfeld wird zu reinem Text bereinigt.

## [2.4.0] — 2026-07-22

### Neu
- **Abgerundete Ecken pro Ecke** für Zeilen **und** Zellen: Statt der bisherigen An/Aus-Checkbox (`rounded-lg`) gibt es jetzt Schieberegler entlang der Tailwind-v4-Skala (0 → `xs` → `sm` → `md` → `lg` → `xl` → `2xl` → `3xl` → `4xl` → `full`, Standard 0). Jede Ecke (oben links, oben rechts, unten links, unten rechts) ist einzeln steuerbar, plus ein „Alle Ecken"-Regler, der alle vier gleichzeitig setzt. Bei gesetztem Radius mit Hintergrundbild/-video wird automatisch `overflow-hidden` ergänzt, damit der Hintergrund sauber beschnitten wird.

### ⚠️ Nach dem Update erforderlich
- **Modul aktualisieren!** Der Modul-Output/-Input muss nach dem Addon-Update in die REDAXO-Modul-Definition übernommen werden (Backend → Module → „Standard (TW GridBuilder)", Code aus `module/output.php` + `module/input.php` einspielen). Solange das Modul nicht aktualisiert ist, werden die neuen abgerundeten Ecken **nicht gerendert** (die Slider im Editor funktionieren dennoch).
- **CSS neu bauen** (`npm run build`), damit die per-Ecke-Klassen im kompilierten CSS enthalten sind (siehe unten).

### Migration / Kompatibilität — 100 % abwärtskompatibel
- **Bestehende Inhalte bleiben unverändert.** Alte Zellen ohne Radius-Angabe rendern exakt wie zuvor (keine Ecken). Alte Zellen mit der früheren Checkbox (`rounded: true`) werden automatisch auf alle Ecken = `lg` gesetzt — **visuell identisch** zum bisherigen `rounded-lg`. Kein Datenverlust, keine geänderte Darstellung bestehender Seiten.
- Neue Felder sind rein additiv (`radius_tl/tr/bl/br`); fehlen sie in alten Daten, wird 0 (keine Ecke) angenommen.
- Die 36 per-Ecke-Klassen (`rounded-{tl,tr,bl,br}-{xs…full}`) sind über `@source inline(...)` in `theme/private/styles/app.css` safegelistet (Tailwind v4).

## [2.3.4] — 2026-07-22

### Verbessert
- **Zeilen-Kopfzeile vereinheitlicht**: Alle Buttons (Spaltenzahl 1–6, Layout-Presets, ⚙ und Aktions-Icons) sind jetzt gleich hoch (28px); die Icon-Glyphen sind heller und etwas größer (16px) und dadurch deutlich besser erkennbar.
- **Zell-Aktionsleiste** im Panel rechtsbündig mit etwas Abstand zum Rand.

## [2.3.1] — 2026-07-22

### Neu
- **Zellen duplizieren / kopieren / einfügen**: Im Zellen-Panel gibt es eine Aktionsleiste — „Duplizieren" (klont die Zelle inkl. Module als neue Spalte in derselben Zeile), „Kopieren" (in die Zwischenablage, auch für andere Artikel/Instanzen) und „Einfügen" (fügt die kopierte Zelle als neue Spalte ein; erscheint nur, wenn etwas kopiert wurde). Eigener `localStorage`-Key `twgb_clipboard_cell_v1` → kollisionsfrei.
- **Toast-Bestätigung beim Kopieren**: Kurze Einblendung („Zeile kopiert" / „Zelle kopiert"), damit klar ist, dass der Kopiervorgang geklappt hat.

### Verbessert
- **Icon-Buttons besser lesbar**: Glyphen in den Icon-Buttons (Zeilen-/Modul-Aktionen) heller (`--pb-text-2`, Hover volle Textfarbe) und minimal größer (13→15px). Die Button-Größe bleibt gleich (kompensiert über `line-height`/Padding).

## [2.3.0] — 2026-07-22

### Neu
- **Zeilen duplizieren**: Neuer Button (⧉) in der Zeilen-Kopfzeile klont die komplette Zeile inkl. aller Spalten, Module und Werte direkt darunter (mit frisch generierten IDs).
- **Module duplizieren**: In der Modul-Liste einer Zelle klont ⧉ das gewählte Modul inkl. aller Feldwerte.
- **Zeilen kopieren & einfügen — auch artikel-/instanzübergreifend**: ❐ kopiert eine Zeile in eine Zwischenablage, ⇩ fügt sie in einer beliebigen anderen GridBuilder-Instanz (anderer Slice/Artikel) ein. Umgesetzt über einen eigenen, versionierten `localStorage`-Key (`twgb_clipboard_row_v1`) — **kollisionsfrei** gegenüber bloecks, MForm & anderen Addons, da rein im GridBuilder-eigenen Datenmodell. Der Einfügen-Button erscheint nur, wenn etwas in der Zwischenablage liegt.

## [2.2.1] — 2026-07-22

### Geändert (Architektur — Tailwind-v4-Build jetzt Voraussetzung)
- **CSS-Kollision mit Tailwind behoben — Utilities kommen jetzt aus dem Tailwind-Build statt vorkompiliert mitgeliefert**: `tw-gridbuilder-grid.css` lieferte bisher alle generischen Utility-Klassen (`.grid`, `.flex`, `.gap-*`, `.pt-/.pb-/.px-*`, `.container`, `.col-span-*`, `.bg-*` …) als **unlayered** CSS. In Tailwind-v4-Projekten gewinnt unlayered CSS immer gegen `@layer utilities` — dadurch überschrieben die mitgelieferten Basisklassen die Tailwind-Responsive-Varianten (`.flex` schlug `lg:hidden`, `.flex-col` schlug `md:flex-row`), und die `.container`-Definition (Bootstrap-artige max-widths) überschrieb site-weit den Theme-Container. Gelöst durch eine Tailwind-`@source inline(...)`-**Safelist** in `tw-gridbuilder-grid.css`: Tailwind erzeugt die dynamisch in `module/output.php` gebauten Klassen nun selbst als echte `@layer utilities`. Responsive-Varianten funktionieren wieder ohne `!important`, Hintergrundfarben (`bg-primary-500`, `bg-secondary-500`, `bg-neutral-*`) beziehen ihre Werte aus den `--color-*`-Theme-Variablen (eine andere Palette wirkt automatisch). Die generischen Utility-Definitionen wurden aus der Datei entfernt; es verbleiben nur echte Custom-Klassen (`video-docker`, `pb-section`, `pb-mobile-reverse`, `reverse-order-on-mobile`, Mobile-`col-span→12`-Override).
- **Breaking:** Die Datei setzt jetzt einen **Tailwind-v4-Build** voraus (per `@import` nach `@import 'tailwindcss'`). Das frühere Standalone-Einbinden per `<link>` ohne Tailwind-Build funktioniert nicht mehr, da die Utility-Klassen dann nicht existieren. README entsprechend aktualisiert.

### Fixes
- **Sekundärfarbe im Zeilen-/Zellen-Hintergrund wurde falsch ausgegeben**: Die Backend-Option „Sekundärfarbe" erzeugte `bg-secondary-50` (sehr helle Tönung) statt `bg-secondary-500`. In `assets/tw-gridbuilder.js` (`bgOptions`) korrigiert.
- **Serverseitige Erst-Vorschau (`module/input.php`) nutzte eine veraltete Token-Ersetzung**: Die eigene `pb_render_preview()`-Funktion erkannte nur `REX_VALUE[n]` (ohne `id=`/`output=html`-Parameter, ohne `REX_MEDIA`/`REX_LINK`) und quotete Token immer per `var_export` — dieselben Fälle, die in `Helper::injectValues()` längst gefixt waren. Dadurch rendered die Erst-Vorschau bei Media-/Link-/Parameter- und Dynamik-Tag-Modulen falsch. `pb_render_preview()` entfernt; `input.php` nutzt jetzt `Helper::renderModule()` — eine einzige Quelle für die Wert-Auflösung.
- **PHP-Warning bei Zeilen ohne `cells`-Key**: `input.php` iterierte `$pb_row['cells']` ohne Null-Guard; jetzt `?? []`.

- **`REX_LINK` mit `output=url` lieferte die Artikel-ID statt der URL**: `Helper::injectValues()` ersetzte `REX_LINK[n]` immer durch die rohe gespeicherte Artikel-ID und ignorierte den `output`-Parameter. `REX_LINK[id=n output=url]` (z. B. in `href="…"`) ergab dadurch die ID statt der URL. Jetzt analog zu `rex_var_link`: bei `output != id` wird die URL via `rex_getUrl()` aufgelöst.

### Sicherheit
- **CSRF-Token wird jetzt serverseitig geprüft**: Der AJAX-Endpoint (`TwGridBuilderApi`) validierte den mitgeschickten `rex_csrf_token` bisher nicht (nur `isBackend()`/eingeloggt). Token wird nun unter dem korrekten Feldnamen (`rex_csrf_token::PARAM`) gesendet und per `rex_csrf_token::factory('twgb_load_module')->isValid()` geprüft.
- **Preview-/Modul-Laden per POST statt GET**: Layout-/Feldwerte (`cell_data`, `values`) wanderten als JSON in die Query-URL und konnten die URL-Längengrenze sprengen (Vorschau schlug dann still fehl). Anfragen laufen jetzt über einen POST-Body (`apiPost`).

### Backend-UX
- **Optische Trennung + Modul-Namens-Label je Zelle** in der Backend-Strukturvorschau: Lagen mehrere Module in einer Zelle (z. B. Überschrift + Text + Linkbutton), verschmolzen sie zu einem Block. Jedes Modul wird jetzt einzeln umschlossen (`.twgb-be-module`), durch eine dezente gestrichelte Linie getrennt und mit einem kleinen Modul-Namens-Label (`.twgb-be-module-label`, z. B. „0240 – Linkbutton") überschrieben.
- Hinweis: Modul-Output läuft aus `rex_module.output` (DB) — Änderungen an `module/output.php` müssen in die DB des GridBuilder-Moduls (hier id 32) gespiegelt werden.

### Aufräumen
- **Zeilen-Container-Logik entwirrt** (`module/output.php`): Das verschachtelte `$container`/`$content_width`-Konstrukt (inkl. `$containerMap`) erzeugte für „Container=Standard + Inhalt=Volle Breite" eine wirkungslose, teils widersprüchliche Klassenkombination (`container mx-auto px-4 w-full`) und doppeltes `w-full`. Ersetzt durch zwei klare Achsen (`$container_full`, `$content_full` → `$inner_width`); identische Ausgabe für alle sinnvollen Kombinationen, ohne Redundanz. Im Backend ist „Breite des Inhalts" jetzt nur wählbar, wenn „Container = Volle Browserbreite" (mit Hinweistext) — die zuvor wirkungslose Kombination ist damit ausgeschlossen.

## [2.1.5] — 2026-07-02

### Fixes
- **Media-/Link-Widgets (`REX_MEDIA[id=n widget=1]`) wurden im eingebetteten Modul-Formular nicht gerendert**: Der Token blieb als roher Text stehen, der Mediapool ließ sich gar nicht öffnen. Ursache: `TwGridBuilderApi` rief `rex_var::parse()` mit `context = null` auf. `rex_var_media::getOutput()` (und analog `rex_var_link`) rendert das Widget aber nur, wenn der Parse-Context `'module'` bzw. `'action'` ist — sonst `return false` → Token unverändert. Betroffen war jedes Modul mit echtem Media-/Link-**Widget** (z. B. Theme-Modul „Einzelbild", id 43); Module mit reinen `REX_VALUE`-Feldern liefen, weil diese keinen Context-Check haben. Fix: `parse()` erhält jetzt `context = 'module'` und ein Stub-`contextData`-Objekt (liefert für alle REX_*-Werte leer; die echten Werte kommen clientseitig über `prefillForm()` im `__media_`/`__link_`-Namespace)
- **Bilder in der Zell-Vorschau wurden nicht angezeigt**: `.pb-cell-preview img { display: none; }` (mit Ausnahme nur für `.form-horizontal img`) blendete alle Inhaltsbilder aus — ein Relikt aus der Zeit, als der Preview noch das Input-Formular zeigte. Der Preview rendert inzwischen den echten Modul-**Output** (z. B. `<div class="singleImage"><img>`), dessen Bilder außerhalb von `.form-horizontal` liegen. Regel ersetzt durch `.pb-cell-preview img { display: block; max-width: 100%; width: auto; height: auto; }` — Bilder werden sichtbar und füllen die Zellbreite (statt auf 120px Höhe gedeckelt)
- **CKEditor-4-Inhalte (`ckeditor`-Addon, Textarea mit `class="ckeditor"`) gingen beim Speichern verloren**: Der GridBuilder synchronisierte und zerstörte nur `cke5`-Editoren; CKEditor 4 hält seinen Inhalt in einer eigenen Instanz und schreibt ihn nur bei `updateElement()` in die Textarea zurück. Da `collectFromDom()` die (noch leere) Textarea direkt las, wurde beim Speichern nichts übernommen. Zusätzlich brach `syncCke5ToTextareas()` früh ab, wenn `cke5_destroy` fehlte. Fix: Funktion umbenannt zu `syncEditorsToTextareas()`, behandelt cke5 und CKEditor 4 unabhängig (CKE4 via `CKEDITOR.instances[...].updateElement()`, Match über DOM-Containment statt Element-ID). `setFormHtml()` zerstört jetzt auch CKE4-Instanzen (`destroy(true)`) vor dem DOM-Austausch, um Instanz-Namenskollisionen zu vermeiden. Betrifft Theme-Modul „Mehrspalter/Editor" (id 41)

## [2.1.4] — 2026-07-01

### Fixes
- **`REX_LINK[n]` (Linkmap-Felder, z. B. `MForm::addLinkField()`) wurde komplett ignoriert**: Weder beim Speichern noch beim Rendern gab es eine Behandlung für diesen REDAXO-Variablentyp. Folge: Linkauswahl in eingebetteten Modulen ging beim Speichern kommentarlos verloren, und im Live-Output blieb der rohe `REX_LINK[n]`-Token als Text sichtbar. In 23 Theme-Modulen genutzt. `TwGridBuilderApi.php` namespaced jetzt `REX_INPUT_LINK[n]` analog zu `REX_INPUT_MEDIA[n]` (→ `__link_n`), `TwGridBuilderHelper::injectValues()` löst `REX_LINK[n]` beim Rendern auf
- **`REX_MEDIA[id=n ...]`-Syntax mit Zusatzparametern wurde beim Rendern nicht erkannt**: Analog zum `REX_VALUE[id=n output=html]`-Fix aus 2.1.1 fehlte die gleiche Toleranz bei `REX_MEDIA` (z. B. `REX_MEDIA[id=1 widget=1]`), Regex entsprechend erweitert
- Geprüft, welche REDAXO-`rex_var`-Typen in den Theme-Modulen tatsächlich vorkommen (`REX_VALUE`, `REX_MEDIA`, `REX_LINK`); `REX_LINKLIST`, `REX_MEDIALIST`, `REX_ARTICLE`, `REX_CATEGORY` etc. werden aktuell nirgends verwendet und daher bewusst nicht unterstützt

## [2.1.3] — 2026-07-01

### Fixes
- **Bare `REX_VALUE[n]`-Tokens im HTML-Text wurden fälschlich mit PHP-Quotes umschlossen**: `Helper::injectValues()` ersetzte jedes Token grundsätzlich per `var_export()`, also mit umschließenden Anführungszeichen. Das ist nur korrekt, wenn das Token innerhalb eines PHP-String-Literals steht (z. B. `$align = "REX_VALUE[3]";`). Steht das Token dagegen bare im HTML-Text (z. B. `<div>REX_VALUE[id=1 output=html]</div>` im Mehrspalter-Modul) oder wird sogar als dynamischer Tag-Name verwendet (`<REX_VALUE[2] class="...">` im Überschriften-Modul H2-H6), landeten sichtbare Anführungszeichen/Escape-Backslashes im gerenderten HTML bzw. das Tag wurde komplett ungültig (`<'h2' ...>`). `injectValues()` erkennt jetzt, ob das Token bereits von Anführungszeichen umschlossen war, und setzt den Rohwert nur dann ungequotet ein, wenn keine Anführungszeichen vorhanden waren. Betroffen: Module „Mehrspalter/Editor" und „Überschriften H2-H6"

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
