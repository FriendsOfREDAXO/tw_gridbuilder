<?php
/**
 * TW GridBuilder — Modul-Output
 * Rendert das Grid mit den enthaltenen Modulen.
 * @version 2.8.0
 */

// rex_var::parse ersetzt REX_VALUE[1] – Sentinel-Check über Konkatenation vermeiden,
// damit nur die erste Zuweisung ersetzt wird, nicht der Vergleichswert.
$pb_raw       = 'REX_VALUE[1]';
$pb_sentinel  = 'REX_VALUE' . '[1]';   // wird bewusst NICHT ersetzt
$pb_data      = [];
if ($pb_raw !== '' && $pb_raw !== $pb_sentinel) {
    $pb_data = json_decode(html_entity_decode($pb_raw, ENT_QUOTES, 'UTF-8'), true) ?: [];
}
// Fallback: direkt via $this (rex_article_slice) falls rex_var::parse nicht griff
if (empty($pb_data) && isset($this) && $this instanceof rex_article_slice) {
    $pb_raw2 = $this->getValue('value1');
    if ($pb_raw2) $pb_data = json_decode($pb_raw2, true) ?: [];
}

if (empty($pb_data['rows'])) {
    if (rex::isBackend()) {
        echo '<div class="twgb-root twgb-be-empty">TW GridBuilder: keine Inhalte</div>';
    }
    return;
}

