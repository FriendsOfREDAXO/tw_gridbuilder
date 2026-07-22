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

namespace FriendsOfRedaxo\TwGridBuilder;

class Api extends \rex_api_function
{
    protected $published = true;

    public function execute(): \rex_api_result
    {
        if (!\rex::isBackend() || !\rex::getUser()) {
            throw new \rex_api_exception('Access denied');
        }

        // CSRF-Schutz: Token wird in module/input.php via rex_csrf_token::factory('twgb_load_module')
        // erzeugt und vom Client (apiPost) unter rex_csrf_token::PARAM mitgeschickt.
        if (!\rex_csrf_token::factory('twgb_load_module')->isValid()) {
            throw new \rex_api_exception('CSRF token invalid');
        }

        // Preview-Modus: rendert alle Module einer Zelle als HTML
        if (\rex_request('twgb_preview', 'int', 0)) {
            $cell    = json_decode(\rex_request('cell_data', 'string', '{}'), true) ?: [];
            $preview = '';
            foreach ($cell['modules'] ?? [] as $slot) {
                $mid = (int)($slot['module_id'] ?? 0);
                if ($mid) $preview .= Helper::renderModule($mid, $slot['values'] ?? []);
            }
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['preview' => $preview], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Normaler Modus: Modul-Input-Formular laden
        $moduleId = \rex_request('module_id', 'int', 0);
        $cellId   = \rex_request('cell_id',   'string', '');

        if (!$moduleId || !$cellId) {
            throw new \rex_api_exception('Missing parameters');
        }

        $sql = \rex_sql::factory();
        $sql->setQuery('SELECT input FROM ' . \rex::getTablePrefix() . 'module WHERE id = :id LIMIT 1', ['id' => $moduleId]);
        if ($sql->getRows() === 0) {
            throw new \rex_api_exception('Module not found');
        }
        $moduleInput = $sql->getValue('input');

        // Superglobals sichern — verhindert Vorausfüllung durch andere Instanzen
        $backupGet     = $_GET;
        $backupPost    = $_POST;
        $backupRequest = $_REQUEST;

        $_GET['function'] = 'add';
        unset($_POST['REX_INPUT_VALUE'], $_REQUEST['REX_INPUT_VALUE']);

        // Context 'module' + Stub-contextData sind nötig, damit rex_var_media/-value/-link
        // ihre Widgets rendern (getOutput() bricht sonst mit return false ab und der Token
        // bleibt als roher Text stehen). Der Stub liefert für alle REX_*-Werte leer -
        // die echten Werte werden clientseitig via prefillForm() im __media_/__link_-Namespace gesetzt.
        $stub = new class extends \rex_sql {
            public function __construct() {}
            public function getValue($column) { return ''; }
        };

        ob_start();
        try {
            $inputCode = \rex_var::parse($moduleInput, \rex_var::ENV_INPUT, 'module', $stub);
            eval('?>' . $inputCode);
        } catch (\Throwable $e) {
            echo '<div class="alert alert-warning">Fehler: ' . htmlspecialchars($e->getMessage()) . '</div>';
        }
        $html = ob_get_clean();

        $_GET     = $backupGet;
        $_POST    = $backupPost;
        $_REQUEST = $backupRequest;

        $ns   = 'REX_INPUT_VALUE[twgb][' . htmlspecialchars($cellId, ENT_QUOTES) . ']';
        $html = preg_replace('/\bREX_INPUT_VALUE\[(\d+)\]/i',    $ns . '[$1]',  $html);
        $html = preg_replace('/\bREX_INPUT_VALUE\[(\d+)\]\[/i',  $ns . '[$1][', $html);
        // REX_INPUT_MEDIA[n] (addMediaField mit einfacher numerischer ID) → als __media_n speichern
        $html = preg_replace('/\bREX_INPUT_MEDIA\[(\d+)\]/i',    $ns . '[__media_$1]', $html);
        // REX_MEDIA[n] in value-Attributen → leer ersetzen (MForm setzt Token als Platzhalter;
        // verhindert 404 beim Preview-Load und wird via prefillForm mit echtem Wert befüllt)
        $html = preg_replace('/\bREX_MEDIA\[(\d+)\]/i', '', $html);
        // REX_INPUT_LINK[n] (addLinkField, z.B. hidden field des Linkmap-Widgets) → als __link_n speichern
        $html = preg_replace('/\bREX_INPUT_LINK\[(\d+)\]/i',    $ns . '[__link_$1]', $html);
        // REX_LINK[n] in value-Attributen → leer ersetzen (analog REX_MEDIA; echter Wert kommt via prefillForm)
        $html = preg_replace('/\bREX_LINK\[(\d+)\]/i', '', $html);

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['html' => $html], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
