<?php

/** @var rex_addon $this */

// Der neue Laufzeitkontext steckt sowohl im Add-on-Helper als auch in den
// Input-/Output-Vorlagen des GridBuilder-Moduls. Bestehende Moduldefinitionen
// werden bewusst nicht automatisch überschrieben, da sie projektspezifisch
// angepasst sein können. Der Hinweis erscheint nur beim Sprung auf 2.14.0.
if (rex_string::versionCompare($this->getVersion(), '2.14.0', '<')) {
    $this->setProperty(
        'successmsg',
        '<br><strong>Updatehinweis TW GridBuilder 2.14.0:</strong> '
        . 'Für den neuen <code>$twgbContext</code> bitte Input und Output der bestehenden '
        . 'GridBuilder-Moduldefinition auf Modulversion <strong>2.10.0</strong> aktualisieren. '
        . 'Das bestehende Modul dabei nicht löschen oder neu anlegen, sondern nur seinen Code ersetzen. '
        . 'Die gespeicherten Slice-Inhalte und das JSON in <code>REX_VALUE[1]</code> bleiben unverändert erhalten.'
    );
}
