'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import api from "@/lib/api";

type Template = {
    id: number;
    name: string;
    created_at: string;
};

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("templates/")
            .then((res) => setTemplates(res.data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Templates</h1>
                    <p className="text-neutral-400">Manage configuration templates.</p>
                </div>
                <Link href="/templates/wizard" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                    <Plus className="h-4 w-4" />
                    New Template
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <p className="text-neutral-500">Loading templates...</p>
                ) : templates.length === 0 ? (
                    <div className="col-span-full py-12 text-center border rounded-xl border-dashed border-neutral-800 text-neutral-500 bg-neutral-900/20">
                        No templates found. Create one to get started.
                    </div>
                ) : (
                    templates.map((t) => (
                        <div key={t.id} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 hover:border-neutral-700 transition-colors group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                                    <FileText className="h-5 w-5" />
                                </div>
                            </div>
                            <h3 className="font-semibold text-white">{t.name}</h3>
                            <p className="text-xs text-neutral-500 mt-1">
                                Created: {new Date(t.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
