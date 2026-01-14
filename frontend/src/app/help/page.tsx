'use client';

import {
    Terminal,
    FileText,
    PlayCircle,
    ShieldCheck,
    BookOpen,
    Image as ImageIcon,
    Video,
    Workflow
} from 'lucide-react';

export default function HelpPage() {
    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Hilfe & Dokumentation</h1>
                <p className="text-neutral-400">Anleitungen und Referenzen für den Serial Switch Configurator.</p>
            </div>

            {/* Workflow Section */}
            <div className="rounded-xl border border-blue-900/50 bg-blue-950/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Workflow className="h-6 w-6 text-blue-400" />
                    <h2 className="text-xl font-bold text-white">Workflow Übersicht</h2>
                </div>
                <div className="prose prose-invert max-w-none">
                    <p className="text-neutral-300">
                        Hier wird der allgemeine Arbeitsablauf beschrieben. So kann man maximale Effizienz und Zeitersparnis aus dem Tool holen.
                    </p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Placeholder Steps */}
                        <WorkflowStep number="1" title="Verbinden" description="Verbindung zum Switch herstellen. (Menüpunkt Live Console)" />
                        <WorkflowStep number="2" title="Erstellen" description="Template aufzeichnen (Record in Live Console) oder eigenes Template erstellen. (Menüpunkt Templates)" />
                        <WorkflowStep number="3" title="Ausführen" description="Konfiguration automatisch anwenden. (Menüpunkt Jobs -> Job erstellen)" />
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Section
                    icon={<Terminal className="h-6 w-6 text-blue-400" />}
                    title="Live Konsole"
                    description="Kein Bock mehr auf SSH und Screen? -> Direkte Interaktion mit verbundenen Geräten über deinen Browser."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li>Verbinde dich einfach indem du in <strong>Live Console</strong> deinen Port auswählst. </li>
                        <li>Jetzt kannst du einfach deine Befehle eingeben, wie du es gewohnt bist.</li>
                        <li>Du kannst oben Rechts auf <strong>Record</strong> klicken, um deine Befehle aufzunehmen und deinen Ablauf im Anschluss in ein Template für Automatisierung zu verwandeln.</li>
                        <li>Wenn das angeschlossene Gerät kein Backspace kennt, kannst du es über das Drop down Menü oben übersetzen lassen.</li>
                        <li>Du kannst entweder mit Rechtsklick & Kopieren Outputs speichern oder über <strong>Command to Capture</strong> einen Befehl ausführen und das Ergebnis speichern.</li>
                    </ul>

                    <MediaPlaceholder type="screenshot" label="Screenshot der Live Konsole" />
                </Section>

                <Section
                    icon={<FileText className="h-6 w-6 text-emerald-400" />}
                    title="Templates"
                    description="Standardisierung von Konfigurationen. Und anschließende Automatisierung."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li><strong>Templates</strong> definieren wiederverwendbare Schritte.</li>
                        <li>Nutze Variablen wie <code>{`{{ hostname }}`}</code> für dynamische Inhalte. (z.B. unterschiedliche IP Adresse pro Gerät)</li>
                        <li><strong>Verifikation</strong> ermöglicht dir automatisierte Prüfung von Konfigurationen per Regex. (z.B. prüfen ob der hostname übernommen wurde mit <code> hostname {`{{ hostname }}`}</code>)</li>
                        <li>Der <strong>Template Builder</strong> ermöglicht visuelles Erstellen per Drag-and-Drop.</li>
                    </ul>
                    {/* Placeholder for Media */}
                    <MediaPlaceholder type="video" label="Video: Template Erstellung" />
                </Section>

                <Section
                    icon={<PlayCircle className="h-6 w-6 text-amber-400" />}
                    title="Jobs & Automatisierung"
                    description="Templates auf mehrere Geräte anwenden."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li>Erstellen Sie einen <strong>Job</strong>, um ein Template auf einen oder mehrere Port anzuwenden.</li>
                        <li>Füllen Sie benötigte Variablen (z.B. IP, VLAN) aus.</li>
                        <li>Verfolgen Sie Logs und Status im <strong>Jobs</strong> Dashboard.</li>
                        <li>Wenn das Template <strong>Verifikationsschritte</strong> definiert hat, wird dir der <strong>Beweis</strong> für die Konfiguration angezeigt. </li>
                    </ul>
                    <MediaPlaceholder type="screenshot" label="Screenshot der Job-Übersicht" />
                </Section>

                <Section
                    icon={<ShieldCheck className="h-6 w-6 text-rose-400" />}
                    title="Verifikation & Sicherheit"
                    description="Fehlervermeidung und Beweise."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li><strong>Regex Match</strong>: Prüft, ob ein Muster existiert.</li>
                        <li><strong>Regex Not Present</strong>: Prüft, ob ein Muster NICHT existiert.</li>
                        <li><strong>Contains</strong>: Einfache Textsuche.</li>
                        <li>Template aus History unterstützt keine Check Types, nur einfache Regex Match. Du kannst aber nach dem Erstellen des Templates die Check Types über das Editieren hinzufügen.</li>
                    </ul>
                </Section>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-6 mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-6 w-6 text-neutral-300" />
                    <h2 className="text-xl font-semibold text-white">Allgemeine Tipps</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6 text-sm text-neutral-400">
                    <div>
                        <h3 className="font-bold text-neutral-300 mb-2">Live Konsolen History in Template verwandeln</h3>
                        <p>Wenn du ganz einfach und Hands On ein Template erstellen möchtest, kannst du deine Konsolen-Session einfach aufzeichnen (Record Button) und dann in ein Template verwandeln.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-neutral-300 mb-2">Fehlerbehebung</h3>
                        <p>Falls ein Gerät nicht antwortet, prüfen Sie die physische Verbindung.</p>
                        <p>Wenn ein Template nicht funktioniert, verbinden sie sich über die Live Konsole auf das Gerät und überprüfen sie ob das Gerät z.B. in einem bestimmten Config Mode ist oder gerade ein Wizard eine Eingabe erwartet.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ icon, title, description, children }: { icon: React.ReactNode, title: string, description: string, children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 hover:border-neutral-700 transition-colors">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="text-sm text-neutral-500">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

function WorkflowStep({ number, title, description }: { number: string, title: string, description: string }) {
    return (
        <div className="flex items-center gap-3 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 font-bold text-white shrink-0">
                {number}
            </div>
            <div>
                <div className="font-bold text-white text-sm">{title}</div>
                <div className="text-xs text-neutral-400">{description}</div>
            </div>
        </div>
    )
}

function MediaPlaceholder({ type, label }: { type: 'video' | 'screenshot', label: string }) {
    return (
        <div className="mt-4 border-2 border-dashed border-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center text-neutral-600 bg-neutral-950/30 min-h-[150px]">
            {type === 'video' ? <Video className="h-8 w-8 mb-2 opacity-50" /> : <ImageIcon className="h-8 w-8 mb-2 opacity-50" />}
            <span className="text-xs font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                INSERT {type.toUpperCase()}: {label}
            </span>
        </div>
    );
}
