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

if (rex_string::versionCompare($this->getVersion(), '2.20.0', '<')) {
    $this->setProperty(
        'successmsg',
        '<br><strong>Updatehinweis TW GridBuilder 2.20.0:</strong> '
        . 'Neues optionales Feld <code>Farbkontext</code> (<code>data-surface</code>) pro Zeile/Zelle. '
        . 'Dafür bitte <code>module/output.php</code> UND <code>module/input.php</code> der bestehenden '
        . 'GridBuilder-Moduldefinition „Standard (TW GridBuilder)" auf diese Version aktualisieren '
        . '(nur den Code ersetzen, Modul nicht neu anlegen). Gespeicherte Slice-Inhalte und '
        . '<code>REX_VALUE[1]</code> bleiben unverändert; ohne gesetzten Farbkontext ändert sich die '
        . 'Ausgabe nicht. <code>data-surface</code> wirkt nur mit passendem Projekt-CSS – '
        . 'Anleitung inkl. Copy-Paste-CSS in <code>redaxo/src/addons/tw_gridbuilder/docs/farbkontext.md</code>.'
    );
}

if (rex_string::versionCompare($this->getVersion(), '2.21.0', '<')) {
    $this->setProperty(
        'successmsg',
        '<br><strong>Updatehinweis TW GridBuilder 2.21.0:</strong> '
        . 'Neues, optionales Frontend-Editing („Inhalte bearbeiten“), standardmäßig <strong>aus</strong> '
        . '(Addon-Config <code>frontend_edit</code> = 1 zum Aktivieren). Dafür bitte '
        . '<code>module/output.php</code> der bestehenden GridBuilder-Moduldefinition auf Version '
        . '<strong>2.21.0</strong> aktualisieren (nur den Code ersetzen, Modul nicht neu anlegen). '
        . 'Ohne diese Aktualisierung und ohne aktivierte Config ändert sich nichts; gespeicherte '
        . 'Slice-Inhalte und <code>REX_VALUE[1]</code> bleiben unverändert. Module werden über das Flag '
        . '<code>frontend_edit = "1"</code> im Input freigegeben – siehe README, Abschnitt „Frontend-Editing“.'
    );
}
