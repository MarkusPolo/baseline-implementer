'use client';

import { useEffect, useState, use } from "react";
import { Terminal, CheckCircle, XCircle, Clock, AlertTriangle, Info } from "lucide-react";
import api from "@/lib/api";

type VerificationCheck = {
    check_name: string;
    status: string;
    evidence: string;
    full_output?: string;
    message: string;
};

type JobTarget = {
    id: number;
    port: string;
    status: string;
    log: string;
    verification_results?: VerificationCheck[];
    failure_category?: string;
    remediation?: string;
};

type Job = {
    id: number;
    status: string;
    created_at: string;
    targets: JobTarget[];
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchJob = () => {
        api.get(`jobs/${resolvedParams.id}`)
            .then((res) => setJob(res.data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchJob();
        const interval = setInterval(fetchJob, 2000);
        return () => clearInterval(interval);
    }, [resolvedParams.id]);

    if (loading && !job) return <div className="text-neutral-500">Loading job...</div>;
    if (!job) return <div className="text-red-500">Job not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Job #{job.id}</h1>
                    <p className="text-neutral-400">Created: {new Date(job.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={job.status} large />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {job.targets.map((target) => (
                    <div key={target.id} className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                            <span className="font-mono font-bold text-sm text-neutral-300">{target.port}</span>
                            <StatusBadge status={target.status} />
                        </div>

                        {/* Failure Category & Remediation */}
                        {target.failure_category && (
                            <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/30">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="text-xs font-semibold text-red-300 mb-1">
                                            {target.failure_category.replace(/_/g, ' ').toUpperCase()}
                                        </div>
                                        {target.remediation && (
                                            <div className="text-xs text-red-200/80">{target.remediation}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Logs */}
                        <div className="p-4 bg-black border-b border-neutral-800">
                            <div className="h-32 overflow-y-auto font-mono text-xs text-neutral-400 whitespace-pre-wrap">
                                {target.log || "Waiting for output..."}
                            </div>
                        </div>

                        {/* Verification Results */}
                        {target.verification_results && target.verification_results.length > 0 && (
                            <div className="p-4 space-y-2">
                                <h4 className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                                    <Info className="h-3 w-3" />
                                    Verification Checks ({target.verification_results.length})
                                </h4>
                                <div className="space-y-2">
                                    {target.verification_results.map((check, idx) => (
                                        <div
                                            key={idx}
                                            className={`rounded-lg border p-2 text-xs ${check.status === 'pass'
                                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                                : check.status === 'fail'
                                                    ? 'border-red-500/30 bg-red-500/5'
                                                    : 'border-amber-500/30 bg-amber-500/5'
                                                }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {check.status === 'pass' ? (
                                                    <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5" />
                                                ) : check.status === 'fail' ? (
                                                    <XCircle className="h-3 w-3 text-red-400 mt-0.5" />
                                                ) : (
                                                    <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5" />
                                                )}
                                                <div className="flex-1">
                                                    <div className="font-semibold text-neutral-200">{check.check_name}</div>
                                                    <div className="text-neutral-400 mt-1">{check.message}</div>
                                                    <div className="flex gap-4 mt-2">
                                                        {check.evidence && (
                                                            <details className="flex-1">
                                                                <summary className="cursor-pointer text-[10px] font-bold uppercase text-neutral-500 hover:text-neutral-300">Evidence</summary>
                                                                <pre className="mt-1 p-2 bg-black/50 rounded text-[10px] font-mono text-emerald-400/80 overflow-x-auto border border-neutral-800">
                                                                    {check.evidence}
                                                                </pre>
                                                            </details>
                                                        )}
                                                        {check.full_output && (
                                                            <details className="flex-1">
                                                                <summary className="cursor-pointer text-[10px] font-bold uppercase text-neutral-500 hover:text-neutral-300">Full Output</summary>
                                                                <pre className="mt-1 p-2 bg-black/50 rounded text-[10px] font-mono text-neutral-400 overflow-x-auto border border-neutral-800 max-h-64">
                                                                    {check.full_output}
                                                                </pre>
                                                            </details>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ status, large = false }: { status: string; large?: boolean }) {
    let color = "bg-neutral-800 text-neutral-400";
    let icon = <Clock className={large ? "h-5 w-5" : "h-3 w-3"} />;

    if (status === "running") {
        color = "bg-blue-500/20 text-blue-400 border-blue-500/30";
        icon = <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />;
    } else if (status === "completed" || status === "success") {
        color = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        icon = <CheckCircle className={large ? "h-5 w-5" : "h-3 w-3"} />;
    } else if (status === "failed") {
        color = "bg-red-500/20 text-red-400 border-red-500/30";
        icon = <XCircle className={large ? "h-5 w-5" : "h-3 w-3"} />;
    }

    return (
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1 font-medium ${color} ${large ? "text-sm" : "text-xs"}`}>
            {icon}
            <span className="capitalize">{status}</span>
        </div>
    );
}
