"use client";

import React, { useState } from "react";
import { Trash2, GripVertical, Plus, Save, ArrowLeft, Wand2, Shield, Eye, Terminal as TermIcon } from "lucide-react";

interface MacroStep {
    type: string; // send, expect, verify
    cmd: string;
    wait_prompt?: boolean;
    pattern?: string; // for expect/verify
    response?: string; // for expect
}

interface MacroEditorProps {
    initialSteps: string[];
    onSave: (name: string, description: string, steps: MacroStep[], schema: any) => void;
    onCancel: () => void;
}

export function MacroEditor({ initialSteps, onSave, onCancel }: MacroEditorProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [steps, setSteps] = useState<MacroStep[]>(
        initialSteps.map(cmd => ({ type: "send", cmd, wait_prompt: true }))
    );

    // Redaction Rules 
    // ... (Keep existing rules)
    const REDACTION_RULES = [
        { regex: /(password\s+)(\S+)/gi, replace: "$1{{password}}" },
        { regex: /(secret\s+)(\S+)/gi, replace: "$1{{secret}}" },
        { regex: /(snmp-server community\s+)(\S+)/gi, replace: "$1{{community_string}}" },
        { regex: /(key-string\s+)(\S+)/gi, replace: "$1{{key_string}}" },
    ];

    const applyRedaction = () => {
        const newSteps = steps.map(step => {
            let newCmd = step.cmd;
            REDACTION_RULES.forEach(rule => {
                newCmd = newCmd.replace(rule.regex, rule.replace);
            });
            return { ...step, cmd: newCmd };
        });
        setSteps(newSteps);
    };

    // Variable Schema Generation
    const generateSchema = (currentSteps: MacroStep[]) => {
        const vars = new Set<string>();
        currentSteps.forEach(step => {
            const content = step.cmd + (step.pattern || "") + (step.response || "");
            const matches = content.match(/\{\{([^}]+)\}\}/g);
            if (matches) {
                matches.forEach(m => vars.add(m.replace(/\{\{|\}\}/g, "").trim()));
            }
        });

        const schema: any = { type: "object", properties: {}, required: [] };
        vars.forEach(v => {
            schema.properties[v] = { type: "string", title: v };
            schema.required.push(v);
        });
        return schema;
    };

    const detectedVariables = Object.keys(generateSchema(steps).properties);

    const suggestVariables = () => {
        const newSteps = steps.map(step => {
            let newCmd = step.cmd;
            newCmd = newCmd.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, "{{ip_address}}");
            newCmd = newCmd.replace(/(vlan\s+)(\d+)/i, "$1{{vlan_id}}");
            newCmd = newCmd.replace(/(hostname\s+)(\S+)/i, "$1{{hostname}}");
            return { ...step, cmd: newCmd };
        });
        setSteps(newSteps);
    };

    const handleSave = () => {
        const schema = generateSchema(steps);
        onSave(name, description, steps, schema);
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const addStep = () => {
        setSteps([...steps, { type: "send", cmd: "", wait_prompt: true }]);
    };

    const updateStep = (index: number, field: keyof MacroStep, value: any) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    const moveStep = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === steps.length - 1) return;

        const newSteps = [...steps];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setSteps(newSteps);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-2xl font-bold text-white">Template Editor</h2>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!name || steps.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    Save Template
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Metadata */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Core Switch Baseline"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this template do?"
                            rows={4}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Detected Variables Feedback */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Detected Variables</label>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-neutral-900/50 rounded-lg border border-neutral-800">
                            {detectedVariables.length === 0 ? (
                                <span className="text-xs text-neutral-600 italic">No variables detected. Add {"{{var}}"}.</span>
                            ) : (
                                detectedVariables.map(v => (
                                    <span key={v} className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs border border-blue-500/30">
                                        {v}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-neutral-800">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Automation Helpers</h4>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={suggestVariables}
                                className="flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all group"
                            >
                                <Wand2 className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
                                Suggest Variables
                            </button>
                            <button
                                onClick={applyRedaction}
                                className="flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group"
                            >
                                <Shield className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                                Redact Secrets
                            </button>
                        </div>
                    </div>
                </div>

                {/* Steps List */}
                <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-neutral-300">Command Sequence</h3>
                        <button
                            onClick={addStep}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <Plus className="h-3 w-3" /> Add Step
                        </button>
                    </div>

                    <div className="space-y-3 h-[600px] overflow-auto pr-2 custom-scrollbar">
                        {steps.map((step, i) => (
                            <div key={i} className="flex flex-col gap-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800 group hover:border-neutral-700 transition-all relative">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col gap-1 items-center bg-neutral-800/50 rounded p-1">
                                            <div className="flex flex-col gap-0.5">
                                                <button onClick={() => moveStep(i, "up")} className="p-0.5 hover:text-white text-neutral-600 disabled:opacity-30" disabled={i === 0}>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-current"></div>
                                                </button>
                                                <button onClick={() => moveStep(i, "down")} className="p-0.5 hover:text-white text-neutral-600 disabled:opacity-30" disabled={i === steps.length - 1}>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-current"></div>
                                                </button>
                                            </div>
                                        </div>
                                        <select
                                            value={step.type}
                                            onChange={(e) => updateStep(i, "type", e.target.value)}
                                            className="bg-neutral-800 border-none rounded px-2 py-1 text-xs text-neutral-300 focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="send">Send Command</option>
                                            <option value="expect">Expect/Send</option>
                                            <option value="verify">Verify Output</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {step.type === "send" && (
                                            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-neutral-800/50">
                                                <input
                                                    type="checkbox"
                                                    checked={step.wait_prompt}
                                                    onChange={(e) => updateStep(i, "wait_prompt", e.target.checked)}
                                                    className="rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-blue-500/20"
                                                />
                                                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Wait Prompt</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => removeStep(i)}
                                            className="p-1.5 rounded-md hover:bg-rose-500/10 text-neutral-600 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="pl-9 space-y-3">
                                    {step.type === "send" && (
                                        <div className="flex items-center gap-2 bg-neutral-950 rounded-lg px-3 py-2 border border-neutral-800/50">
                                            <TermIcon className="h-3.5 w-3.5 text-neutral-600" />
                                            <input
                                                type="text"
                                                value={step.cmd}
                                                onChange={(e) => updateStep(i, "cmd", e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-sm text-neutral-200 focus:outline-none focus:ring-0 font-mono"
                                                placeholder="Command to send..."
                                            />
                                        </div>
                                    )}

                                    {step.type === "expect" && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest pl-1 text-rose-500/80">Wait For (Pattern)</label>
                                                <input
                                                    type="text"
                                                    value={step.pattern || ""}
                                                    onChange={(e) => updateStep(i, "pattern", e.target.value)}
                                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-rose-500/30 font-mono"
                                                    placeholder="e.g. [confirm]"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest pl-1 text-emerald-500/80">Then Send</label>
                                                <input
                                                    type="text"
                                                    value={step.response || ""}
                                                    onChange={(e) => updateStep(i, "response", e.target.value)}
                                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-mono"
                                                    placeholder="e.g. y"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {step.type === "verify" && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 bg-neutral-950 rounded-lg px-3 py-2 border border-neutral-800/50">
                                                <TermIcon className="h-3.5 w-3.5 text-neutral-600" />
                                                <input
                                                    type="text"
                                                    value={step.cmd}
                                                    onChange={(e) => updateStep(i, "cmd", e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 text-sm text-neutral-200 focus:outline-none focus:ring-0 font-mono"
                                                    placeholder="Command to run for verify (e.g. show run)..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest pl-1 text-blue-500/80">Expect Regex Pattern</label>
                                                <input
                                                    type="text"
                                                    value={step.pattern || ""}
                                                    onChange={(e) => updateStep(i, "pattern", e.target.value)}
                                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30 font-mono"
                                                    placeholder="Regex to match..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {steps.length === 0 && (
                        <div className="py-24 text-center rounded-2xl border border-neutral-800 border-dashed text-neutral-600 text-sm bg-neutral-900/20">
                            No steps in sequence. Add one above.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
