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
                        Hier wird der allgemeine Arbeitsablauf beschrieben.
                        {/* TODO: Detaillierte Workflow-Beschreibung hier einfügen */}
                        (Platzhalter für detaillierte Workflow-Beschreibung: Vom Verbinden über das Erstellen von Templates bis zum Ausführen von Jobs.)
                    </p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Placeholder Steps */}
                        <WorkflowStep number="1" title="Verbinden" description="Verbindung zum Switch herstellen." />
                        <WorkflowStep number="2" title="Erstellen" description="Template oder Makro aufzeichnen." />
                        <WorkflowStep number="3" title="Ausführen" description="Konfiguration automatisch anwenden." />
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Section
                    icon={<Terminal className="h-6 w-6 text-blue-400" />}
                    title="Live Konsole"
                    description="Direkte Interaktion mit verbundenen Geräten."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li>Verbinden Sie sich über das <strong>Dashboard</strong> oder den <strong>New Session</strong> Button.</li>
                        <li>Geben Sie Befehle direkt in das Terminal ein.</li>
                        <li>Nutzen Sie <strong>Record</strong>, um Befehlsfolgen als Makros aufzuzeichnen.</li>
                        <li>Speichern Sie Aufnahmen als <strong>Templates</strong> zur Wiederverwendung.</li>
                    </ul>
                    {/* Placeholder for Media */}
                    <MediaPlaceholder type="screenshot" label="Screenshot der Live Konsole" />
                </Section>

                <Section
                    icon={<FileText className="h-6 w-6 text-emerald-400" />}
                    title="Templates & Makros"
                    description="Standardisierung von Konfigurationen."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li><strong>Templates</strong> definieren wiederverwendbare Schritte.</li>
                        <li>Nutzen Sie Variablen wie <code>{`{{ hostname }}`}</code> für dynamische Inhalte.</li>
                        <li><strong>Verifikation</strong> nutzt Regex zur Validierung.</li>
                        <li>Der <strong>Builder</strong> ermöglicht visuelles Erstellen per Drag-and-Drop.</li>
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
                        <li>Erstellen Sie einen <strong>Job</strong>, um ein Template auf einen Port anzuwenden.</li>
                        <li>Füllen Sie benötigte Variablen (z.B. IP, VLAN) aus.</li>
                        <li>Verfolgen Sie Logs und Status im <strong>Jobs</strong> Dashboard.</li>
                    </ul>
                    <MediaPlaceholder type="screenshot" label="Screenshot der Job-Übersicht" />
                </Section>

                <Section
                    icon={<ShieldCheck className="h-6 w-6 text-rose-400" />}
                    title="Verifikation & Sicherheit"
                    description="Fehlervermeidung und Compliance."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li><strong>Regex Match</strong>: Prüft, ob ein Muster existiert.</li>
                        <li><strong>Regex Not Present</strong>: Prüft, ob ein Muster NICHT existiert.</li>
                        <li><strong>Contains</strong>: Einfache Textsuche.</li>
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
                        <h3 className="font-bold text-neutral-300 mb-2">Shortcuts</h3>
                        <p>Aktuell gelten die Standard-Browser-Shortcuts. Nutzen Sie Tab zur Navigation.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-neutral-300 mb-2">Fehlerbehebung</h3>
                        <p>Falls ein Gerät nicht antwortet, prüfen Sie die physische Verbindung.</p>
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
