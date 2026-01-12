"use client";

import React, { useState } from "react";
import { Console } from "@/components/Console";
import { MacroEditor } from "@/components/MacroEditor";
import { Save, Trash2, Play, Plus, X, Monitor } from "lucide-react";

import { PortSelector } from "@/components/PortSelector";

interface ConsoleSession {
    id: string;
    portId: number;
    name: string;
}

export default function ConsolePage() {
    const [sessions, setSessions] = useState<ConsoleSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [showSelector, setShowSelector] = useState(true);

    // Recording State (Per session)
    const [isRecording, setIsRecording] = useState(false); // Global toggle for now, or per session? Global is easier.
    const [recordings, setRecordings] = useState<Record<string, string[]>>({});
    const [isEditing, setIsEditing] = useState(false);

    // Derived stats
    const recordedCommands = (activeSessionId && recordings[activeSessionId]) || [];

    const handleCommand = (cmd: string) => {
        if (isRecording && activeSessionId) {
            setRecordings(prev => ({
                ...prev,
                [activeSessionId]: [...(prev[activeSessionId] || []), cmd]
            }));
        }
    };

    const clearActiveRecording = () => {
        if (activeSessionId) {
            setRecordings(prev => ({
                ...prev,
                [activeSessionId]: []
            }));
        }
    };

    const addSession = (portId: number) => {
        const newSession = {
            id: Math.random().toString(36).substr(2, 9),
            portId,
            name: `Port ${portId}`
        };
        setSessions([...sessions, newSession]);
        setActiveSessionId(newSession.id);
        setShowSelector(false);
    };

    const closeSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const newSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(newSessions);
        if (activeSessionId === sessionId) {
            if (newSessions.length > 0) {
                setActiveSessionId(newSessions[newSessions.length - 1].id);
            } else {
                setActiveSessionId(null);
                setShowSelector(true);
                // Stop recording and clear commands if no sessions are active
                setIsRecording(false);
                // setRecordedCommands([]);
            }
        }
    };

    const handleSaveTemplate = async (name: string, description: string, steps: any[], schema: any) => {
        try {
            const body = steps
                .filter(s => s.type === "send")
                .map(s => s.cmd)
                .join("\n");

            const response = await fetch("/api/templates/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    body: `! Description: ${description}\n${body}`,
                    steps,
                    config_schema: schema,
                    is_baseline: 0
                }),
            });
            if (response.ok) {
                alert("Template saved successfully!");
                setIsEditing(false);
                clearActiveRecording();
            } else {
                const err = await response.json();
                alert(`Error: ${JSON.stringify(err.detail)}`);
            }
        } catch (error) {
            alert("Failed to save template. Is the backend running?");
        }
    };

    if (isEditing) {
        return (
            <div className="mx-auto max-w-4xl">
                <MacroEditor
                    initialSteps={recordedCommands}
                    onSave={handleSaveTemplate}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Live Console</h1>
                    <p className="text-neutral-400">Interactive serial session manager.</p>
                </div>

                {/* Tabs & Toolbar */}
                <div className="flex items-center gap-2 border-b border-neutral-800 pb-1 overflow-x-auto">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => { setActiveSessionId(session.id); setShowSelector(false); }}
                            className={`
                                group flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium cursor-pointer transition-colors border-b-2
                                ${activeSessionId === session.id && !showSelector
                                    ? "bg-neutral-900 border-blue-500 text-white"
                                    : "border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50"}
                            `}
                        >
                            <Monitor className="h-4 w-4" />
                            {session.name}
                            <button
                                onClick={(e) => closeSession(e, session.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-rose-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={() => setShowSelector(true)}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 border-transparent
                            ${showSelector ? "bg-neutral-900 border-blue-500 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50"}
                        `}
                    >
                        <Plus className="h-4 w-4" />
                        New Session
                    </button>

                    {/* Recording Controls (Right aligned) */}
                    {!showSelector && activeSessionId && (
                        <div className="ml-auto flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-neutral-800'}`} />
                            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
                                {isRecording ? "Recording" : "Ready"}
                            </span>
                            <button
                                onClick={() => setIsRecording(!isRecording)}
                                className={`
                                   px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors
                                   ${isRecording
                                        ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                                        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"}
                               `}
                            >
                                {isRecording ? "Stop Rec" : "Record"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="min-h-[600px]">
                    {showSelector ? (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                            <PortSelector
                                onSelect={addSession}
                                activeSessions={sessions.map(s => s.portId)}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3 bg-black rounded-xl border border-neutral-800 overflow-hidden shadow-2xl relative">
                                {sessions.map(session => (
                                    <div
                                        key={session.id}
                                        className={activeSessionId === session.id ? "block h-full" : "hidden"}
                                    >
                                        <Console
                                            portId={session.portId.toString()}
                                            onCommand={activeSessionId === session.id ? handleCommand : undefined}
                                            className="h-[600px] border-none rounded-none"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Sidebar Recording Panel */}
                            <div className="flex flex-col gap-4">
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden flex flex-col h-[600px]">
                                    <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-white">Recorded History</h3>
                                        </div>
                                        <button
                                            onClick={clearActiveRecording}
                                            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                            title="Clear"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-auto p-4 space-y-2 font-mono text-sm">
                                        {recordedCommands.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-neutral-600 text-xs italic">
                                                No commands recorded.
                                            </div>
                                        ) : (
                                            recordedCommands.map((cmd, i) => (
                                                <div key={i} className="flex gap-3 group">
                                                    <span className="text-neutral-600 w-4 text-right select-none">{i + 1}</span>
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
                                                Save Template
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
