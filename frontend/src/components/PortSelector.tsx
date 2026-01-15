"use client";

import React, { useEffect, useState } from "react";
import { Plug, Monitor, Lock, RefreshCw } from "lucide-react";

interface PortStatus {
    id: number;
    path: string;
    connected: boolean; // Device file exists
    busy: boolean; // Locked by another backend session (active_consoles)
    locked: boolean; // Locked by OS (lsof)
    responding: boolean; // Probed successfully
}

interface PortSelectorProps {
    onSelect: (portId: number) => void;
    activeSessions: number[]; // Ports that let user already has open
}

export function PortSelector({ onSelect, activeSessions }: PortSelectorProps) {
    const [ports, setPorts] = useState<PortStatus[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPorts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/console/ports");
            if (res.ok) {
                const data = await res.json();
                setPorts(data);
            }
        } catch (e) {
            console.error("Failed to fetch ports", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPorts();
        const interval = setInterval(fetchPorts, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">Available Ports</h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgb(16,185,129)]"></span> Responding
                        <span className="w-2 h-2 rounded-full bg-blue-500 ml-2"></span> Connected
                        <span className="w-2 h-2 rounded-full bg-rose-500 ml-2"></span> Locked
                    </div>
                    <button
                        onClick={fetchPorts}
                        className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-500 hover:text-white transition-colors"
                        title="Refresh Ports"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {ports.map((port) => {
                    const isSessionActive = activeSessions.includes(port.id);

                    let statusColor = "border-neutral-800 bg-neutral-900/30 text-neutral-600";
                    let icon = <Plug className="h-5 w-5 opacity-20" />;
                    let canConnect = false;
                    let label = "Disconnected";
                    let pulse = false;

                    // Priority Logic:
                    // 1. Own Session Active
                    if (isSessionActive) {
                        statusColor = "border-blue-500/50 bg-blue-500/10 text-blue-400";
                        icon = <Monitor className="h-5 w-5" />;
                        label = "Active Tab";
                    }
                    // 2. Locked by System (lsof) or Backend (busy)
                    else if (port.locked || port.busy) {
                        statusColor = "border-rose-900/50 bg-rose-950/30 text-rose-500 cursor-not-allowed";
                        icon = <Lock className="h-5 w-5" />;
                        label = port.busy ? "Busy (User)" : "Locked (OS)";
                    }
                    // 3. Responding to Active Probe
                    else if (port.responding) {
                        statusColor = "border-emerald-500/50 bg-emerald-500/5 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.1)]";
                        icon = <Plug className="h-5 w-5" />;
                        canConnect = true;
                        label = "Responding";
                        pulse = true;
                    }
                    // 4. File Exists but no response/probe failed
                    else if (port.connected) {
                        statusColor = "border-neutral-700 bg-neutral-800/30 text-neutral-400 hover:border-blue-500/30 hover:bg-neutral-800/50 cursor-pointer";
                        icon = <Plug className="h-5 w-5" />;
                        canConnect = true;
                        label = "Detected";
                    }

                    return (
                        <div
                            key={port.id}
                            onClick={() => canConnect && onSelect(port.id)}
                            className={`
                                relative p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all duration-200 group
                                ${statusColor}
                            `}
                        >
                            <div className={`p-3 rounded-full bg-neutral-950 shadow-inner ${pulse ? 'animate-pulse' : ''}`}>
                                {icon}
                            </div>
                            <div className="text-center">
                                <div className="font-mono text-lg font-bold">Port {port.id}</div>
                                <div className="text-[10px] uppercase font-bold tracking-wider opacity-70">{label}</div>
                            </div>

                            {/* Hover Connect Overlay */}
                            {canConnect && (
                                <div className="absolute inset-0 bg-blue-600/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <span className="font-bold text-white text-sm">Connect</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {ports.length === 0 && !loading && (
                <div className="p-8 text-center border-2 border-dashed border-neutral-800 rounded-xl text-neutral-500">
                    No ports detected. Is the backend running?
                </div>
            )}
        </div>
    );
}
