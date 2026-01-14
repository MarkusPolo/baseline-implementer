"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface ConsoleProps {
    portId: string;
    onCommand?: (command: string) => void;
    className?: string;
}

export function Console({ portId, onCommand, className }: ConsoleProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
    const [backspaceSeq, setBackspaceSeq] = useState("\x7f");
    const [captureCommand, setCaptureCommand] = useState("");
    const [isCapturing, setIsCapturing] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const onCommandRef = useRef(onCommand);

    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    useEffect(() => {
        if (!terminalRef.current) return;

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

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/console/ws/${portId}`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            setStatus("connected");
        };

        socket.onmessage = (event) => {
            const data = event.data;
            if (typeof data === "string" && data.startsWith("{") && data.endsWith("}")) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === "capture_result") {
                        navigator.clipboard.writeText(parsed.output);
                        setCopySuccess(true);
                        setIsCapturing(false);
                        setTimeout(() => setCopySuccess(false), 3000);
                        return;
                    } else if (parsed.type === "error") {
                        term.write(`\r\n\x1b[31m[Error: ${parsed.message}]\x1b[0m\r\n`);
                        setIsCapturing(false);
                        return;
                    }
                } catch (e) {
                    // Not JSON or parse error, treat as raw
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

        term.onData((data) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(data);
            }
            handleRecordingInput(data);
        });

        let currentLine = "";
        function handleRecordingInput(data: string) {
            for (const char of data) {
                if (char === "\r" || char === "\n") {
                    if (currentLine.trim()) {
                        onCommandRef.current?.(currentLine.trim());
                    }
                    currentLine = "";
                } else if (char === "\x7f") {
                    currentLine = currentLine.slice(0, -1);
                } else {
                    if (char.length === 1 && char >= " ") {
                        currentLine += char;
                    }
                }
            }
        }

        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
        });
        resizeObserver.observe(terminalRef.current);

        return () => {
            socket.close();
            term.dispose();
            resizeObserver.disconnect();
        };
    }, [portId]);

    const handleRunCapture = () => {
        if (socketRef.current?.readyState === WebSocket.OPEN && captureCommand) {
            setIsCapturing(true);
            socketRef.current.send(JSON.stringify({
                type: "capture",
                command: captureCommand
            }));
        }
    };

    const handleSetBackspace = (seq: string) => {
        setBackspaceSeq(seq);
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: "set_backspace",
                sequence: seq
            }));
        }
    };

    return (
        <div className={`flex flex-col rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a] shadow-2xl ${className}`}>
            <div className="px-4 py-3 border-b border-neutral-800 flex flex-col gap-3 bg-neutral-900/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${status === "connected" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                            status === "connecting" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                            }`} />
                        <span className="text-sm font-semibold text-neutral-200">Port {portId} - Live Console</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Backspace:</span>
                            <select
                                value={backspaceSeq}
                                onChange={(e) => handleSetBackspace(e.target.value)}
                                className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="\x7f">Default (127)</option>
                                <option value="\x08">CTRL+H (8)</option>
                            </select>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono bg-neutral-800/50 px-2 py-0.5 rounded">
                            9600 8N1
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Command to capture (e.g. show run)"
                            value={captureCommand}
                            onChange={(e) => setCaptureCommand(e.target.value)}
                            disabled={isCapturing}
                            className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-neutral-600 disabled:opacity-50 transition-all font-mono"
                            onKeyDown={(e) => e.key === 'Enter' && handleRunCapture()}
                        />
                        {isCapturing && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                <span className="text-[10px] text-emerald-500 font-medium animate-pulse">Capturing...</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleRunCapture}
                        disabled={isCapturing || !captureCommand}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${copySuccess
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 disabled:opacity-50 disabled:hover:bg-neutral-800"
                            }`}
                    >
                        {copySuccess ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                Run & Copy
                            </>
                        )}
                    </button>
                </div>
            </div>
            <div ref={terminalRef} className="flex-1 min-h-[450px]" />
        </div>
    );
}
