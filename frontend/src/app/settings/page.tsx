'use client';

import { Settings as SettingsIcon, Database, Terminal, Shield } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-neutral-400">Configure system-wide parameters and connections.</p>
            </div>

            <div className="grid gap-6">
                <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                        <Terminal className="h-5 w-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-white">Serial Connection</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Default Library</label>
                            <select className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-2 text-white">
                                <option>SerialSwitchConfig (Built-in)</option>
                                <option>PySerial (Direct)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Baud Rate</label>
                            <select className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-2 text-white">
                                <option>9600</option>
                                <option>115200</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4 opacity-50">
                    <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                        <Database className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-semibold text-white">Database</h2>
                    </div>
                    <p className="text-sm text-neutral-400">SQLite database is located at <code className="text-blue-400">./sql_app.db</code></p>
                </section>

                <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4 opacity-50">
                    <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                        <Shield className="h-5 w-5 text-purple-500" />
                        <h2 className="text-lg font-semibold text-white">Authentication</h2>
                    </div>
                    <p className="text-sm text-neutral-400">Authentication is currently disabled for MVP development.</p>
                </section>
            </div>
        </div>
    );
}
