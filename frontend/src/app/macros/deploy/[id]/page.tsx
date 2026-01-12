"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, ArrowLeft, AlertCircle, Loader2, Info } from "lucide-react";
import Link from "next/link";

interface Macro {
    id: number;
    name: string;
    description: string;
    steps: any[];
    config_schema?: any;
}

export default function DeployMacroPage() {
    const params = useParams();
    const router = useRouter();
    const macroId = params.id;

    const [macro, setMacro] = useState<Macro | null>(null);
    const [selectedPorts, setSelectedPorts] = useState<string[]>([]);
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [isDeploying, setIsDeploying] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMacro();
    }, [macroId]);

    const fetchMacro = async () => {
        try {
            const response = await fetch(`/api/macros/${macroId}`);
            const data = await response.json();
            setMacro(data);

            // Initialize variables from schema
            if (data.config_schema?.properties) {
                const initialVars: Record<string, string> = {};
                Object.keys(data.config_schema.properties).forEach(key => {
                    initialVars[key] = "";
                });
                setVariables(initialVars);
            }
        } catch (error) {
            console.error("Failed to fetch macro:", error);
        } finally {
            setLoading(false);
        }
    };

    const togglePort = (port: string) => {
        if (selectedPorts.includes(port)) {
            setSelectedPorts(selectedPorts.filter(p => p !== port));
        } else {
            setSelectedPorts([...selectedPorts, port]);
        }
    };

    const handleVarChange = (key: string, value: string) => {
        setVariables(prev => ({ ...prev, [key]: value }));
    };

    const handleDeploy = async () => {
        if (selectedPorts.length === 0) {
            alert("Please select at least one port.");
            return;
        }

        // Basic validation
        if (macro?.config_schema?.required) {
            for (const req of macro.config_schema.required) {
                if (!variables[req]) {
                    alert(`Please provide a value for ${req}`);
                    return;
                }
            }
        }

        setIsDeploying(true);
        try {
            const response = await fetch("/api/jobs/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    macro_id: parseInt(macroId as string),
                    targets: selectedPorts.map(p => ({
                        port: `~/port${p}`,
                        variables: variables
                    }))
                }),
            });

            if (response.ok) {
                router.push(`/jobs/`);
            } else {
                const err = await response.json();
                alert(`Deployment failed: ${JSON.stringify(err.detail)}`);
            }
        } catch (error) {
            alert("Failed to create job. Is the backend running?");
        } finally {
            setIsDeploying(false);
        }
    };

    if (loading) {
        return <div className="py-12 text-center text-neutral-500">Loading macro details...</div>;
    }

    if (!macro) {
        return <div className="py-12 text-center text-rose-500">Macro not found.</div>;
    }

    const hasVars = macro.config_schema?.properties && Object.keys(macro.config_schema.properties).length > 0;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Link
                    href="/macros"
                    className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Deploy Macro</h1>
                    <p className="text-neutral-400">Scale your recording to multiple switches.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Info & Variables */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
                        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Selected Macro</h3>
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-white">{macro.name}</p>
                            <p className="text-sm text-neutral-500 leading-relaxed italic">
                                "{macro.description || "No description provided."}"
                            </p>
                        </div>
                    </div>

                    {hasVars && (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white">Variables</h3>
                                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest font-bold">Required</span>
                            </div>
                            <p className="text-xs text-neutral-500 mb-4">Values provided here will replace `{"{{var}}"}` tags in the macro steps.</p>

                            <div className="space-y-4">
                                {Object.entries(macro.config_schema.properties).map(([key, prop]: [string, any]) => (
                                    <div key={key} className="space-y-1.5">
                                        <label className="text-xs font-medium text-neutral-400">{prop.title || key}</label>
                                        <input
                                            type="text"
                                            value={variables[key]}
                                            onChange={(e) => handleVarChange(key, e.target.value)}
                                            placeholder={`Enter ${key}...`}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-200/70 leading-relaxed">
                            Deploying will apply the commands to all selected ports. This cannot be undone once started.
                        </p>
                    </div>
                </div>

                {/* Right Column: Port Selection */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-white">Select Target Ports</h3>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-xs text-neutral-400">{selectedPorts.length} ports selected</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-4 gap-3">
                            {[...Array(16)].map((_, i) => {
                                const portNum = (i + 1).toString();
                                const isSelected = selectedPorts.includes(portNum);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => togglePort(portNum)}
                                        className={`p-4 rounded-xl border transition-all text-center group relative overflow-hidden ${isSelected
                                            ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40"
                                            : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                                            }`}
                                    >
                                        <div className={`text-lg font-bold mb-1 ${isSelected ? "text-white" : "text-neutral-400"}`}>
                                            {portNum}
                                        </div>
                                        <div className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? "text-blue-100" : "text-neutral-600"}`}>
                                            Port
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-10 border-t border-neutral-800 pt-8">
                            <button
                                onClick={handleDeploy}
                                disabled={isDeploying || selectedPorts.length === 0}
                                className="w-full flex items-center justify-center gap-3 rounded-xl bg-blue-600 py-4 text-base font-bold text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/30 disabled:opacity-50 disabled:grayscale"
                            >
                                {isDeploying ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Initializing Deployment...
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-5 w-5" />
                                        Deploy to {selectedPorts.length} {selectedPorts.length === 1 ? 'Device' : 'Devices'}
                                    </>
                                )}
                            </button>
                            <div className="mt-4 flex items-center justify-center gap-2 text-neutral-600">
                                <Info className="h-3.5 w-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-semibold italic">Sequential Execution</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
