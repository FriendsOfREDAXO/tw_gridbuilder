<?php

/**
 *  This file is part of the REDAXO-AddOn "tw_gridbuilder".
 *
 *  Frontend-Editing-API: op=form (Modulformular + Werte) und op=save (Merge der Werte eines Slots).
 */

namespace FriendsOfRedaxo\TwGridBuilder;

class FrontendApi extends \rex_api_function
{
    protected $published = true;

    public function execute(): \rex_api_result
    {
        if (!Frontend::isActive() || !\rex_csrf_token::factory('twgb_fe')->isValid()) {
            $this->json(['error' => 'Access denied'], \rex_response::HTTP_FORBIDDEN);
        }

        $op = \rex_request('op', 'string');
        if ('media' === $op || 'links' === $op) {
            $this->json('media' === $op ? $this->searchMedia() : ['items' => $this->searchArticles()]);
        }

        [$slice, $data, $cell, $slotKey] = $this->locate();
        $slot = &$data['rows'][$cell[0]]['cells'][$cell[1]]['modules'][$slotKey];
        $moduleId = (int) ($slot['module_id'] ?? 0);

        if (!Frontend::moduleEnabled($moduleId)) {
            $this->json(['error' => 'Module not editable'], \rex_response::HTTP_FORBIDDEN);
        }

        if (!in_array(\rex_request('op', 'string'), ['save', 'preview'], true)) {
            $this->json(['html' => $this->renderForm($moduleId, $this->ns()), 'values' => $slot['values'] ?? new \stdClass()]);
        }

        // Merge statt Ersetzen: im Frontend ausgeblendete Felder (Medien, Links ...) bleiben erhalten.
        $new = json_decode(\rex_request('values', 'string', '{}'), true);
        if (!is_array($new)) {
            $this->json(['error' => 'Invalid values'], \rex_response::HTTP_BAD_REQUEST);
        }
        $slot['values'] = array_replace_recursive($slot['values'] ?? [], $new);

        $render = fn (): string => Helper::renderModule($moduleId, $slot['values'], [
            'parent_slice_id' => (int) $slice['id'],
            'article_id' => (int) $slice['article_id'],
            'clang_id' => (int) $slice['clang_id'],
            'cell_id' => (string) \rex_request('cell', 'string'),
            'slot_id' => (string) \rex_request('slot', 'string'),
        ]);

        // Vorschau: nur rendern, nichts speichern
        if ('preview' === \rex_request('op', 'string')) {
            $this->json(['ok' => true, 'html' => $render()]);
        }

        $sql = \rex_sql::factory();
        $sql->setTable(\rex::getTable('article_slice'));
        $sql->setWhere(['id' => $slice['id']]);
        $sql->setValue('value1', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $sql->addGlobalUpdateFields();
        $sql->update();

        \rex_article_cache::delete((int) $slice['article_id'], (int) $slice['clang_id']);
        if ($art = \rex_article::get((int) $slice['article_id'], (int) $slice['clang_id'])) {
            \rex_extension::registerPoint(new \rex_extension_point_art_content_updated($art, 'slice_updated', ''));
        }

        $this->json(['ok' => true, 'html' => $render()]);
    }

    /** @return array{0: array<string, mixed>, 1: array<string, mixed>, 2: array{0: int, 1: int}, 3: int} */
    private function locate(): array
    {
        $sql = \rex_sql::factory();
        $rows = $sql->getArray(
            'SELECT id, article_id, clang_id, value1 FROM ' . \rex::getTable('article_slice') . ' WHERE id = :id AND revision = 0',
            ['id' => \rex_request('slice', 'int', 0)]
        );
        $slice = $rows[0] ?? null;
        $data = $slice ? json_decode((string) $slice['value1'], true) : null;
        $art = $slice ? \rex_article::get((int) $slice['article_id'], (int) $slice['clang_id']) : null;
        if (!is_array($data) || !$art || !\rex::requireUser()->getComplexPerm('structure')->hasCategoryPerm($art->getCategoryId())) {
            $this->json(['error' => 'Not found'], \rex_response::HTTP_NOT_FOUND);
        }

        $cellId = \rex_request('cell', 'string');
        $slotId = \rex_request('slot', 'string');
        foreach ($data['rows'] ?? [] as $r => $row) {
            foreach ($row['cells'] ?? [] as $c => $cell) {
                if (($cell['id'] ?? null) !== $cellId) {
                    continue;
                }
                foreach ($cell['modules'] ?? [] as $s => $slot) {
                    if (($slot['id'] ?? null) === $slotId) {
                        return [$slice, $data, [$r, $c], $s];
                    }
                }
            }
        }
        $this->json(['error' => 'Slot not found'], \rex_response::HTTP_NOT_FOUND);
    }

    private function ns(): string
    {
        return \rex_request('cell', 'string') . '_' . \rex_request('slot', 'string');
    }

    /** Modul-Input rendern, REX_INPUT_VALUE[n] auf den Slot-Namespace umbiegen (wie Api::execute, nur Basisfelder). */
    private function renderForm(int $moduleId, string $cellId): string
    {
        $sql = \rex_sql::factory();
        $sql->setQuery('SELECT input FROM ' . \rex::getTable('module') . ' WHERE id = :id', ['id' => $moduleId]);
        $stub = new class extends \rex_sql {
            public function __construct() {}
            public function getValue($column) { return ''; }
        };

        $backup = [$_GET, $_POST, $_REQUEST];
        $_GET['function'] = 'add';
        unset($_POST['REX_INPUT_VALUE'], $_REQUEST['REX_INPUT_VALUE']);
        ob_start();
        try {
            eval('?>' . \rex_var::parse((string) $sql->getValue('input'), \rex_var::ENV_INPUT, 'module', $stub));
        } catch (\Throwable $e) {
            echo '<p>Fehler: ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
        $html = ob_get_clean();
        [$_GET, $_POST, $_REQUEST] = $backup;

        // Medien-/Link-Widgets landen wie im Backend-Editor im __media_/__link_-Namespace (siehe Api::execute)
        $ns = 'REX_INPUT_VALUE[twgb][' . htmlspecialchars($cellId, ENT_QUOTES) . ']';
        $html = preg_replace(
            ['/\bREX_INPUT_VALUE\[(\d+)\]/i', '/\bREX_INPUT_MEDIA\[(\d+)\]/i', '/\bREX_INPUT_MEDIALIST\[(\d+)\]/i', '/\bREX_INPUT_LINK\[(\d+)\]/i', '/\bREX_(?:MEDIA|MEDIALIST|LINK)\[\d+\]/i'],
            [$ns . '[$1]', $ns . '[__media_$1]', $ns . '[__medialist_$1]', $ns . '[__link_$1]', ''],
            $html
        );
        return $html;
    }

    /** @return array{items: list<array{name: string, title: string}>, more: bool, cats: list<array{id: int, name: string}>} Bilder (seitenweise, optional pro Kategorie), die der User sehen darf */
    private function searchMedia(): array
    {
        $perm = \rex::requireUser()->getComplexPerm('media');
        $cat = \rex_request('cat', 'int', -1);
        $offset = max(0, \rex_request('offset', 'int', 0));
        $per = 60;

        $where = 'filetype LIKE "image/%" AND (filename LIKE :q OR title LIKE :q)';
        $params = ['q' => '%' . \rex_request('q', 'string') . '%'];
        if ($cat >= 0) {
            $where .= ' AND category_id = :cat';
            $params['cat'] = $cat;
        }
        // Rechte-Filter in SQL: sonst würden ausgefilterte Treffer die Seiten „leer“ machen
        $allowed = array_filter(array_map(
            static fn (array $r): int => (int) $r['id'],
            \rex_sql::factory()->getArray('SELECT id FROM ' . \rex::getTable('media_category'))
        ), static fn (int $id): bool => $perm->hasCategoryPerm($id));
        $allowed[] = 0;
        $where .= ' AND category_id IN (' . implode(',', array_map('intval', $allowed)) . ')';

        $rows = \rex_sql::factory()->getArray(
            'SELECT filename, title FROM ' . \rex::getTable('media') . ' WHERE ' . $where
            . ' ORDER BY updatedate DESC LIMIT ' . ($per + 1) . ' OFFSET ' . $offset,
            $params
        );
        $cats = [];
        if (0 === $offset) {
            foreach (\rex_sql::factory()->getArray('SELECT id, name FROM ' . \rex::getTable('media_category') . ' ORDER BY name') as $r) {
                if ($perm->hasCategoryPerm((int) $r['id'])) {
                    $cats[] = ['id' => (int) $r['id'], 'name' => (string) $r['name']];
                }
            }
        }
        return [
            'items' => array_map(static fn (array $r): array => ['name' => $r['filename'], 'title' => (string) $r['title']], array_slice($rows, 0, $per)),
            'more' => count($rows) > $per,
            'cats' => $cats,
        ];
    }

    /** @return list<array{value: string, name: string}> Online-Artikel der aktuellen Sprache als redaxo://-Links */
    private function searchArticles(): array
    {
        $rows = \rex_sql::factory()->getArray(
            'SELECT id, name FROM ' . \rex::getTable('article') . ' WHERE clang_id = :c AND status = 1 AND name LIKE :q ORDER BY name LIMIT 40',
            ['c' => \rex_clang::getCurrentId(), 'q' => '%' . \rex_request('q', 'string') . '%']
        );
        return array_map(static fn (array $r): array => ['value' => 'redaxo://' . $r['id'], 'name' => (string) $r['name']], $rows);
    }

    /** @return never */
    private function json(array $payload, string $status = '200 OK'): void
    {
        \rex_response::cleanOutputBuffers();
        \rex_response::setStatus($status);
        \rex_response::sendJson($payload);
        exit;
    }
}