// Helfer: Border-Radius-Klassen pro Ecke (Tailwind-v4-Skala)
// radius_tl/tr/bl/br = Index 0-9 (0 = keine, sonst xs/sm/md/lg/xl/2xl/3xl/4xl/full)
// Rückwärtskompatibilität: altes boolean-Feld 'rounded' → alle Ecken 'lg' (Index 4)
if (!function_exists('pb_radius_classes')) :
function pb_radius_classes(array $obj): string {
    $scale  = ['', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full']; // Index 0-9
    $legacy = !empty($obj['rounded']);
    $parts  = [];
    foreach (['tl', 'tr', 'bl', 'br'] as $corner) {
        $idx = (int)($obj['radius_' . $corner] ?? 0);
        if ($idx <= 0 && $legacy) $idx = 4; // lg
        if ($idx <= 0 || $idx >= count($scale)) continue;
        $parts[] = 'rounded-' . $corner . '-' . $scale[$idx];
    }
    return implode(' ', $parts);
}
endif;

// Helfer: Freitext „Eigene CSS-Klasse" serverseitig absichern (defense in depth,
// die JS-Eingabe filtert bereits im Panel). Nur Klassen-taugliche Zeichen.
if (!function_exists('pb_custom_class')) :
function pb_custom_class(array $obj): string {
    $v = (string)($obj['custom_class'] ?? '');
    return trim(preg_replace('/[^a-zA-Z0-9\s\-_:]/', '', $v));
}
endif;

// Helfer: Animation. Baut das Alpine-Attribut, das animate.css beim
// Sichtbarwerden einmalig auslöst. Voraussetzung im Theme: animate.css +
// alpinejs-intersect-class (Plugin). Ohne Animation → leerer String.
// anim          = animate.css-Klasse (z.B. 'animate__fadeInUp')
// anim_delay    = '' | '1'..'5'  → animate__delay-Ns
// anim_duration = '' | 'animate__slow' | 'animate__slower' | 'animate__fast' | 'animate__faster'
if (!function_exists('pb_anim_attr')) :
function pb_anim_attr(array $obj): string {
    // nur bekannte animate.css-Klassen zulassen (defense in depth)
    $anim = (string)($obj['anim'] ?? '');
    if ($anim === '' || !preg_match('/^animate__[A-Za-z]+$/', $anim)) return '';

    $classes = ['animate__animated', $anim];

    $delay = (string)($obj['anim_delay'] ?? '');
    if (preg_match('/^[1-5]$/', $delay)) {
        $classes[] = 'animate__delay-' . $delay . 's';
    }

    $duration = (string)($obj['anim_duration'] ?? '');
    if (in_array($duration, ['animate__slow', 'animate__slower', 'animate__fast', 'animate__faster'], true)) {
        $classes[] = $duration;
    }

    $cls = htmlspecialchars(implode(' ', $classes), ENT_QUOTES);
    return 'x-data x-intersect-class.once="' . $cls . '"';
}
endif;

// Helfer: Kurzlabel für Backend-Tags („animate__fadeInUp" → „fadeInUp")
if (!function_exists('pb_anim_label')) :
function pb_anim_label(array $obj): string {
    $anim = (string)($obj['anim'] ?? '');
    return $anim !== '' ? preg_replace('/^animate__/', '', $anim) : '';
}
endif;

// Helfer: interner Link. 'link' enthält eine REDAXO-Artikel-ID (auch als
// redaxo://ID toleriert). Gibt die aufgelöste URL zurück oder '' (kein/ungültig).
// Nur interne Artikel-IDs werden akzeptiert (defense in depth).
if (!function_exists('pb_link_href')) :
function pb_link_href(array $obj): string {
    $link = trim((string)($obj['link'] ?? ''));
    if ($link === '') return '';
    if (preg_match('#^redaxo://(\d+)#', $link, $m)) $link = $m[1];
    if (!ctype_digit($link)) return '';
    $url = rex_getUrl((int) $link);
    return $url ?: '';
}
endif;

// Helfer: Außen-Abstand (margin) gesetzt? Für Backend-Tags.
if (!function_exists('pb_has_margin')) :
function pb_has_margin(array $obj): bool {
    foreach (['mt','mt_md','mt_lg','mb','mb_md','mb_lg','mx','mx_md','mx_lg'] as $k) {
        if ((string)($obj[$k] ?? '0') !== '0') return true;
    }
    return false;
}
endif;

// ── Backend: Strukturübersicht mit echtem Moduloutput ───────────────────────
if (rex::isBackend()) {
    echo '<div class="twgb-be-wrap twgb-root">';
    foreach ($pb_data['rows'] as $pb_ri => $pb_row) {
        $pb_cols = count($pb_row['cells'] ?? []);
        $pb_tags = [];
        if (!empty($pb_row['container']) && $pb_row['container'] !== 'standard')       $pb_tags[] = htmlspecialchars($pb_row['container']);
        if (!empty($pb_row['content_width']) && $pb_row['content_width'] !== 'standard') $pb_tags[] = 'Inhalt: ' . htmlspecialchars($pb_row['content_width']);
        if (!empty($pb_row['bg']))                                                       $pb_tags[] = htmlspecialchars($pb_row['bg']);
        if (!empty($pb_row['bg_image']))                                                 $pb_tags[] = '<i class="rex-icon fa fa-image"></i> ' . htmlspecialchars($pb_row['bg_image']);
        if (!empty($pb_row['bg_video']))                                                 $pb_tags[] = '<i class="rex-icon fa fa-film"></i> ' . htmlspecialchars($pb_row['bg_video']);
        if (!empty($pb_row['gap']) && $pb_row['gap'] !== '4')                           $pb_tags[] = 'Gap ' . $pb_row['gap'];
        if (pb_has_margin($pb_row))                                                      $pb_tags[] = '<i class="rex-icon fa fa-expand"></i> Außen-Abstand';
        if (!empty($pb_row['mobile_reverse']))                                           $pb_tags[] = '<i class="rex-icon fa fa-mobile"></i> Mobil';
        if (pb_radius_classes($pb_row) !== '')                                           $pb_tags[] = '<i class="rex-icon fa fa-circle-notch"></i> Ecken';
        if (!empty($pb_row['shadow_hover']))                                              $pb_tags[] = '<i class="rex-icon fa fa-square-o"></i> Hover-Schatten';
        if (pb_custom_class($pb_row) !== '')                                              $pb_tags[] = '.' . htmlspecialchars(pb_custom_class($pb_row), ENT_QUOTES);
        if (pb_anim_label($pb_row) !== '')                                                $pb_tags[] = '<i class="rex-icon fa fa-magic"></i> ' . htmlspecialchars(pb_anim_label($pb_row), ENT_QUOTES);
        if (pb_link_href($pb_row) !== '')                                                 $pb_tags[] = '<i class="rex-icon fa fa-link"></i> ' . htmlspecialchars((string)($pb_row['link_label'] ?? '') ?: ('Artikel ' . (string)($pb_row['link'] ?? '')), ENT_QUOTES);

        echo '<div class="twgb-be-row">';
        echo '<div class="twgb-be-row-header">';
        echo '<span class="twgb-be-row-label">Zeile ' . ($pb_ri + 1) . '</span>';
        echo '<span class="twgb-be-row-cols">' . $pb_cols . ' Spalte' . ($pb_cols !== 1 ? 'n' : '') . '</span>';
        foreach ($pb_tags as $t) {
            echo '<span class="twgb-be-tag">' . $t . '</span>';
        }
        echo '</div>';

        echo '<div class="twgb-be-cells">';
        foreach ($pb_row['cells'] ?? [] as $pb_cell) {
            $pb_span  = (int)($pb_cell['span'] ?? 12);
            $pb_slots = $pb_cell['modules'] ?? [];
            if (!$pb_slots && !empty($pb_cell['module_id'])) {
                $pb_slots = [['module_id' => $pb_cell['module_id'], 'values' => $pb_cell['values'] ?? []]];
            }

            // Links: Span + Medien-Tags
            $pb_cell_left = [];
            if (!empty($pb_cell['bg']))       $pb_cell_left[] = htmlspecialchars($pb_cell['bg']);
            if (!empty($pb_cell['bg_image'])) $pb_cell_left[] = '<i class="rex-icon fa fa-image"></i> ' . htmlspecialchars($pb_cell['bg_image']);
            if (!empty($pb_cell['bg_video'])) $pb_cell_left[] = '<i class="rex-icon fa fa-film"></i> ' . htmlspecialchars($pb_cell['bg_video']);
            // Rechts: Layout-Tags
            $pb_cell_right = [];
            if (!empty($pb_cell['py_top'])    && $pb_cell['py_top']    !== '0')     $pb_cell_right[] = '↑ ' . $pb_cell['py_top'];
            if (!empty($pb_cell['py_bottom']) && $pb_cell['py_bottom'] !== '0')     $pb_cell_right[] = '↓ ' . $pb_cell['py_bottom'];
            if (!empty($pb_cell['px'])        && $pb_cell['px']        !== '0')     $pb_cell_right[] = '↔ ' . $pb_cell['px'];
            if (pb_has_margin($pb_cell))                                             $pb_cell_right[] = '<i class="rex-icon fa fa-expand"></i>';
            if (!empty($pb_cell['align'])     && $pb_cell['align']     !== 'start') $pb_cell_right[] = $pb_cell['align'] === 'center' ? 'Mitte' : 'Unten';
            if (!empty($pb_cell['text_align']))                                      $pb_cell_right[] = htmlspecialchars($pb_cell['text_align']);
            if (pb_radius_classes($pb_cell) !== '')                                   $pb_cell_right[] = '<i class="rex-icon fa fa-circle-notch"></i>';
            if (!empty($pb_cell['shadow_hover']))                                     $pb_cell_right[] = '<i class="rex-icon fa fa-square-o"></i>';
            if (pb_custom_class($pb_cell) !== '')                                     $pb_cell_right[] = '.' . htmlspecialchars(pb_custom_class($pb_cell), ENT_QUOTES);
            if (pb_anim_label($pb_cell) !== '')                                       $pb_cell_right[] = '<i class="rex-icon fa fa-magic"></i>';
            if (pb_link_href($pb_cell) !== '')                                        $pb_cell_right[] = '<i class="rex-icon fa fa-link"></i>';

            echo '<div class="twgb-be-cell" style="flex:' . $pb_span . '">';
            echo '<div class="twgb-be-cell-meta">';
            echo '<div class="twgb-be-cell-info">' . $pb_span . '/12';
            foreach ($pb_cell_left as $ct) echo ' <span class="twgb-be-tag">' . $ct . '</span>';
            echo '</div>';
            if ($pb_cell_right) {
                echo '<div class="twgb-be-cell-tags">';
                foreach ($pb_cell_right as $ct) echo '<span class="twgb-be-tag">' . $ct . '</span>';
                echo '</div>';
            }
            echo '</div>';

            if (empty($pb_slots)) {
                echo '<div class="twgb-be-cell-empty">leer</div>';
            } else {
                foreach ($pb_slots as $pb_slot) {
                    $pb_mid  = (int)($pb_slot['module_id'] ?? 0);
                    $pb_vals = $pb_slot['values'] ?? [];
                    if (!$pb_mid) continue;
                    // Modulname für das Label (statisch gecacht, um Mehrfach-Queries zu vermeiden)
                    static $pb_mnames = [];
                    if (!array_key_exists($pb_mid, $pb_mnames)) {
                        $pb_nsql = rex_sql::factory();
                        $pb_nsql->setQuery('SELECT name FROM ' . rex::getTablePrefix() . 'module WHERE id = :id LIMIT 1', ['id' => $pb_mid]);
                        $pb_mnames[$pb_mid] = $pb_nsql->getRows() ? (string) $pb_nsql->getValue('name') : ('Modul ' . $pb_mid);
                    }
                    // Jedes Modul einzeln umschließen → optische Trennung + Namens-Label
                    echo '<div class="twgb-be-module">';
                    echo '<div class="twgb-be-module-label">' . htmlspecialchars($pb_mnames[$pb_mid]) . '</div>';
                    echo \FriendsOfRedaxo\TwGridBuilder\Helper::renderModule($pb_mid, $pb_vals);
                    echo '</div>';
                }
            }
            echo '</div>';
        }
        echo '</div></div>';
    }
    echo '</div>';
    return;
}

// Helfer: responsive Spacing-Klasse (base / md / lg)
// md-Klasse wird nur gesetzt wenn abweichend von base, lg nur wenn abweichend von md
if (!function_exists('pb_resp_class')) :
function pb_resp_class(string $base, string $md, string $lg, string $prefix): string {
    $parts = [$prefix . (int)$base];
    if ((string)$md !== (string)$base) $parts[] = 'md:' . $prefix . (int)$md;
    if ((string)$lg !== (string)$md)   $parts[] = 'lg:' . $prefix . (int)$lg;
    return implode(' ', $parts);
}
endif;

// Helfer: background-image style inkl. Focuspoint
if (!function_exists('pb_bg_image_style')) :
function pb_bg_image_style(string $filename): string {
    if (!$filename) return '';
    $url = rex_url::media($filename);
    $pos = '50% 50%';
    if (class_exists('\\FriendsOfRedaxo\\Focuspoint\\FocuspointMedia')) {
        try {
            $fp = \FriendsOfRedaxo\Focuspoint\FocuspointMedia::get($filename);
            if ($fp) { [$x, $y] = $fp->getFocus(); $pos = $x . '% ' . $y . '%'; }
        } catch (\Throwable) {}
    }
    return 'background-image:url(' . $url . ');background-size:cover;background-position:' . $pos . ';';
}
endif;

foreach ($pb_data['rows'] as $row) {
    // Zwei unabhängige Layout-Achsen:
    //  - container='full'      → Hintergrund/Section randlos über die volle Browserbreite
    //  - content_width='full'  → Inhalt randlos statt im zentrierten Container.
    // content_width wirkt nur bei container='full' sichtbar; bei container='standard'
    // bleibt der Inhalt im zentrierten Container (die UI deaktiviert das Feld dann).
    $container_full = ($row['container'] ?? 'standard') === 'full';
    $content_full   = ($row['content_width'] ?? 'standard') === 'full';
    $inner_width    = ($container_full && $content_full) ? 'w-full px-4' : 'container mx-auto px-4';
    $py_top_base   = (string)($row['py_top']        ?? '3');
    $py_top_md     = (string)($row['py_top_md']    ?? $py_top_base);
    $py_top_lg     = (string)($row['py_top_lg']    ?? $py_top_md);
    $py_bot_base   = (string)($row['py_bottom']    ?? '3');
    $py_bot_md     = (string)($row['py_bottom_md'] ?? $py_bot_base);
    $py_bot_lg     = (string)($row['py_bottom_lg'] ?? $py_bot_md);
    $gap_base      = (string)($row['gap']          ?? '4');
    $gap_md        = (string)($row['gap_md']       ?? $gap_base);
    $gap_lg        = (string)($row['gap_lg']       ?? $gap_md);
    // Außen-Abstände (margin) der Zeile → auf die <section>
    $m_top_base    = (string)($row['mt']    ?? '0'); $m_top_md = (string)($row['mt_md'] ?? $m_top_base); $m_top_lg = (string)($row['mt_lg'] ?? $m_top_md);
    $m_bot_base    = (string)($row['mb']    ?? '0'); $m_bot_md = (string)($row['mb_md'] ?? $m_bot_base); $m_bot_lg = (string)($row['mb_lg'] ?? $m_bot_md);
    $m_x_base      = (string)($row['mx']    ?? '0'); $m_x_md   = (string)($row['mx_md'] ?? $m_x_base);   $m_x_lg   = (string)($row['mx_lg'] ?? $m_x_md);
    $bg            = htmlspecialchars($row['bg'] ?? '', ENT_QUOTES);
    $bg_image      = $row['bg_image'] ?? '';
    $bg_video      = $row['bg_video'] ?? '';
    $text_align    = htmlspecialchars($row['text_align'] ?? '', ENT_QUOTES);
    $align_v       = htmlspecialchars($row['align_v'] ?? '', ENT_QUOTES);
    $mobile_rev    = !empty($row['mobile_reverse']);

    // Hintergrund auf Section (volle Breite) oder auf Container (begrenzte Breite)?
    // Entscheidung allein anhand des Container-Dropdowns.
    $bg_on_section = $container_full;

    $section_classes = implode(' ', array_filter([
        'pb-section',
        $bg_on_section ? $bg : '',
        $text_align,
        pb_resp_class($py_top_base, $py_top_md, $py_top_lg, 'pt-'),
        pb_resp_class($py_bot_base, $py_bot_md, $py_bot_lg, 'pb-'),
        ($m_top_base !== '0' || $m_top_md !== '0' || $m_top_lg !== '0') ? pb_resp_class($m_top_base, $m_top_md, $m_top_lg, 'mt-') : '',
        ($m_bot_base !== '0' || $m_bot_md !== '0' || $m_bot_lg !== '0') ? pb_resp_class($m_bot_base, $m_bot_md, $m_bot_lg, 'mb-') : '',
        ($m_x_base   !== '0' || $m_x_md   !== '0' || $m_x_lg   !== '0') ? pb_resp_class($m_x_base, $m_x_md, $m_x_lg, 'mx-') : '',
        $bg_on_section && $bg_video ? 'relative z-10' : '',
    ]));

    $row_radius       = pb_radius_classes($row);
    $row_shadow_hover = !empty($row['shadow_hover']);
    $row_custom_class = pb_custom_class($row);
    $row_anim_attr    = pb_anim_attr($row); // Animation auf inneren Container
    $row_link_href    = pb_link_href($row); // ganze Zeile als interner Link

    $container_classes = implode(' ', array_filter([
        $inner_width,
        !$bg_on_section ? $bg : '',
        !$bg_on_section && $bg_video ? 'relative z-10' : '',
        $row_radius,
        $row_radius && ($bg_image || $bg_video) ? 'overflow-hidden' : '',
        $row_shadow_hover ? 'hover:shadow-xl transition-shadow duration-300' : '',
        // Als Link ist der Container ein <a> (inline) → block, damit Container-Breite/Zentrierung greift
        $row_link_href ? 'block' : '',
        $row_custom_class,
    ]));

    // Container-Element: <a> wenn Zeile verlinkt, sonst <div>
    $row_tag       = $row_link_href ? 'a' : 'div';
    $row_href_attr = $row_link_href ? ' href="' . htmlspecialchars($row_link_href, ENT_QUOTES) . '"' : '';

    echo '<section class="' . $section_classes . '"' . ($bg_on_section && $bg_image ? ' style="' . pb_bg_image_style($bg_image) . '"' : '') . '>';

    if ($bg_on_section && $bg_video) {
        echo '<div class="video-docker"><video src="' . htmlspecialchars(rex_url::media($bg_video), ENT_QUOTES) . '" type="video/mp4" autoplay muted loop playsinline></video></div>';
    }

    echo '<' . $row_tag . ' class="' . $container_classes . '"' . $row_href_attr . (!$bg_on_section && $bg_image ? ' style="' . pb_bg_image_style($bg_image) . '"' : '') . ($row_anim_attr ? ' ' . $row_anim_attr : '') . '>';

    if (!$bg_on_section && $bg_video) {
        echo '<div class="video-docker"><video src="' . htmlspecialchars(rex_url::media($bg_video), ENT_QUOTES) . '" type="video/mp4" autoplay muted loop playsinline></video></div>';
    }
    // Struktur-Klassen: beschreiben Spaltenanzahl und Span-Verhältnis der Zeile,
    // z.B. bei 2 Spalten 1/3+2/3 (span 4+8): twgb-row--cols-2 twgb-row--span-4-8
    $row_cell_spans = array_map(
        static fn(array $c): int => max(1, min(12, (int)($c['span'] ?? 12))),
        $row['cells'] ?? []
    );
    $row_cols_count = count($row_cell_spans);

    $grid_classes = implode(' ', array_filter([
        'grid grid-cols-12',
        pb_resp_class($gap_base, $gap_md, $gap_lg, 'gap-'),
        $align_v,
        $mobile_rev ? 'pb-mobile-reverse' : '',
        'twgb-row',
        $row_cols_count ? 'twgb-row--cols-' . $row_cols_count : '',
        $row_cell_spans ? 'twgb-row--span-' . implode('-', $row_cell_spans) : '',
    ]));
    echo '<div class="' . $grid_classes . '">';

    foreach ($row['cells'] ?? [] as $cell_index => $cell) {
        $span  = max(1, min(12, (int)($cell['span'] ?? 12)));
        $slots = [];
        if (!empty($cell['modules']) && is_array($cell['modules'])) {
            $slots = $cell['modules'];
        } elseif (!empty($cell['module_id'])) {
            $slots = [['module_id' => $cell['module_id'], 'values' => $cell['values'] ?? []]];
        }

        $cell_pt_base   = (string)($cell['py_top']        ?? '0');
        $cell_pt_md     = (string)($cell['py_top_md']    ?? $cell_pt_base);
        $cell_pt_lg     = (string)($cell['py_top_lg']    ?? $cell_pt_md);
        $cell_pb_base   = (string)($cell['py_bottom']    ?? '0');
        $cell_pb_md     = (string)($cell['py_bottom_md'] ?? $cell_pb_base);
        $cell_pb_lg     = (string)($cell['py_bottom_lg'] ?? $cell_pb_md);
        $cell_px_base   = (string)($cell['px']           ?? '0');
        $cell_px_md     = (string)($cell['px_md']        ?? $cell_px_base);
        $cell_px_lg     = (string)($cell['px_lg']        ?? $cell_px_md);
        // Außen-Abstände (margin) der Zelle
        $cell_mt_base   = (string)($cell['mt']    ?? '0'); $cell_mt_md = (string)($cell['mt_md'] ?? $cell_mt_base); $cell_mt_lg = (string)($cell['mt_lg'] ?? $cell_mt_md);
        $cell_mb_base   = (string)($cell['mb']    ?? '0'); $cell_mb_md = (string)($cell['mb_md'] ?? $cell_mb_base); $cell_mb_lg = (string)($cell['mb_lg'] ?? $cell_mb_md);
        $cell_mx_base   = (string)($cell['mx']    ?? '0'); $cell_mx_md = (string)($cell['mx_md'] ?? $cell_mx_base); $cell_mx_lg = (string)($cell['mx_lg'] ?? $cell_mx_md);
        $cell_bg        = htmlspecialchars($cell['bg'] ?? '', ENT_QUOTES);
        $cell_bg_image  = $cell['bg_image'] ?? '';
        $cell_bg_video  = $cell['bg_video'] ?? '';
        $cell_align     = in_array($cell['align'] ?? '', ['start','center','end']) ? $cell['align'] : 'start';
        $cell_text_align = htmlspecialchars($cell['text_align'] ?? '', ENT_QUOTES);
        $cell_radius       = pb_radius_classes($cell);
        $cell_shadow_hover = !empty($cell['shadow_hover']);
        $cell_custom_class = pb_custom_class($cell);
        $cell_anim_attr    = pb_anim_attr($cell);
        // Ganze Zelle als interner Link — aber nur, wenn die Zeile nicht bereits
        // ein <a> ist (verschachtelte Links wären ungültiges HTML).
        $cell_link_href    = $row_link_href ? '' : pb_link_href($cell);
        $cell_tag          = $cell_link_href ? 'a' : 'div';
        $cell_href_attr    = $cell_link_href ? ' href="' . htmlspecialchars($cell_link_href, ENT_QUOTES) . '"' : '';
        $cell_style = $cell_bg_image ? ' style="' . pb_bg_image_style($cell_bg_image) . '"' : '';

        $cell_classes = array_filter([
            'col-span-' . $span,
            $cell_pt_base !== '0' || $cell_pt_md !== '0' || $cell_pt_lg !== '0' ? pb_resp_class($cell_pt_base, $cell_pt_md, $cell_pt_lg, 'pt-') : '',
            $cell_pb_base !== '0' || $cell_pb_md !== '0' || $cell_pb_lg !== '0' ? pb_resp_class($cell_pb_base, $cell_pb_md, $cell_pb_lg, 'pb-') : '',
            $cell_px_base !== '0' || $cell_px_md !== '0' || $cell_px_lg !== '0' ? pb_resp_class($cell_px_base, $cell_px_md, $cell_px_lg, 'px-') : '',
            $cell_mt_base !== '0' || $cell_mt_md !== '0' || $cell_mt_lg !== '0' ? pb_resp_class($cell_mt_base, $cell_mt_md, $cell_mt_lg, 'mt-') : '',
            $cell_mb_base !== '0' || $cell_mb_md !== '0' || $cell_mb_lg !== '0' ? pb_resp_class($cell_mb_base, $cell_mb_md, $cell_mb_lg, 'mb-') : '',
            $cell_mx_base !== '0' || $cell_mx_md !== '0' || $cell_mx_lg !== '0' ? pb_resp_class($cell_mx_base, $cell_mx_md, $cell_mx_lg, 'mx-') : '',
            $cell_align === 'center' ? 'flex flex-col justify-center' : '',
            $cell_align === 'end'    ? 'flex flex-col justify-end'    : '',
            $cell_text_align,
            $cell_radius,
            $cell_radius && ($cell_bg_image || $cell_bg_video) ? 'overflow-hidden' : '',
            $cell_bg,
            $cell_bg_video  ? 'relative z-10' : '',
            $cell_shadow_hover ? 'hover:shadow-xl transition-shadow duration-300' : '',
            $cell_custom_class,
            'twgb-cell',
            'twgb-cell--' . ($cell_index + 1) . '-of-' . $row_cols_count,
            'twgb-cell--span-' . $span,
        ]);

        echo '<' . $cell_tag . ' class="' . implode(' ', $cell_classes) . '"' . $cell_href_attr . $cell_style . ($cell_anim_attr ? ' ' . $cell_anim_attr : '') . '>';

        if ($cell_bg_video) {
            echo '<div class="video-docker"><video src="' . htmlspecialchars(rex_url::media($cell_bg_video), ENT_QUOTES) . '" type="video/mp4" autoplay muted loop playsinline></video></div>';
        }

        if (empty($slots) && rex::isBackend()) {
            echo '<div class="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center text-slate-400 text-xs">Leere Zelle</div>';
        }

        foreach ($slots as $slot) {
            $module_id = (int)($slot['module_id'] ?? 0);
            $values    = $slot['values'] ?? [];
            if (!$module_id) continue;

            $mod_sql = rex_sql::factory();
            $mod_sql->setQuery(
                'SELECT output FROM ' . rex::getTablePrefix() . 'module WHERE id = ' . $module_id . ' LIMIT 1'
            );
            if ($mod_sql->getRows() === 0) continue;

            $code = \FriendsOfRedaxo\TwGridBuilder\Helper::injectValues($mod_sql->getValue('output'), $values);
            try {
                ob_start();
                eval('?>' . $code);
                echo ob_get_clean();
            } catch (\Throwable $e) {
                ob_end_clean();
                if (rex::isBackend()) {
                    echo '<div class="alert alert-danger">Fehler: ' . htmlspecialchars($e->getMessage()) . '</div>';
                }
            }
        }

        echo '</' . $cell_tag . '>';
    }

    echo '</div></' . $row_tag . '></section>';
}


