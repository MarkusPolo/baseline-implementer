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
    const [lineBuffer, setLineBuffer] = useState("");

    const onCommandRef = useRef(onCommand);

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
            term.write(event.data);
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
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(data);
            }

            // Recording logic (Line Discipline)
            handleRecordingInput(data);
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
        <div className={`flex flex-col rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a] shadow-2xl ${className}`}>
            <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                        status === "connecting" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                        }`} />
                    <span className="text-xs font-medium text-neutral-400">Port {portId} - Live Console</span>
                </div>
                <div className="text-[10px] text-neutral-500 font-mono">
                    9600 8N1
                </div>
            </div>
            <div ref={terminalRef} className="flex-1 min-h-[400px]" />
        </div>
    );
}
