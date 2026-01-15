'use client';

import { useState } from 'react';
import {
    Terminal,
    FileText,
    PlayCircle,
    ShieldCheck,
    BookOpen,
    Image as ImageIcon,
    Video,
    Workflow,
    X,
    Maximize2
} from 'lucide-react';

export default function HelpPage() {
    const [selectedMedia, setSelectedMedia] = useState<{ type: 'video' | 'screenshot', src: string, label: string } | null>(null);

    const closeLightbox = () => setSelectedMedia(null);
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

                    <MediaItem
                        type="screenshot"
                        src="/screenshot_console.png"
                        label="Screenshot der Live Konsole"
                        onClick={() => setSelectedMedia({ type: 'screenshot', src: '/screenshot_console.png', label: 'Screenshot der Live Konsole' })}
                    />
                </Section>

                <Section
                    icon={<FileText className="h-6 w-6 text-emerald-400" />}
                    title="Templates"
                    description="Standardisierung von Konfigurationen. Und anschließende Automatisierung."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li><strong>Templates</strong> definieren wiederverwendbare Schritte.</li>
                        <li>Nutze Variablen like <code>{`{{ hostname }}`}</code> for dynamische Inhalte. (z.B. unterschiedliche IP Adresse pro Gerät)</li>
                        <li><strong>Verifikation</strong> ermöglicht dir automatisierte Prüfung von Konfigurationen per Regex. (z.B. prüfen ob der hostname übernommen wurde mit <code> hostname {`{{ hostname }}`}</code>)</li>
                        <li>Der <strong>Template Builder</strong> ermöglicht visuelles Erstellen per Drag-and-Drop.</li>
                    </ul>
                    <MediaItem
                        type="video"
                        src="/video_template.webm"
                        label="Video: Template Erstellung"
                        onClick={() => setSelectedMedia({ type: 'video', src: '/video_template.webm', label: 'Video: Template Erstellung' })}
                    />
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
                    <MediaItem
                        type="screenshot"
                        src="/screenshot_jobs.png"
                        label="Screenshot der Job-Übersicht"
                        onClick={() => setSelectedMedia({ type: 'screenshot', src: '/screenshot_jobs.png', label: 'Screenshot der Job-Übersicht' })}
                    />
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

            {/* Lightbox */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition-all animate-in fade-in duration-200"
                    onClick={closeLightbox}
                >
                    <button
                        className="absolute top-6 right-6 p-2 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
                        onClick={closeLightbox}
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div
                        className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {selectedMedia.type === 'video' ? (
                            <video
                                src={selectedMedia.src}
                                controls
                                autoPlay
                                className="rounded-lg shadow-2xl max-h-[80vh] w-full"
                            />
                        ) : (
                            <img
                                src={selectedMedia.src}
                                alt={selectedMedia.label}
                                className="rounded-lg shadow-2xl max-h-[80vh] w-full object-contain"
                            />
                        )}
                        <h3 className="mt-4 text-white text-lg font-medium">{selectedMedia.label}</h3>
                    </div>
                </div>
            )}
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

function MediaItem({ type, src, label, onClick }: { type: 'video' | 'screenshot', src: string, label: string, onClick: () => void }) {
    return (
        <div
            className="group relative mt-4 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/50 cursor-pointer transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
            onClick={onClick}
        >
            <div className="aspect-video relative overflow-hidden bg-neutral-900">
                {type === 'video' ? (
                    <video
                        src={src}
                        className="h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                        muted
                        loop
                        onMouseOver={(e) => e.currentTarget.play()}
                        onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    />
                ) : (
                    <img
                        src={src}
                        alt={label}
                        className="h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                    />
                )}

                {/* Overlay with Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/10 backdrop-blur-[2px]">
                    <div className="p-3 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/20">
                        <Maximize2 className="h-6 w-6" />
                    </div>
                </div>

                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-neutral-950/80 backdrop-blur-md px-2 py-1 rounded border border-neutral-800/50">
                    {type === 'video' ? <Video className="h-3 w-3 text-blue-400" /> : <ImageIcon className="h-3 w-3 text-blue-400" />}
                    <span className="text-[10px] font-medium text-neutral-300 uppercase tracking-wider">{type}</span>
                </div>
            </div>
            <div className="p-3 border-t border-neutral-800/50 flex justify-between items-center group-hover:bg-neutral-900/50 transition-colors">
                <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-200">{label}</span>
                <Maximize2 className="h-3 w-3 text-neutral-600 group-hover:text-blue-400 transition-colors" />
            </div>
        </div>
    );
}
