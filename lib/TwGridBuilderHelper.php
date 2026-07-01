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

        // REX_VALUE[n] und REX_VALUE[id=n] → gespeicherter Wert
        $code = preg_replace_callback(
            "/(['\"]?)REX_VALUE\[(?:id=)?(\d+)\](['\"]?)/",
            static function (array $m) use ($resolveValue): string {
                return var_export($resolveValue((int) $m[2]), true);
            },
            $code
        );
        // REX_MEDIA[n] → Dateiname aus __media_n (via addMediaField mit numerischer ID)
        $code = preg_replace_callback(
            "/(['\"]?)REX_MEDIA\[(\d+)\](['\"]?)/",
            static function (array $m) use ($values): string {
                $key = '__media_' . (int) $m[2];
                $raw = $values[$key] ?? $values[(string) $key] ?? '';
                // Sanitize: unreplaced REX tokens aus alten Saves bereinigen
                $val = preg_match('/^REX_[A-Z_]+\[\d+\]$/i', (string) $raw) ? '' : (string) $raw;
                return var_export($val, true);
            },
            $code
        );
        return $code;
    }
}
