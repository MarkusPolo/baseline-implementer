import Link from "next/link";
import { ArrowRight, Play, FileText, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-neutral-400">Overview of your switch configuration tasks.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Active Jobs" value="0" sub="Queue empty" icon={<Activity className="h-5 w-5 text-blue-500" />} />
        <StatCard title="Templates" value="3" sub="Ready to use" icon={<FileText className="h-5 w-5 text-emerald-500" />} />
        <StatCard title="Total Configured" value="128" sub="Devices this month" icon={<Play className="h-5 w-5 text-purple-500" />} />
      </div>

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
        <div className="p-6 text-center text-neutral-500 py-12 text-sm">
          No recent jobs found. Start one above.
        </div>
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
