"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Trash2, FileCode, Clock, Plus } from "lucide-react";

interface Macro {
    id: number;
    name: string;
    description: string;
    steps: any[];
    created_at: string;
}

export default function MacrosPage() {
    const [macros, setMacros] = useState<Macro[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMacros();
    }, []);

    const fetchMacros = async () => {
        try {
            const response = await fetch("/api/macros/");
            const data = await response.json();
            setMacros(data);
        } catch (error) {
            console.error("Failed to fetch macros:", error);
        } finally {
            setLoading(false);
        }
    };

    const deleteMacro = async (id: number) => {
        if (!confirm("Are you sure you want to delete this macro?")) return;
        try {
            await fetch(`/api/macros/${id}`, { method: "DELETE" });
            setMacros(macros.filter((m) => m.id !== id));
        } catch (error) {
            alert("Failed to delete macro.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Macros</h1>
                    <p className="text-neutral-400">Manage your recorded command sequences.</p>
                </div>
                <Link href="/console" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                    <Plus className="h-4 w-4" />
                    Record New
                </Link>
            </div>

            {loading ? (
                <div className="py-12 text-center text-neutral-500">Loading macros...</div>
            ) : macros.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                        <FileCode className="h-6 w-6 text-neutral-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Macros Found</h3>
                    <p className="text-neutral-500 mb-6">Record your first session to create a reusable macro.</p>
                    <Link href="/console" className="text-blue-400 hover:text-blue-300 font-medium">
                        Go to Live Console &rarr;
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {macros.map((macro) => (
                        <div key={macro.id} className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 hover:border-neutral-700 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <FileCode className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href={`/macros/edit/${macro.id}`}
                                        className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-500 hover:text-white transition-colors"
                                    >
                                        <div className="h-4 w-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => deleteMacro(macro.id)}
                                        className="p-1.5 rounded-md hover:bg-rose-500/10 text-neutral-500 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1">{macro.name}</h3>
                            <p className="text-sm text-neutral-400 line-clamp-2 mb-4 h-10">
                                {macro.description || "No description provided."}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                                <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-wider">
                                    <Clock className="h-3 w-3" />
                                    {new Date(macro.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-[10px] text-neutral-500 font-mono">
                                    {macro.steps.length} steps
                                </div>
                            </div>

                            <Link
                                href={`/macros/deploy/${macro.id}`}
                                className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 transition-colors border border-neutral-700"
                            >
                                <Play className="h-4 w-4" />
                                Deploy Macro
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
