'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Plus,
    Trash2,
    MoveUp,
    MoveDown,
    Save,
    Command,
    ShieldCheck,
    Settings,
    ArrowLeft,
    ChevronRight,
    Code
} from 'lucide-react';
import api from '@/lib/api';
import { clsx } from 'clsx';

type StepType = 'command' | 'verify' | 'priv_mode' | 'config_mode' | 'exit_config' | 'authenticate';

interface Step {
    id: string;
    type: StepType;
    content?: string;
    name?: string;
    command?: string;
    check_type?: 'regex_match' | 'regex_not_present' | 'contains';
    pattern?: string;
    username?: string;
    password?: string;
}

export default function TemplateBuilderPage() {
    return (
        <Suspense fallback={<div className="text-center py-10">Loading builder...</div>}>
            <TemplateBuilder />
        </Suspense>
    );
}

function TemplateBuilder() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [steps, setSteps] = useState<Step[]>([]);
    const [loading, setLoading] = useState(false);
    const [detectedVars, setDetectedVars] = useState<string[]>([]);

    const searchParams = useSearchParams();
    const editId = searchParams.get('id');

    // Load template for editing
    useEffect(() => {
        if (editId) {
            setLoading(true);
            api.get(`templates/${editId}`)
                .then(res => {
                    const data = res.data;
                    setName(data.name);
                    // Add frontend IDs to steps and normalize data
                    const stepsWithIds = (data.steps || []).map((s: any) => {
                        let type = s.type;
                        let content = s.content;
                        let command = s.command;
                        let check_type = s.check_type;

                        // Normalize 'send' (from macros) to 'command'
                        if (type === 'send') {
                            type = 'command';
                            content = s.cmd;
                        }

                        // Normalize 'verify' (from macros) fields
                        if (type === 'verify') {
                            if (s.cmd && !command) {
                                command = s.cmd;
                            }
                            if (!check_type) {
                                check_type = 'regex_match';
                            }
                        }

                        return {
                            ...s,
                            id: Math.random().toString(36).substr(2, 9),
                            type,
                            content,
                            command,
                            check_type
                        };
                    });
                    setSteps(stepsWithIds);
                })
                .catch(err => {
                    console.error(err);
                    alert("Failed to load template");
                })
                .finally(() => setLoading(false));
        }
    }, [editId]);

    // Detect variables whenever steps change
    useEffect(() => {
        const vars = new Set<string>();
        const regex = /\{\{\s*(\w+)\s*\}\}/g;

        steps.forEach(step => {
            let match;
            const textToSearch = `${step.content || ''} ${step.pattern || ''} ${step.command || ''}`;
            while ((match = regex.exec(textToSearch)) !== null) {
                vars.add(match[1]);
            }
        });

        setDetectedVars(Array.from(vars));
    }, [steps]);

    const addStep = (type: StepType) => {
        let defaultContent = '';

        // Fallback defaults
        if (type === 'priv_mode') defaultContent = 'en';
        if (type === 'config_mode') defaultContent = 'conf t';
        if (type === 'exit_config') defaultContent = 'end';

        const newStep: Step = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            content: (type === 'command' || type === 'priv_mode' || type === 'config_mode' || type === 'exit_config') ? defaultContent : undefined,
            name: type === 'verify' ? 'Check Name' : undefined,
            command: type === 'verify' ? 'show run' : undefined,
            check_type: type === 'verify' ? 'regex_match' : undefined,
            pattern: type === 'verify' ? '' : undefined,
            username: type === 'authenticate' ? '{{ username }}' : undefined,
            password: type === 'authenticate' ? '{{ password }}' : undefined,
        };
        setSteps([...steps, newStep]);
    };

    const removeStep = (id: string) => {
        setSteps(steps.filter(s => s.id !== id));
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= steps.length) return;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setSteps(newSteps);
    };

    const updateStep = (id: string, updates: Partial<Step>) => {
        setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const saveTemplate = async () => {
        if (!name) {
            alert('Please enter a template name');
            return;
        }
        setLoading(true);
        try {
            // Create config_schema from detected vars
            const config_schema = {
                type: 'object',
                properties: detectedVars.reduce((acc, v) => ({
                    ...acc,
                    [v]: { type: 'string', title: v }
                }), {}),
                required: detectedVars
            };

            const payload = {
                name,
                is_baseline: 0,
                profile_id: null,
                steps: steps.map(({ id, ...rest }) => rest), // Remove UI-only ID
                config_schema,
                body: '', // Empty body as we use steps now
            };

            if (editId) {
                await api.put(`templates/${editId}`, payload);
            } else {
                await api.post('templates/', payload);
            }

            router.push('/templates');
        } catch (err) {
            console.error(err);
            alert('Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <input
                            type="text"
                            placeholder="Template Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-transparent text-xl font-bold text-white focus:outline-none border-b border-transparent focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>
                <button
                    onClick={saveTemplate}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : 'Save Template'}
                </button>
            </div>

            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Toolbox */}
                <div className="w-64 flex flex-col gap-4">
                    <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4">
                        <h3 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">Toolbox</h3>
                        <div className="space-y-2">
                            <ToolboxAction icon={<Command className="h-4 w-4" />} label="Send Command" onClick={() => addStep('command')} />
                            <ToolboxAction icon={<ShieldCheck className="h-4 w-4" />} label="Verification" onClick={() => addStep('verify')} />
                            <div className="pt-4 border-t border-neutral-800 mt-4">
                                <h4 className="text-[10px] font-bold text-neutral-500 mb-2 uppercase">Predefined</h4>
                                <ToolboxAction icon={<Settings className="h-4 w-4" />} label="Login / Auth" onClick={() => addStep('authenticate')} />
                                <ToolboxAction icon={<Settings className="h-4 w-4" />} label="Enter Privileged" onClick={() => addStep('priv_mode')} />
                                <ToolboxAction icon={<Settings className="h-4 w-4" />} label="Enter Config" onClick={() => addStep('config_mode')} />
                                <ToolboxAction icon={<Settings className="h-4 w-4" />} label="Exit Config" onClick={() => addStep('exit_config')} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 flex-1">
                        <h3 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">Detected Variables</h3>
                        <div className="flex flex-wrap gap-2">
                            {detectedVars.length === 0 ? (
                                <p className="text-xs text-neutral-600 italic">No variables detected. Use {"{{ var }}"} in steps.</p>
                            ) : (
                                detectedVars.map(v => (
                                    <span key={v} className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs border border-blue-500/20 font-mono">
                                        {v}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Builder Area */}
                <div className="flex-1 bg-neutral-900/30 rounded-xl border border-neutral-800 overflow-y-auto p-6 space-y-4">
                    {steps.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-xl">
                            <Code className="h-12 w-12 mb-4 opacity-20" />
                            <p>Your template is empty.</p>
                            <p className="text-sm">Add steps from the toolbox to start building.</p>
                        </div>
                    ) : (
                        steps.map((step, index) => (
                            <div key={step.id} className="group relative bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-bold text-neutral-600 bg-neutral-800 w-6 h-6 flex items-center justify-center rounded">
                                            {index + 1}
                                        </div>
                                        <span className="text-sm font-semibold text-white uppercase tracking-tight">
                                            {step.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveStep(index, 'up')} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 transition-colors">
                                            <MoveUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => moveStep(index, 'down')} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 transition-colors">
                                            <MoveDown className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => removeStep(step.id)} className="p-1.5 hover:bg-red-500/10 text-red-400 rounded transition-colors ml-2">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Step Content */}
                                <div className="space-y-3">
                                    {step.type === 'command' && (
                                        <textarea
                                            placeholder="Enter command (e.g. hostname {{ hostname }})"
                                            value={step.content}
                                            onChange={(e) => updateStep(step.id, { content: e.target.value })}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-mono text-emerald-400 focus:outline-none focus:border-blue-500 min-h-[80px]"
                                        />
                                    )}

                                    {step.type === 'verify' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Verification Name</label>
                                                <input
                                                    type="text"
                                                    value={step.name}
                                                    onChange={(e) => updateStep(step.id, { name: e.target.value })}
                                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Command to Check</label>
                                                <input
                                                    type="text"
                                                    value={step.command}
                                                    onChange={(e) => updateStep(step.id, { command: e.target.value })}
                                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Check Type</label>
                                                <select
                                                    value={step.check_type}
                                                    onChange={(e) => updateStep(step.id, { check_type: e.target.value as any })}
                                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="regex_match">Regex Match</option>
                                                    <option value="regex_not_present">Regex Not Present</option>
                                                    <option value="contains">Contains</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Expected Pattern (Regex)</label>
                                                <textarea
                                                    placeholder="vlan 10 or {{ vlan_id }}\n  description {{ desc }}\n!"
                                                    value={step.pattern}
                                                    onChange={(e) => updateStep(step.id, { pattern: e.target.value })}
                                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-mono text-orange-400 focus:outline-none focus:border-blue-500 min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {(step.type === 'priv_mode' || step.type === 'config_mode' || step.type === 'exit_config') && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Command</label>
                                            <input
                                                type="text"
                                                value={step.content}
                                                onChange={(e) => updateStep(step.id, { content: e.target.value })}
                                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-blue-400 focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="bg-neutral-950/50 border border-neutral-800/50 rounded-lg p-2 text-[10px] text-neutral-500 flex items-center gap-2">
                                                <ChevronRight className="h-3 w-3" />
                                                This step uses the specified command to transition device state.
                                            </div>
                                        </div>
                                    )}

                                    {step.type === 'authenticate' && (
                                        <div className="space-y-4">
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400 flex items-start gap-3">
                                                <Settings className="h-4 w-4 mt-0.5" />
                                                <p>
                                                    <strong>Note:</strong> If the switch is already unlocked, login credentials at the beginning are not necessary.
                                                    This step handles initial Username and Password prompts.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Username</label>
                                                    <input
                                                        type="text"
                                                        value={step.username}
                                                        onChange={(e) => updateStep(step.id, { username: e.target.value })}
                                                        placeholder="{{ username }}"
                                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Password</label>
                                                    <input
                                                        type="text"
                                                        value={step.password}
                                                        onChange={(e) => updateStep(step.id, { password: e.target.value })}
                                                        placeholder="{{ password }}"
                                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function ToolboxAction({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-blue-600/10 border border-neutral-800 hover:border-blue-500/50 text-neutral-300 hover:text-blue-400 transition-all text-sm group"
        >
            <div className="shrink-0 p-1 bg-neutral-800 rounded text-neutral-400 group-hover:text-blue-400 transition-colors">
                {icon}
            </div>
            <span className="font-medium">{label}</span>
            <Plus className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
}
