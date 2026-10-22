<?php

/**
 *  This file is part of the REDAXO-AddOn "tw_gridbuilder".
 *
 *  Frontend-Editing (optional, per Addon-Config `frontend_edit` = 1 aktivierbar):
 *  Eingeloggte Backend-User sehen um Slots von Modulen mit `frontend_edit = "1"`
 *  im base-module-config-Kommentar einen Marker und können Werte im Kontext ändern.
 *  Ohne Config-Flag, ohne Backend-Session oder ohne Modul-Flag: keine Ausgabe, kein Verhalten.
 */

namespace FriendsOfRedaxo\TwGridBuilder;

class Frontend
{
    /** @var bool wurde in diesem Request mindestens ein Slot markiert? */
    private static bool $used = false;

    /** @var array<int, bool> */
    private static array $moduleFlags = [];

    public static function isActive(): bool
    {
        if (\rex::isBackend() || !\rex_addon::get('tw_gridbuilder')->getConfig('frontend_edit', 0)) {
            return false;
        }
        return null !== \rex_backend_login::createUser();
    }

    /** Modul trägt `frontend_edit = "1"` im Kommentar-Kopf und der User darf es. */
    public static function moduleEnabled(int $moduleId): bool
    {
        if (!isset(self::$moduleFlags[$moduleId])) {
            $sql = \rex_sql::factory();
            $sql->setQuery('SELECT input FROM ' . \rex::getTablePrefix() . 'module WHERE id = :id', ['id' => $moduleId]);
            $head = $sql->getRows() ? substr((string) $sql->getValue('input'), 0, 1500) : '';
            self::$moduleFlags[$moduleId] = 1 === preg_match('/^\s*frontend_edit\s*=\s*"1"/m', $head);
        }
        return self::$moduleFlags[$moduleId]
            && \rex::requireUser()->getComplexPerm('modules')->hasPerm($moduleId);
    }

    /** Öffnendes Wrapper-Tag; leer, wenn der Slot nicht bearbeitbar ist. `display:contents` = kein Layout-Einfluss. */
    public static function open(int $sliceId, string $cellId, string $slotId, int $moduleId): string
    {
        // Ohne Slice-/Zell-/Slot-ID (z. B. Altdaten im Legacy-Format) kann nichts gespeichert werden
        if ($sliceId <= 0 || '' === $cellId || '' === $slotId || !self::isActive() || !self::moduleEnabled($moduleId)) {
            return '';
        }
        self::$used = true;
        return '<div data-twgb-slot data-slice="' . $sliceId . '" data-cell="' . htmlspecialchars($cellId, ENT_QUOTES)
            . '" data-slot="' . htmlspecialchars($slotId, ENT_QUOTES) . '" data-module="' . $moduleId . '" style="display:contents">';
    }

    /** Assets nur einfügen, wenn ein Slot markiert wurde. */
    public static function injectAssets(string $content): string
    {
        if (!self::$used) {
            return $content;
        }
        $addon = \rex_addon::get('tw_gridbuilder');
        $v = $addon->getVersion() . '.' . filemtime($addon->getPath('assets/tw-gridbuilder-fe.js'));
        $cfg = json_encode([
            'url' => \rex_url::frontendController([], false),
            'csrf' => \rex_csrf_token::factory('twgb_fe')->getValue(),
            'csrfField' => \rex_csrf_token::PARAM,
            'cke' => self::ckeConfig(),
            'css' => (string) file_get_contents($addon->getPath('assets/tw-gridbuilder-fe.css')),
        ]);
        $tags = '<script>window.TWGB_FE=' . $cfg . ';</script>'
            . '<script src="' . $addon->getAssetsUrl('tw-gridbuilder-fe.js?v=' . $v) . '" defer></script>';
        return str_replace('</body>', $tags . '</body>', $content);
    }

    /**
     * Assets des cke5-Addons (gleiche Reihenfolge wie im Backend, siehe Cke5AssetsProvider::provideCke5BaseData),
     * damit Textfelder mit class `cke5-editor` im Frontend den echten Profil-Editor bekommen. Ohne cke5: null.
     *
     * @return array{scripts: list<string>, css: list<string>, rex: array<string, mixed>}|null
     */
    private static function ckeConfig(): ?array
    {
        $cke5 = \rex_addon::get('cke5');
        if (!$cke5->isAvailable() || !class_exists(\Cke5\PluginRegistry::class) || !class_exists(\Cke5\Provider\Cke5AssetsProvider::class)) {
            return null;
        }
        try {
            $editorPath = (string) $cke5->getConfig('license_cke5_js_path');
            $trPath = (string) $cke5->getConfig('license_translations_path', 'assets/addons/cke5/vendor/ckeditor5-modern/translations/');
            $trPath = '' !== $trPath ? $trPath : 'assets/addons/cke5/vendor/ckeditor5-modern/translations/';

            $scripts = [\rex_url::base('assets/core/jquery.min.js'), \rex_url::base('' !== $editorPath ? $editorPath : 'assets/addons/cke5/vendor/ckeditor5-modern/ckeditor.js')];
            $langs = array_unique([
                \Cke5\Provider\Cke5AssetsProvider::getLang(\Cke5\Utils\Cke5Lang::getUserLang()),
                \Cke5\Provider\Cke5AssetsProvider::getLang(\Cke5\Utils\Cke5Lang::getOutputLang()),
            ]);
            foreach ($langs as $lang) {
                $scripts[] = \rex_url::base($trPath) . $lang . '.js';
            }
            foreach (['redaxo-link-integration', 'redaxo-media-alt', 'redaxo-media-image', 'redaxo-for-lists', 'redaxo-for-table', 'redax-widget-video',
                'redaxo-clear-widget', 'redaxo-snippets', 'redaxo-quickedit', 'redaxo-paste-plain-text-toggle', 'redaxo-markdown-paste-toggle',
                'redaxo-minimap-toggle', 'redaxo-for-a11y'] as $plugin) {
                $scripts[] = $cke5->getAssetsUrl('plugins/' . $plugin . '.js');
            }
            foreach (\Cke5\PluginRegistry::all() as $plugin) {
                if (isset($plugin['url']) && is_string($plugin['url']) && '' !== $plugin['url']) {
                    $scripts[] = $plugin['url'];
                }
            }
            $scripts[] = $cke5->getAssetsUrl(\Cke5\Creator\Cke5ProfilesCreator::PROFILES_FILENAME);
            $scripts[] = $cke5->getAssetsUrl('cke5.js');

            return [
                'scripts' => $scripts,
                'css' => [\rex_url::base('assets/addons/cke5/vendor/ckeditor5-modern/ckeditor.css'), $cke5->getAssetsUrl('css/cke5.css')],
                'rex' => ['cke5theme' => 'notheme', 'cke5ExternalPlugins' => \Cke5\PluginRegistry::clientConfig()],
            ];
        } catch (\Throwable $e) {
            \rex_logger::logException($e);
            return null;
        }
    }
}
