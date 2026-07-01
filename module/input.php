<?php
/**
 * TW GridBuilder — Modul-Input
 * @version 1.0.1
 */
/* tw_gridblock selbst - NICHT LÖSCHEN, identifiziert das TW GridBuilder-Modul selbst und darf in keinem anderen Modul-Input vorkommen */

if (!rex_addon::exists('tw_gridbuilder') || !rex_addon::get('tw_gridbuilder')->isAvailable()) {
    echo '<div class="alert alert-danger">TW GridBuilder-Addon nicht aktiv!</div>';
    return;
}

// UID immer eindeutig pro Instanz – NICHT von slice_id abhängig,
// damit zwei Instanzen auf derselben Seite keine ID-Kollision haben.
$pb_uid = str_replace('.', '', uniqid('pb', true));

// Verfügbare Module per SQL laden; das GridBuilder-Modul selbst wird anhand des
// Selbst-Markers im eigenen Input-Code ausgeschlossen (siehe Kommentar oben in dieser Datei).
// NICHT über Modul-ID oder Modul-Namen filtern – diese sind pro Instanz unterschiedlich!
$pb_modules = [];
$pb_sql = rex_sql::factory();
$pb_sql->setQuery(
    'SELECT id, name FROM ' . rex::getTablePrefix() . 'module
     WHERE input LIKE :marker AND input NOT LIKE :self ORDER BY name ASC',
    ['marker' => '%/* tw_gridblock kompatibel */%', 'self' => '%/* tw_gridblock selbst - NICHT LÖSCHEN, identifiziert das TW GridBuilder-Modul selbst und darf in keinem anderen Modul-Input vorkommen */%']
);
foreach ($pb_sql as $row) {
    $pb_modules[] = ['id' => (int)$row->getValue('id'), 'name' => $row->getValue('name')];
}

// Bestehende Daten laden – REX_VALUE[1] wird von rex_var_value pro Slice ersetzt (ENV_INPUT+OUTPUT).
// Sentinel-Variable verhindert, dass rex_var::parse den Vergleichswert ebenfalls ersetzt.
$pb_raw      = 'REX_VALUE[1]';
$pb_sentinel = 'REX_VALUE' . '[1]';
$pb_data     = ['rows' => []];
if ($pb_raw !== '' && $pb_raw !== $pb_sentinel) {
    $pb_data = json_decode(html_entity_decode($pb_raw, ENT_QUOTES, 'UTF-8'), true) ?: ['rows' => []];
}
if (!isset($pb_data['rows'])) $pb_data = ['rows' => []];

// Modul-Output für Preview rendern
if (!function_exists('pb_render_preview')) :
function pb_render_preview(int $module_id, array $values): string
{
    $sql = rex_sql::factory();
    $sql->setQuery(
        'SELECT output FROM ' . rex::getTablePrefix() . 'module WHERE id = :id LIMIT 1',
        ['id' => $module_id]
    );
    if ($sql->getRows() === 0) return '';

    $code = preg_replace_callback(
        "/(['\"]?)REX_VALUE\[(\d+)\](['\"]?)/",
        static function (array $m) use ($values): string {
            $n   = (int) $m[2];
            $val = $values[$n] ?? $values[(string) $n] ?? null;
            $str = match (true) {
                $val === null  => '',
                is_array($val) => json_encode($val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                default        => (string) $val,
            };
            return var_export($str, true);
        },
        $sql->getValue('output')
    );
    ob_start();
    try {
        eval('?>' . $code);
    } catch (\Throwable $e) {
        ob_end_clean();
        return '<p style="color:#ef4444;font-size:11px;">⚠ ' . htmlspecialchars($e->getMessage()) . '</p>';
    }
    return ob_get_clean();
}
endif;

// Previews in $pb_data einbauen
foreach ($pb_data['rows'] as &$pb_row) {
    foreach ($pb_row['cells'] as &$pb_cell) {
        $pb_preview = '';
        foreach ($pb_cell['modules'] ?? [] as $pb_slot) {
            if (!empty($pb_slot['module_id'])) {
                $pb_preview .= pb_render_preview((int)$pb_slot['module_id'], $pb_slot['values'] ?? []);
            }
        }
        $pb_cell['preview'] = $pb_preview;
    }
    unset($pb_cell);
}
unset($pb_row);

$csrf_token = rex_csrf_token::factory('twgb_load_module')->getValue();
$ajax_url   = rex_url::backendController(['rex-api-call' => 'twgb_load_module']);
$mount_id   = 'twgb-mount-' . $pb_uid;
$output_id  = 'twgb-layout-' . $pb_uid;
?>

<div id="<?= $mount_id ?>" class="twgb-root">
    <div style="padding:20px;color:#94a3b8;">TW GridBuilder wird geladen…</div>
</div>

<input type="hidden" name="REX_INPUT_VALUE[twgb][__layout__]" id="<?= $output_id ?>">

<script>
(function () {
    var timer = setInterval(function () {
        if (window.PB && window.PB.init) {
            clearInterval(timer);
            window.PB.init({
                mountId:     <?= json_encode($mount_id) ?>,
                outputId:    <?= json_encode($output_id) ?>,
                modules:     <?= json_encode($pb_modules, JSON_UNESCAPED_UNICODE) ?>,
                initialData: <?= json_encode($pb_data,    JSON_UNESCAPED_UNICODE) ?>,
                ajaxUrl:     <?= json_encode($ajax_url,   JSON_UNESCAPED_UNICODE) ?>,
                csrfToken:   <?= json_encode($csrf_token) ?>,
            });
        }
    }, 50);
})();
</script>
