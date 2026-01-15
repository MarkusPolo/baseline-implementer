'use client';

import { Terminal, Save, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

interface Port {
    id: number;
    path: string;
    connected: boolean;
    busy: boolean;
    baud: number;
}

export default function SettingsPage() {
    const [ports, setPorts] = useState<Port[]>([]);
    const [baudRates, setBaudRates] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const portsRes = await fetch("/api/console/ports");
            if (portsRes.ok) {
                const portsData = await portsRes.json();
                setPorts(portsData);

                // Initialize local baud rates from port data
                const rates: Record<string, number> = {};
                portsData.forEach((p: Port) => {
                    rates[p.id.toString()] = p.baud;
                });
                setBaudRates(rates);
            }
        } catch (e) {
            console.error("Failed to fetch settings", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleBaudChange = (portId: number, baud: number) => {
        setBaudRates(prev => ({
            ...prev,
            [portId.toString()]: baud
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/settings/port_baud_rates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(baudRates)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
                fetchData(); // Refresh data
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'An error occurred while saving.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-neutral-400">Configure per-port parameters and system defaults.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20"
                >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid gap-6">
                <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-neutral-800 p-6 bg-neutral-900/80">
                        <Terminal className="h-5 w-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-white">Serial Port Configuration</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-neutral-950/50 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Port</th>
                                    <th className="px-6 py-4">Path</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Baud Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {loading && ports.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 opacity-20" />
                                            Loading ports...
                                        </td>
                                    </tr>
                                ) : (
                                    ports.map((port) => (
                                        <tr key={port.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-white font-mono font-bold">Port {port.id}</td>
                                            <td className="px-6 py-4 text-neutral-400 font-mono text-sm">{port.path}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${port.connected ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-500 border border-neutral-700/50'
                                                    }`}>
                                                    {port.connected ? 'Connected' : 'Disconnected'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={baudRates[port.id.toString()] || 9600}
                                                    onChange={(e) => handleBaudChange(port.id, parseInt(e.target.value))}
                                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                                                >
                                                    <option value={9600}>9600</option>
                                                    <option value={115200}>115200</option>
                                                    <option value={19200}>19200</option>
                                                    <option value={38400}>38400</option>
                                                    <option value={57600}>57600</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
