"use client";

import React, { useState } from "react";
import { Console } from "@/components/Console";
import { MacroEditor } from "@/components/MacroEditor";
import { Save, Trash2, Play, Circle, Square, Activity } from "lucide-react";

export default function ConsolePage() {
    const [selectedPort, setSelectedPort] = useState<string>("1");
    const [isRecording, setIsRecording] = useState(false);
    const [recordedCommands, setRecordedCommands] = useState<string[]>([]);
    const [sessionActive, setSessionActive] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleCommand = (cmd: string) => {
        if (isRecording) {
            setRecordedCommands((prev) => [...prev, cmd]);
        }
    };

    const startSession = () => {
        setSessionActive(true);
        setRecordedCommands([]);
        setIsRecording(true);
        setIsEditing(false);
    };

    const stopSession = () => {
        setSessionActive(false);
        setIsRecording(false);
    };

    const clearRecording = () => {
        setRecordedCommands([]);
    };

    const handleSaveMacro = async (name: string, description: string, steps: any[]) => {
        try {
            const response = await fetch("/api/macros/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, steps }),
            });
            if (response.ok) {
                alert("Macro saved successfully!");
                setIsEditing(false);
                setRecordedCommands([]);
            } else {
                const err = await response.json();
                alert(`Error: ${JSON.stringify(err.detail)}`);
            }
        } catch (error) {
            alert("Failed to save macro. Is the backend running?");
        }
    };

    if (isEditing) {
        return (
            <div className="mx-auto max-w-4xl">
                <MacroEditor
                    initialSteps={recordedCommands}
                    onSave={handleSaveMacro}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Live Console</h1>
                    <p className="text-neutral-400">Interactive serial session with recording.</p>
                </div>

                <div className="flex items-center gap-3">
                    {!sessionActive ? (
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedPort}
                                onChange={(e) => setSelectedPort(e.target.value)}
                                className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {[...Array(16)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>Port {i + 1}</option>
                                ))}
                            </select>
                            <button
                                onClick={startSession}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
                            >
                                <Play className="h-4 w-4" />
                                Start Session
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={stopSession}
                            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-900/20"
                        >
                            <Square className="h-4 w-4" />
                            Stop Session
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Console View */}
                <div className="lg:col-span-2 space-y-4">
                    {sessionActive ? (
                        <Console portId={selectedPort} onCommand={handleCommand} className="h-[600px]" />
                    ) : (
                        <div className="h-[600px] flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/30 text-neutral-500 border-dashed">
                            <div className="p-4 rounded-full bg-neutral-800/50 mb-4">
                                <ActivityIcon className="h-8 w-8" />
                            </div>
                            <p>Select a port and click "Start Session" to begin.</p>
                        </div>
                    )}
                </div>

                {/* Recording Panel */}
                <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden flex flex-col h-full max-h-[600px]">
                        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-neutral-600'}`} />
                                <h3 className="text-sm font-semibold text-white">Recorded Commands</h3>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={clearRecording}
                                    className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                    title="Clear recording"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 space-y-2 font-mono text-sm">
                            {recordedCommands.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-600 text-xs italic py-12">
                                    No commands recorded yet.
                                </div>
                            ) : (
                                recordedCommands.map((cmd, i) => (
                                    <div key={i} className="flex gap-3 group">
                                        <span className="text-neutral-600 w-4 text-right">{i + 1}</span>
                                        <span className="text-neutral-300 break-all">{cmd}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        {recordedCommands.length > 0 && (
                            <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                                >
                                    <Save className="h-4 w-4" />
                                    Save as Macro Draft
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActivityIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}
