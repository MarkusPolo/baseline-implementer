"use client";

import { Activity, CircleDot, Server } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type PortStatus = {
    connected: boolean;
};

type JobStatus = {
    status: string;
};

type SystemSnapshot = {
    backendOnline: boolean;
    connectedPorts: number;
    totalPorts: number;
    activeJobs: number;
};

const initialSnapshot: SystemSnapshot = {
    backendOnline: false,
    connectedPorts: 0,
    totalPorts: 0,
    activeJobs: 0,
};

export default function SidebarSystemStatus() {
    const [snapshot, setSnapshot] = useState<SystemSnapshot>(initialSnapshot);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        async function loadSystemStatus() {
            try {
                const [portsResponse, jobsResponse] = await Promise.all([
                    fetch("/api/console/ports", { signal: controller.signal }),
                    fetch("/api/jobs/", { signal: controller.signal }),
                ]);

                if (!portsResponse.ok || !jobsResponse.ok) {
                    throw new Error("System status endpoint failed");
                }

                const ports = (await portsResponse.json()) as PortStatus[];
                const jobs = (await jobsResponse.json()) as JobStatus[];

                setSnapshot({
                    backendOnline: true,
                    connectedPorts: ports.filter((port) => port.connected).length,
                    totalPorts: ports.length,
                    activeJobs: jobs.filter((job) => ["queued", "running"].includes(job.status)).length,
                });
            } catch (error) {
                if (!controller.signal.aborted) {
                    setSnapshot(initialSnapshot);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadSystemStatus();
        const intervalId = window.setInterval(loadSystemStatus, 15000);

        return () => {
            controller.abort();
            window.clearInterval(intervalId);
        };
    }, []);

    const status = useMemo(() => {
        if (loading) {
            return {
                label: "Checking",
                dotClass: "bg-amber-500 animate-pulse",
                textClass: "text-amber-400",
            };
        }

        if (snapshot.backendOnline) {
            return {
                label: "Online",
                dotClass: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]",
                textClass: "text-emerald-400",
            };
        }

        return {
            label: "Offline",
            dotClass: "bg-rose-500",
            textClass: "text-rose-400",
        };
    }, [loading, snapshot.backendOnline]);

    return (
        <section className="mt-auto rounded-lg border border-neutral-800 bg-neutral-800/40 p-3 text-xs">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 font-medium text-neutral-300">
                    <Server className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    <span className="truncate">System</span>
                </div>
                <div className={`flex shrink-0 items-center gap-1.5 font-medium ${status.textClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                    {status.label}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <StatusMetric
                    icon={<CircleDot className="h-3.5 w-3.5" />}
                    label="Ports"
                    value={loading ? "--" : `${snapshot.connectedPorts}/${snapshot.totalPorts || 16}`}
                />
                <StatusMetric
                    icon={<Activity className="h-3.5 w-3.5" />}
                    label="Jobs"
                    value={loading ? "--" : snapshot.activeJobs.toString()}
                    active={snapshot.activeJobs > 0}
                />
            </div>
        </section>
    );
}

function StatusMetric({
    icon,
    label,
    value,
    active = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    active?: boolean;
}) {
    return (
        <div className="rounded-md border border-neutral-800 bg-neutral-950/35 px-2 py-2">
            <div className="flex items-center gap-1.5 text-neutral-500">
                {icon}
                <span>{label}</span>
            </div>
            <div className={`mt-1 font-semibold ${active ? "text-blue-400" : "text-neutral-200"}`}>{value}</div>
        </div>
    );
}
