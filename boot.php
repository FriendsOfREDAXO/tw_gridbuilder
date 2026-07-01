<?php
/**
 *  This file is part of the REDAXO-AddOn "tw_gridbuilder".
 *
 *  @author      FriendsOfREDAXO @ GitHub <https://github.com/FriendsOfREDAXO/tw_gridbuilder>
 *  @copyright   FriendsOfREDAXO <https://friendsofredaxo.github.io/>
 *
 *  For the full copyright and license information, please view the LICENSE
 *  file that was distributed with this source code.
 */

/** @var rex_addon $this */

// ── AJAX API registrieren ────────────────────────────────────────────────────
rex_api_function::register('twgb_load_module', \FriendsOfRedaxo\TwGridBuilder\Api::class);

// ── Frontend: Grid-CSS wird NICHT automatisch eingebunden ────────────────────
// Bitte tw-gridbuilder-grid.css manuell in den Projekt-Build-Prozess einbinden.
// Siehe README → „Grid-CSS in den Build-Prozess einbinden".
//
// Optional: Pfad für automatisches Kopieren der Grid-CSS konfigurieren.
// Einmalig setzen z.B. per Konsole oder install.php:
//   rex_addon::get('tw_gridbuilder')->setConfig('css_output_path', '/absoluter/pfad/zur/grid.css');
// Leer lassen (Standardwert '') um das Kopieren zu deaktivieren.
if (!rex::isBackend()) {
    $addon = rex_addon::get('tw_gridbuilder');
    $cssOutputPath = (string) $addon->getConfig('css_output_path', '');
    if ($cssOutputPath !== '') {
        $source = $addon->getPath('assets/tw-gridbuilder-grid.css');
        if (!file_exists($cssOutputPath) || filemtime($source) > filemtime($cssOutputPath)) {
            @copy($source, $cssOutputPath);
        }
    }
    return;
}

// ── POST-Daten: __layout__ JSON → REX_INPUT_VALUE[1] ────────────────────────
if (isset($_POST['REX_INPUT_VALUE']['twgb']['__layout__'])) {
    $layout_json = $_POST['REX_INPUT_VALUE']['twgb']['__layout__'];
    if (json_decode($layout_json) !== null) {
        $_POST['REX_INPUT_VALUE'][1]    = $layout_json;
        $_REQUEST['REX_INPUT_VALUE'][1] = $layout_json;
    }
    unset($_POST['REX_INPUT_VALUE']['twgb'], $_REQUEST['REX_INPUT_VALUE']['twgb']);
}

// ── Assets einbinden ─────────────────────────────────────────────────────────
$addon = rex_addon::get('tw_gridbuilder');
rex_view::addCssFile($addon->getAssetsUrl('tw-gridbuilder.css?v=' . $addon->getVersion()));
rex_view::addJsFile($addon->getAssetsUrl('tw-gridbuilder.js?v='   . $addon->getVersion()));
