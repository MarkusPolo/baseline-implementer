'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Play, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";

type Job = {
    id: number;
    template_id: number;
    status: string;
    created_at: string;
};

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("jobs/")
            .then((res) => setJobs(res.data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
            case 'failed': return <Activity className="h-4 w-4 text-red-500" />;
            case 'running': return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
            default: return <Clock className="h-4 w-4 text-neutral-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Jobs</h1>
                    <p className="text-neutral-400">History of configuration executions.</p>
                </div>
                <Link href="/jobs/new" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                    <Play className="h-4 w-4" />
                    New Job
                </Link>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-800/50 text-neutral-400 uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Job ID</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Created At</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">Loading jobs...</td>
                            </tr>
                        ) : jobs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">No jobs found.</td>
                            </tr>
                        ) : (
                            jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-neutral-800/30 transition-colors">
                                    <td className="px-6 py-4 font-mono text-blue-400">#{job.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(job.status)}
                                            <span className="capitalize text-neutral-300">{job.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400">
                                        {new Date(job.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/jobs/${job.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
