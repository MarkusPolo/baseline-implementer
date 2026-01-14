'use client';

import {
    Terminal,
    FileText,
    PlayCircle,
    Settings,
    ShieldCheck,
    Cpu,
    BookOpen
} from 'lucide-react';

export default function HelpPage() {
    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Documentation & Help</h1>
                <p className="text-neutral-400">Guides and reference for using the Serial Switch Configurator.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Section
                    icon={<Terminal className="h-6 w-6 text-blue-400" />}
                    title="Live Console"
                    description="Interact directly with connected devices."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li>Connect to serial ports via the <strong>Dashboard</strong> or <strong>New Session</strong> button.</li>
                        <li>Type commands directly into the terminal.</li>
                        <li>Use <strong>Record</strong> to capture command sequences for Macros.</li>
                        <li>Save recorded sequences as <strong>Templates</strong> for reuse.</li>
                    </ul>
                </Section>

                <Section
                    icon={<FileText className="h-6 w-6 text-emerald-400" />}
                    title="Templates & Macros"
                    description="Standardize configurations and automation sequences."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li><strong>Templates</strong> allow defining reusable configuration steps.</li>
                        <li>Use variables like <code>{`{{ hostname }}`}</code> to make templates dynamic.</li>
                        <li><strong>Verification</strong> steps use Regex to validate device state.</li>
                        <li>Use the <strong>Builder</strong> to visually construct sequences with drag-and-drop.</li>
                    </ul>
                </Section>

                <Section
                    icon={<PlayCircle className="h-6 w-6 text-amber-400" />}
                    title="Jobs & Automation"
                    description="Run templates across multiple devices."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li>Create a <strong>Job</strong> to apply a Template to a Port.</li>
                        <li>Fill in required variables (e.g., IP addresses, VLAN IDs).</li>
                        <li>View real-time logs and status in the <strong>Jobs</strong> dashboard.</li>
                        <li>Jobs are processed by the background <strong>Worker</strong>.</li>
                    </ul>
                </Section>

                <Section
                    icon={<ShieldCheck className="h-6 w-6 text-rose-400" />}
                    title="Verification & Safety"
                    description="Ensure compliance and prevent errors."
                >
                    <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 mt-4">
                        <li><strong>Regex Match</strong>: Ensures a pattern exists in the output.</li>
                        <li><strong>Regex Not Present</strong>: Ensures a pattern does NOT exist.</li>
                        <li><strong>Contains</strong>: Simple text matching.</li>
                        <li>Multi-line matching is supported for complex configurations.</li>
                    </ul>
                </Section>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-6 mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-6 w-6 text-neutral-300" />
                    <h2 className="text-xl font-semibold text-white">General Tips</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6 text-sm text-neutral-400">
                    <div>
                        <h3 className="font-bold text-neutral-300 mb-2">Shortcuts</h3>
                        <p>Currently, standard browser shortcuts apply. Use Tab to navigate form fields.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-neutral-300 mb-2">Troubleshooting</h3>
                        <p>If a device isn't responding, check the physical connection and ensure no other software is using the serial port.</p>
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
