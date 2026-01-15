'use client';

import { useEffect, useState } from "react";
import { Play, Upload, FileSpreadsheet } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { parseCSV, normalizeHeaders } from "@/lib/csv-utils";
import CSVImportModal from "@/components/CSVImportModal";

type Template = { id: number; name: string; config_schema: any; };

export default function NewJobPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // 16 ports logic
    const [ports, setPorts] = useState(
        Array.from({ length: 16 }, (_, i) => ({
            id: i + 1,
            enabled: false,
            variables: {} as Record<string, string>
        }))
    );

    useEffect(() => {
        api.get("templates/").then(res => setTemplates(res.data));
    }, []);

    const togglePort = (index: number) => {
        const newPorts = [...ports];
        newPorts[index].enabled = !newPorts[index].enabled;
        setPorts(newPorts);
    };

    const updatePortVariable = (portIndex: number, field: string, value: string) => {
        const newPorts = [...ports];
        newPorts[portIndex].variables = {
            ...newPorts[portIndex].variables,
            [field]: value
        };
        setPorts(newPorts);
    };

    const handleImportedData = (rows: any[]) => {
        const newPorts = [...ports];
        let matchCount = 0;

        rows.forEach(row => {
            // Try to find port number in "port", "port_id", "id", "#"
            const portVal = row.port || row.port_number || row.port_id || row.id || row["#"];

            if (portVal) {
                const portNum = parseInt(portVal.toString().replace(/[^0-9]/g, ""), 10);
                if (portNum >= 1 && portNum <= 16) {
                    const idx = portNum - 1;
                    newPorts[idx].enabled = true;
                    // Merge other variables
                    newPorts[idx].variables = { ...newPorts[idx].variables, ...row };
                    matchCount++;
                }
            }
        });

        setPorts(newPorts);
        if (matchCount > 0) {
            alert(`Successfully imported configuration for ${matchCount} ports.`);
        } else {
            alert("No valid ports found in CSV. Ensure there is a 'Port' column with numbers 1-16.");
        }
    };

    const handleSubmit = async () => {
        if (!selectedTemplate) return;

        const enabledPorts = ports.filter(p => p.enabled);
        if (enabledPorts.length === 0) {
            alert("Enable at least one port.");
            return;
        }

        try {
            const payload = {
                template_id: selectedTemplate.id,
                targets: enabledPorts.map(p => ({
                    port: `~/port${p.id}`, // using user's environment convention
                    variables: p.variables
                }))
            };

            const res = await api.post("jobs/", payload);
            router.push(`/jobs/${res.data.id}`);
        } catch (err) {
            alert("Failed to create job");
            console.error(err);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white">New Configuration Job</h1>
                <p className="text-neutral-400">Select a template and configure ports.</p>
            </div>

            <div className="space-y-4">
                <label className="block text-sm font-medium text-neutral-300">Select Template</label>
                <select
                    className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white"
                    onChange={(e) => {
                        const t = templates.find(t => t.id === Number(e.target.value));
                        setSelectedTemplate(t || null);
                    }}
                >
                    <option value="">-- Choose Template --</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            {/* Grid of ports */}
            {selectedTemplate && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Target Ports</h3>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 cursor-pointer text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded px-3 py-1 bg-emerald-500/10 transition-colors"
                            >
                                <FileSpreadsheet className="h-3 w-3" />
                                Import CSV
                            </button>
                            <button onClick={() => setPorts(ports.map(p => ({ ...p, enabled: true })))} className="text-xs text-blue-400 hover:text-blue-300">Enable All</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ports.map((p, idx) => (
                            <div
                                key={p.id}
                                className={`rounded-lg border p-4 transition-all ${p.enabled
                                    ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50"
                                    : "border-neutral-800 bg-neutral-900/50 opacity-60 hover:opacity-100"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-mono text-sm font-bold text-neutral-300">Port {p.id}</span>
                                    <input
                                        type="checkbox"
                                        checked={p.enabled}
                                        onChange={() => togglePort(idx)}
                                        className="accent-blue-600 h-4 w-4"
                                    />
                                </div>

                                {p.enabled && (
                                    <div className="space-y-2">
                                        {/* Render inputs based on JSON Schema properties */}
                                        {Object.entries(selectedTemplate.config_schema.properties || {}).map(([key, prop]: [string, any]) => (
                                            <div key={key}>
                                                <label className="block text-[10px] uppercase tracking-wider text-neutral-500">{prop.title || key}</label>
                                                <input
                                                    type="text"
                                                    className="w-full rounded bg-neutral-950 border border-neutral-700 px-2 py-1 text-xs text-white"
                                                    placeholder={prop.title || key}
                                                    value={p.variables[key] || ""}
                                                    onChange={(e) => updatePortVariable(idx, key, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-4 border-t border-neutral-800">
                <button
                    onClick={handleSubmit}
                    disabled={!selectedTemplate}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                >
                    <Play className="h-4 w-4" />
                    Queue Execution
                </button>
            </div>
            {selectedTemplate && (
                <CSVImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImportedData}
                    templateSchema={selectedTemplate.config_schema}
                />
            )}
        </div>
    );
}

