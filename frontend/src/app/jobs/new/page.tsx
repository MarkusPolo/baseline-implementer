'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, FileText, Play, Search, X } from "lucide-react";
import api from "@/lib/api";
import CSVImportModal from "@/components/CSVImportModal";
import { byDeviceLayoutPortOrder } from "@/lib/ports";

type SchemaProperty = {
    title?: string;
    type?: string;
};

type ConfigSchema = {
    properties?: Record<string, SchemaProperty>;
    required?: string[];
};

type Template = {
    id: number;
    name: string;
    created_at?: string;
    config_schema: ConfigSchema;
};

type PortConfig = {
    id: number;
    enabled: boolean;
    variables: Record<string, string>;
};

type CsvRow = Record<string, unknown>;

export default function NewJobPage() {
    return (
        <Suspense fallback={<div className="py-12 text-center text-neutral-500">Loading job builder...</div>}>
            <NewJobBuilder />
        </Suspense>
    );
}

function NewJobBuilder() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedTemplateId = Number(searchParams.get("templateId"));
    const targetPortsRef = useRef<HTMLElement | null>(null);
    const shouldScrollToPortsRef = useRef(false);

    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [templateSearch, setTemplateSearch] = useState("");
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [ports, setPorts] = useState<PortConfig[]>(
        Array.from({ length: 16 }, (_, i) => ({
            id: i + 1,
            enabled: false,
            variables: {}
        }))
    );

    useEffect(() => {
        api.get("templates/").then(res => setTemplates(res.data));
    }, []);

    const selectedProperties = selectedTemplate?.config_schema?.properties || {};
    const selectedRequired = selectedTemplate?.config_schema?.required || [];
    const variableKeys = Object.keys(selectedProperties);
    const enabledPorts = ports.filter(p => p.enabled);
    const displayPorts = useMemo(() => byDeviceLayoutPortOrder(ports), [ports]);

    const filteredTemplates = useMemo(() => {
        const query = templateSearch.trim().toLowerCase();
        return templates
            .filter(template => template.name.toLowerCase().includes(query))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [templateSearch, templates]);

    const buildEmptyVariables = useCallback((template: Template) => {
        const initialVariables: Record<string, string> = {};
        Object.keys(template.config_schema?.properties || {}).forEach(key => {
            initialVariables[key] = "";
        });
        return initialVariables;
    }, []);

    const selectTemplate = useCallback((template: Template) => {
        setSelectedTemplate(template);
        shouldScrollToPortsRef.current = true;
        setPorts(currentPorts => currentPorts.map(port => ({
            ...port,
            variables: buildEmptyVariables(template)
        })));
    }, [buildEmptyVariables]);

    useEffect(() => {
        if (!selectedTemplate || !shouldScrollToPortsRef.current) return;

        const frame = window.requestAnimationFrame(() => {
            targetPortsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
            shouldScrollToPortsRef.current = false;
        });

        return () => window.cancelAnimationFrame(frame);
    }, [selectedTemplate]);

    useEffect(() => {
        if (!preselectedTemplateId || templates.length === 0 || selectedTemplate) return;

        const template = templates.find(t => t.id === preselectedTemplateId);
        if (template) {
            selectTemplate(template);
        }
    }, [preselectedTemplateId, selectTemplate, selectedTemplate, templates]);

    const clearTemplate = () => {
        setSelectedTemplate(null);
        setPorts(currentPorts => currentPorts.map(port => ({
            ...port,
            enabled: false,
            variables: {}
        })));
    };

    const togglePort = (index: number) => {
        setPorts(currentPorts => currentPorts.map((port, portIndex) => (
            portIndex === index ? { ...port, enabled: !port.enabled } : port
        )));
    };

    const setAllPorts = (enabled: boolean) => {
        setPorts(currentPorts => currentPorts.map(port => ({ ...port, enabled })));
    };

    const updatePortVariable = (portIndex: number, field: string, value: string) => {
        setPorts(currentPorts => currentPorts.map((port, index) => (
            index === portIndex
                ? { ...port, variables: { ...port.variables, [field]: value } }
                : port
        )));
    };

    const handleImportedData = (rows: CsvRow[]) => {
        setPorts(currentPorts => {
            const nextPorts = [...currentPorts];
            let matchCount = 0;

            rows.forEach(row => {
                const portVal = row.port || row.port_number || row.port_id || row.id || row["#"];

                if (portVal) {
                    const portNum = parseInt(String(portVal).replace(/[^0-9]/g, ""), 10);
                    if (portNum >= 1 && portNum <= 16) {
                        const idx = portNum - 1;
                        const rowVariables = Object.fromEntries(
                            Object.entries(row).map(([key, value]) => [key, value == null ? "" : String(value)])
                        );

                        nextPorts[idx] = {
                            ...nextPorts[idx],
                            enabled: true,
                            variables: { ...nextPorts[idx].variables, ...rowVariables }
                        };
                        matchCount++;
                    }
                }
            });

            window.setTimeout(() => {
                if (matchCount > 0) {
                    alert(`Successfully imported configuration for ${matchCount} ports.`);
                } else {
                    alert("No valid ports found in CSV. Ensure there is a 'Port' column with numbers 1-16.");
                }
            }, 0);

            return nextPorts;
        });
    };

    const handleSubmit = async () => {
        if (!selectedTemplate) return;

        if (enabledPorts.length === 0) {
            alert("Enable at least one port.");
            return;
        }

        for (const port of enabledPorts) {
            for (const requiredKey of selectedRequired) {
                if (!port.variables[requiredKey]) {
                    alert(`Please provide ${requiredKey} for port ${port.id}.`);
                    return;
                }
            }
        }

        setIsSubmitting(true);
        try {
            const res = await api.post("jobs/", {
                template_id: selectedTemplate.id,
                targets: enabledPorts.map(port => ({
                    port: `~/port${port.id}`,
                    variables: port.variables
                }))
            });
            router.push(`/jobs/${res.data.id}`);
        } catch (err) {
            alert("Failed to create job");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-16">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="mb-4 inline-flex items-center rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">
                            Job Run
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Create a configuration job</h1>
                        <p className="mt-3 text-sm leading-6 text-neutral-400">
                            Pick a template visually, choose the ports, then enter the variables each device needs.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-xl border border-neutral-800 bg-neutral-950/50 p-2 text-center">
                        <Metric label="Templates" value={templates.length.toString()} />
                        <Metric label="Ports" value={enabledPorts.length.toString()} />
                        <Metric label="Variables" value={variableKeys.length.toString()} />
                    </div>
                </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Select Template</h2>
                            <p className="text-sm text-neutral-400">Search and choose the baseline you want to run.</p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                            <input
                                type="text"
                                value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-10 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {filteredTemplates.length === 0 ? (
                            <div className="col-span-full rounded-xl border border-dashed border-neutral-800 bg-neutral-950/50 p-10 text-center text-sm text-neutral-500">
                                {templates.length === 0 ? "No templates found." : "No templates match your search."}
                            </div>
                        ) : (
                            filteredTemplates.map(template => {
                                const isSelected = selectedTemplate?.id === template.id;
                                const templateVarCount = Object.keys(template.config_schema?.properties || {}).length;

                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => selectTemplate(template)}
                                        className={`group rounded-xl border p-4 text-left transition-all ${isSelected
                                            ? "border-blue-500 bg-neutral-900/50 ring-1 ring-blue-500/50"
                                            : "border-neutral-800 bg-neutral-950/50 hover:border-neutral-700 hover:bg-neutral-900/80"
                                            }`}
                                    >
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${isSelected ? "border-blue-500 bg-neutral-800 text-blue-400" : "border-neutral-800 bg-neutral-900 text-neutral-400 group-hover:text-white"}`}>
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-400" />}
                                        </div>
                                        <h3 className="line-clamp-2 font-semibold text-white">{template.name}</h3>
                                        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                                            <span>{templateVarCount} variable{templateVarCount === 1 ? "" : "s"}</span>
                                            <span>{template.created_at ? new Date(template.created_at).toLocaleDateString() : "Template"}</span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                <aside className="h-fit rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Run Summary</h2>
                            <p className="text-sm text-neutral-400">Current job configuration.</p>
                        </div>
                        {selectedTemplate && (
                            <button
                                onClick={clearTemplate}
                                className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white"
                                title="Clear selected template"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="space-y-3 text-sm">
                        <SummaryRow label="Template" value={selectedTemplate?.name || "Not selected"} active={Boolean(selectedTemplate)} />
                        <SummaryRow label="Target ports" value={enabledPorts.length.toString()} active={enabledPorts.length > 0} />
                        <SummaryRow label="Variables" value={variableKeys.length.toString()} active={Boolean(selectedTemplate)} />
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedTemplate || enabledPorts.length === 0 || isSubmitting}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400 disabled:opacity-100"
                    >
                        <Play className="h-4 w-4" />
                        {isSubmitting ? "Queueing..." : "Queue Execution"}
                    </button>
                </aside>
            </section>

            {selectedTemplate && (
                <section ref={targetPortsRef} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Configure Target Ports</h2>
                            <p className="text-sm text-neutral-400">
                                Enable devices and provide per-port values for <span className="font-mono text-neutral-300">{selectedTemplate.name}</span>.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:bg-neutral-700 border border-neutral-700"
                            >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Import CSV
                            </button>
                            <button onClick={() => setAllPorts(true)} className="rounded-lg bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:bg-neutral-700 border border-neutral-700">
                                Enable All
                            </button>
                            <button onClick={() => setAllPorts(false)} className="rounded-lg bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white border border-neutral-700">
                                Clear Ports
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
                        {displayPorts.map((port) => {
                            const portIndex = port.id - 1;

                            return (
                            <div
                                key={port.id}
                                className={`rounded-xl border p-4 transition-all ${port.enabled
                                    ? "border-blue-500 bg-neutral-900/60 ring-1 ring-blue-500/50"
                                    : "border-neutral-800 bg-neutral-950/50 opacity-75 hover:opacity-100"
                                    }`}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <button
                                        onClick={() => togglePort(portIndex)}
                                        className={`rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${port.enabled
                                            ? "border-blue-500 bg-blue-600 text-white"
                                            : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-white"
                                            }`}
                                    >
                                        Port {port.id}
                                    </button>
                                    <input
                                        type="checkbox"
                                        checked={port.enabled}
                                        onChange={() => togglePort(portIndex)}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                </div>

                                {port.enabled ? (
                                    variableKeys.length === 0 ? (
                                        <p className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-500">No variables required for this template.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {Object.entries(selectedProperties).map(([key, prop]) => (
                                                <div key={key}>
                                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                                        {prop.title || key}
                                                        {selectedRequired.includes(key) && <span className="ml-1 text-blue-400">*</span>}
                                                    </label>
                                                    <input
                                                        type={key.toLowerCase().includes("password") ? "password" : "text"}
                                                        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-neutral-700 focus:border-blue-500"
                                                        placeholder={prop.title || key}
                                                        value={port.variables[key] || ""}
                                                        onChange={(e) => updatePortVariable(portIndex, key, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <p className="text-xs text-neutral-600">Enable this port to configure variables.</p>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </section>
            )}

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

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-20 rounded-lg bg-neutral-900 px-4 py-3">
            <div className="text-lg font-bold text-white">{value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{label}</div>
        </div>
    );
}

function SummaryRow({ label, value, active }: { label: string; value: string; active: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/70 px-4 py-3">
            <span className="text-neutral-500">{label}</span>
            <span className={active ? "font-semibold text-white" : "text-neutral-600"}>{value}</span>
        </div>
    );
}
