"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Play, FileText, Activity, CheckCircle, Clock, XCircle } from "lucide-react";

type Job = {
  id: number;
  template_id: number;
  status: string;
  created_at: string;
  target_count: number;
};

type DashboardSummary = {
  active_sessions: number;
  template_count: number;
  configured_targets: number;
  recent_jobs: Job[];
};

export default function Home() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard/summary");

        if (!response.ok) {
          throw new Error("Could not load dashboard summary");
        }

        const data = (await response.json()) as DashboardSummary;

        if (!cancelled) {
          setSummary(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Dashboard data could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    const intervalId = window.setInterval(loadDashboard, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const activeSessions = summary?.active_sessions ?? 0;
  const templateCount = summary?.template_count ?? 0;
  const configuredTargets = summary?.configured_targets ?? 0;
  const recentJobs = useMemo(() => summary?.recent_jobs ?? [], [summary]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-neutral-400">Overview of your switch configuration tasks.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Active Sessions"
          value={loading ? "--" : activeSessions.toString()}
          sub={activeSessions === 1 ? "Console lock active" : "Console locks active"}
          icon={<Activity className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Templates"
          value={loading ? "--" : templateCount.toString()}
          sub="Ready to use"
          icon={<FileText className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          title="Total Configured"
          value={loading ? "--" : configuredTargets.toString()}
          sub="Successful targets"
          icon={<CheckCircle className="h-5 w-5 text-purple-500" />}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link href="/jobs/new" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
          <Play className="h-4 w-4" />
          Start New Job
        </Link>
        <Link href="/templates/builder" className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 transition-colors border border-neutral-700">
          <FileText className="h-4 w-4" />
          Create Template
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="font-semibold text-white">Recent Jobs</h3>
          <Link href="/jobs" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-6 text-center text-neutral-500 py-12 text-sm">
            Loading recent jobs...
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="p-6 text-center text-neutral-500 py-12 text-sm">
            No recent jobs found. Start one above.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-neutral-800/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={job.status} />
                    <span className="font-medium text-neutral-200">Job #{job.id}</span>
                    <span className="text-xs text-neutral-500">Template #{job.template_id}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {job.target_count} {job.target_count === 1 ? "target" : "targets"} · {new Date(job.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs capitalize text-neutral-300">
                  {job.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <p className="text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") {
    return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  }

  if (status === "failed") {
    return <XCircle className="h-4 w-4 text-rose-500" />;
  }

  if (status === "running") {
    return <Activity className="h-4 w-4 text-blue-500" />;
  }

  return <Clock className="h-4 w-4 text-neutral-500" />;
}
