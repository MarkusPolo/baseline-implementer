"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Settings, Copy, Command, X, Plus } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface ConsoleProps {
    portId: string;
    onCommand?: (command: string) => void;
    className?: string;
}

interface KeyMapping {
    trigger: string;
    replacement: string;
}

export function Console({ portId, onCommand, className }: ConsoleProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
    const [lineBuffer, setLineBuffer] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [mappings, setMappings] = useState<KeyMapping[]>([]);
    const [newTrigger, setNewTrigger] = useState("");
    const [newReplacement, setNewReplacement] = useState("");

    const onCommandRef = useRef(onCommand);

    // Load mappings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('console_mappings');
        if (saved) {
            try {
                setMappings(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved mappings", e);
            }
        }
    }, []);

    // Save mappings to localStorage
    useEffect(() => {
        localStorage.setItem('console_mappings', JSON.stringify(mappings));
    }, [mappings]);

    const addMapping = () => {
        if (!newTrigger || !newReplacement) return;
        setMappings([...mappings, { trigger: newTrigger, replacement: newReplacement }]);
        setNewTrigger("");
        setNewReplacement("");
    };

    const removeMapping = (index: number) => {
        setMappings(mappings.filter((_, i) => i !== index));
    };

    const triggerCapture = () => {
        const cmd = prompt("Enter command to capture (e.g. show run):");
        if (!cmd) return;

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            setIsCapturing(true);
            socketRef.current.send(JSON.stringify({
                action: "capture",
                command: cmd
            }));
        }
    };
    const translateInput = useCallback((data: string) => {
        let result = data;
        for (const mapping of mappings) {
            // Simple string replacement for now. 
            // In a more advanced version, we might want to handle special escape sequences like \b or \x08
            const trigger = mapping.trigger === "Backspace" ? "\x7f" : mapping.trigger;
            const replacement = mapping.replacement === "CTRL+H" ? "\x08" : mapping.replacement;

            if (result === trigger) {
                return replacement;
            }
        }
        return result;
    }, [mappings]);

    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm.js
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: "#0a0a0a",
                foreground: "#d4d4d4",
                cursor: "#3b82f6",
            },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();
        xtermRef.current = term;

        // Connect to WebSocket
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/console/ws/${portId}`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            setStatus("connected");
        };

        socket.onmessage = (event) => {
            const data = event.data;
            if (typeof data === "string" && data.startsWith('{') && data.endsWith('}')) {
                try {
                    const msg = JSON.parse(data);
                    if (msg.event === "capture_complete") {
                        setIsCapturing(false);
                        navigator.clipboard.writeText(msg.output);
                        term.write(`\r\n\x1b[32m[Capture Complete: Output copied to clipboard]\x1b[0m\r\n`);
                        return;
                    } else if (msg.event === "capture_failed") {
                        setIsCapturing(false);
                        term.write(`\r\n\x1b[31m[Capture Failed: ${msg.error}]\x1b[0m\r\n`);
                        return;
                    }
                } catch (e) {
                    // Not our JSON, just write it
                }
            }
            term.write(data);
        };

        socket.onclose = (event) => {
            if (event.code === 1008) {
                setStatus("error");
                term.write(`\r\n\x1b[31m[Error: ${event.reason}]\x1b[0m\r\n`);
            } else {
                setStatus("disconnected");
                term.write("\r\n\x1b[33m[Disconnected]\x1b[0m\r\n");
            }
        };

        socket.onerror = () => {
            setStatus("error");
            term.write("\r\n\x1b[31m[WebSocket Error]\x1b[0m\r\n");
        };

        // Handle Input
        term.onData((data) => {
            const translated = translateInput(data);
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(translated);
            }

            // Recording logic (Line Discipline)
            handleRecordingInput(translated);
        });

        let currentLine = "";
        function handleRecordingInput(data: string) {
            for (const char of data) {
                if (char === "\r" || char === "\n") {
                    if (currentLine.trim()) {
                        // Use ref here
                        onCommandRef.current?.(currentLine.trim());
                    }
                    currentLine = "";
                } else if (char === "\x7f") { // Backspace
                    currentLine = currentLine.slice(0, -1);
                } else {
                    // Add printable characters
                    if (char.length === 1 && char >= " ") {
                        currentLine += char;
                    }
                }
            }
        }

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
        });
        resizeObserver.observe(terminalRef.current);

        return () => {
            socket.close();
            term.dispose();
            resizeObserver.disconnect();
        };
        // Removed onCommand from dependencies
    }, [portId]);

    return (
        <div className={`flex flex-col rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a] shadow-2xl relative ${className}`}>
            <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                        status === "connecting" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                        }`} />
                    <span className="text-xs font-medium text-neutral-400">Port {portId} - Live Console</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}
                        title="Keyboard Translations"
                    >
                        <Settings size={16} />
                    </button>
                    <div className="text-[10px] text-neutral-500 font-mono">
                        9600 8N1
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="absolute top-12 right-4 z-50 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-neutral-200">Key Translations</h3>
                        <button onClick={() => setShowSettings(false)} className="text-neutral-500 hover:text-neutral-300">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                        {mappings.length === 0 && (
                            <p className="text-xs text-neutral-500 italic text-center py-2">No active translations</p>
                        )}
                        {mappings.map((m, i) => (
                            <div key={i} className="flex items-center justify-between bg-neutral-800/50 p-2 rounded-lg border border-neutral-700/50">
                                <div className="text-xs font-mono text-blue-400">
                                    {m.trigger} → {m.replacement}
                                </div>
                                <button onClick={() => removeMapping(i)} className="text-neutral-500 hover:text-rose-400">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                placeholder="Trigger (e.g. Backspace)"
                                value={newTrigger}
                                onChange={e => setNewTrigger(e.target.value)}
                                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-blue-500"
                            />
                            <input
                                placeholder="Result (e.g. CTRL+H)"
                                value={newReplacement}
                                onChange={e => setNewReplacement(e.target.value)}
                                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={addMapping}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
                        >
                            <Plus size={14} /> Add Translation
                        </button>
                        <p className="text-[10px] text-neutral-500 mt-2">
                            Use "Backspace" as trigger and "CTRL+H" as result for Cisco compatibility.
                        </p>
                    </div>
                </div>
            )}

            <div ref={terminalRef} className="flex-1 min-h-[400px]" />
        </div>
    );
}
