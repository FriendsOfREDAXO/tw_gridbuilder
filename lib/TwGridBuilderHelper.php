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

class Helper
{
    /**
     * Ersetzt REX_VALUE[n]-Token im Modulcode durch echte Werte
     * und gibt das gerenderte HTML zurück.
     */
    public static function renderModule(int $moduleId, array $values): string
    {
        $sql = \rex_sql::factory();
        $sql->setQuery(
            'SELECT output FROM ' . \rex::getTablePrefix() . 'module WHERE id = :id LIMIT 1',
            ['id' => $moduleId]
        );
        if ($sql->getRows() === 0) return '';

        $code = self::injectValues($sql->getValue('output'), $values);
        ob_start();
        try {
            eval('?>' . $code);
        } catch (\Throwable $e) {
            ob_end_clean();
            return '<p style="color:#ef4444;font-size:11px;">⚠ ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
        return ob_get_clean();
    }

    /**
     * Ersetzt 'REX_VALUE[n]', "REX_VALUE[n]" und bare REX_VALUE[n]
     * durch var_export()-Stringliterale mit den echten Werten.
     */
    public static function injectValues(string $code, array $values): string
    {
        $resolveValue = static function (int $n) use ($values): string {
            $val = $values[$n] ?? $values[(string) $n] ?? null;
            return match (true) {
                $val === null  => '',
                is_array($val) => json_encode($val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                default        => (string) $val,
            };
        };

        // REX_VALUE[n], REX_VALUE[id=n] und REX_VALUE[id=n output=html ...] → gespeicherter Wert
        // (REDAXO erlaubt bei Nicht-mform-Modulen zusätzliche Parameter nach der ID, z.B. "output=html")
        // Steht das Token in PHP-String-Anführungszeichen ("REX_VALUE[1]"), wird ein
        // quotiertes PHP-Literal eingesetzt. Steht es bare im HTML-Text (z.B. <div>REX_VALUE[id=1 output=html]</div>
        // oder als dynamischer Tag-Name <REX_VALUE[2]>), muss der Rohwert ohne PHP-Quoting eingesetzt werden -
        // sonst landen sichtbare Anführungszeichen/Escape-Backslashes im gerenderten HTML.
        $code = preg_replace_callback(
            "/(['\"]?)REX_VALUE\[(?:id=)?(\d+)(?:\s+[^\]]*)?\](['\"]?)/",
            static function (array $m) use ($resolveValue): string {
                $val = $resolveValue((int) $m[2]);
                return ($m[1] !== '' && $m[3] !== '') ? var_export($val, true) : $val;
            },
            $code
        );
        // REX_MEDIA[n], REX_MEDIA[id=n ...] → Dateiname aus __media_n (via addMediaField)
        $code = preg_replace_callback(
            "/(['\"]?)REX_MEDIA\[(?:id=)?(\d+)(?:\s+[^\]]*)?\](['\"]?)/",
            static function (array $m) use ($values): string {
                $val = self::resolveSanitized($values, '__media_' . (int) $m[2]);
                return ($m[1] !== '' && $m[3] !== '') ? var_export($val, true) : $val;
            },
            $code
        );
        // REX_LINK[n], REX_LINK[id=n ...] → gespeicherte Artikel-ID aus __link_n (via addLinkField)
        $code = preg_replace_callback(
            "/(['\"]?)REX_LINK\[(?:id=)?(\d+)(?:\s+[^\]]*)?\](['\"]?)/",
            static function (array $m) use ($values): string {
                $val = self::resolveSanitized($values, '__link_' . (int) $m[2]);
                return ($m[1] !== '' && $m[3] !== '') ? var_export($val, true) : $val;
            },
            $code
        );
        return $code;
    }

    /**
     * Liest $values[$key] und entfernt unersetzte REX_*[n]-Platzhalter aus alten Saves.
     */
    private static function resolveSanitized(array $values, string $key): string
    {
        $raw = $values[$key] ?? '';
        return preg_match('/^REX_[A-Z_]+\[\d+\]$/i', (string) $raw) ? '' : (string) $raw;
    }
}
