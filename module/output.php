<?php
/**
 * TW GridBuilder — Modul-Output
 * Rendert das Grid mit den enthaltenen Modulen.
 * @version 1.0.1
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
        if (!empty($pb_row['mobile_reverse']))                                           $pb_tags[] = '<i class="rex-icon fa fa-mobile"></i> Mobil';

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
            if (!empty($pb_cell['align'])     && $pb_cell['align']     !== 'start') $pb_cell_right[] = $pb_cell['align'] === 'center' ? 'Mitte' : 'Unten';
            if (!empty($pb_cell['text_align']))                                      $pb_cell_right[] = htmlspecialchars($pb_cell['text_align']);
            if (!empty($pb_cell['rounded']))                                         $pb_cell_right[] = '<i class="rex-icon fa fa-circle-notch"></i>';

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
                    echo \FriendsOfRedaxo\TwGridBuilder\Helper::renderModule($pb_mid, $pb_vals);
                }
            }
            echo '</div>';
        }
        echo '</div></div>';
    }
    echo '</div>';
    return;
}

// Container-Klassen-Mapping (Tailwind)
$containerMap = [
    'standard' => 'container mx-auto px-4',
    'full'     => 'w-full px-4',
];

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
    $cw_setting    = $row['content_width'] ?? 'standard';
    $container     = $cw_setting === 'standard'
        ? 'container mx-auto px-4'
        : ($containerMap[$row['container'] ?? 'standard'] ?? 'container mx-auto px-4');
    $content_width = $cw_setting === 'full' ? 'w-full' : '';
    $py_top_base   = (string)($row['py_top']        ?? '3');
    $py_top_md     = (string)($row['py_top_md']    ?? $py_top_base);
    $py_top_lg     = (string)($row['py_top_lg']    ?? $py_top_md);
    $py_bot_base   = (string)($row['py_bottom']    ?? '3');
    $py_bot_md     = (string)($row['py_bottom_md'] ?? $py_bot_base);
    $py_bot_lg     = (string)($row['py_bottom_lg'] ?? $py_bot_md);
    $gap_base      = (string)($row['gap']          ?? '4');
    $gap_md        = (string)($row['gap_md']       ?? $gap_base);
    $gap_lg        = (string)($row['gap_lg']       ?? $gap_md);
    $bg            = htmlspecialchars($row['bg'] ?? '', ENT_QUOTES);
    $bg_image      = $row['bg_image'] ?? '';
    $bg_video      = $row['bg_video'] ?? '';
    $text_align    = htmlspecialchars($row['text_align'] ?? '', ENT_QUOTES);
    $align_v       = htmlspecialchars($row['align_v'] ?? '', ENT_QUOTES);
    $mobile_rev    = !empty($row['mobile_reverse']);

    // Hintergrund auf Section (volle Breite) oder auf Container (begrenzte Breite)?
    // Entscheidung anhand des Container-Dropdowns, nicht der berechneten $container-Variable
    // ($container wird durch content_width='standard' immer auf 'container mx-auto px-4' gesetzt)
    $bg_on_section = ($row['container'] ?? 'standard') === 'full';

    $section_classes = implode(' ', array_filter([
        'pb-section',
        $bg_on_section ? $bg : '',
        $text_align,
        pb_resp_class($py_top_base, $py_top_md, $py_top_lg, 'pt-'),
        pb_resp_class($py_bot_base, $py_bot_md, $py_bot_lg, 'pb-'),
        $bg_on_section && $bg_video ? 'relative z-10' : '',
    ]));

    $container_classes = implode(' ', array_filter([
        $container,
        $content_width,
        !$bg_on_section ? $bg : '',
        !$bg_on_section && $bg_video ? 'relative z-10' : '',
    ]));

    echo '<section class="' . $section_classes . '"' . ($bg_on_section && $bg_image ? ' style="' . pb_bg_image_style($bg_image) . '"' : '') . '>';

    if ($bg_on_section && $bg_video) {
        echo '<div class="video-docker"><video src="' . htmlspecialchars(rex_url::media($bg_video), ENT_QUOTES) . '" type="video/mp4" autoplay muted loop playsinline></video></div>';
    }

    echo '<div class="' . $container_classes . '"' . (!$bg_on_section && $bg_image ? ' style="' . pb_bg_image_style($bg_image) . '"' : '') . '>';

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
        $cell_bg        = htmlspecialchars($cell['bg'] ?? '', ENT_QUOTES);
        $cell_bg_image  = $cell['bg_image'] ?? '';
        $cell_bg_video  = $cell['bg_video'] ?? '';
        $cell_align     = in_array($cell['align'] ?? '', ['start','center','end']) ? $cell['align'] : 'start';
        $cell_text_align = htmlspecialchars($cell['text_align'] ?? '', ENT_QUOTES);
        $cell_rounded   = !empty($cell['rounded']);
        $cell_style = $cell_bg_image ? ' style="' . pb_bg_image_style($cell_bg_image) . '"' : '';

        $cell_classes = array_filter([
            'col-span-' . $span,
            $cell_pt_base !== '0' || $cell_pt_md !== '0' || $cell_pt_lg !== '0' ? pb_resp_class($cell_pt_base, $cell_pt_md, $cell_pt_lg, 'pt-') : '',
            $cell_pb_base !== '0' || $cell_pb_md !== '0' || $cell_pb_lg !== '0' ? pb_resp_class($cell_pb_base, $cell_pb_md, $cell_pb_lg, 'pb-') : '',
            $cell_px_base !== '0' || $cell_px_md !== '0' || $cell_px_lg !== '0' ? pb_resp_class($cell_px_base, $cell_px_md, $cell_px_lg, 'px-') : '',
            $cell_align === 'center' ? 'flex flex-col justify-center' : '',
            $cell_align === 'end'    ? 'flex flex-col justify-end'    : '',
            $cell_text_align,
            $cell_rounded   ? 'rounded-lg' : '',
            $cell_bg,
            $cell_bg_video  ? 'relative z-10' : '',
            'twgb-cell',
            'twgb-cell--' . ($cell_index + 1) . '-of-' . $row_cols_count,
            'twgb-cell--span-' . $span,
        ]);

        echo '<div class="' . implode(' ', $cell_classes) . '"' . $cell_style . '>';

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

        echo '</div>';
    }

    echo '</div></div></section>';
}


