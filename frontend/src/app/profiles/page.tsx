'use client';

import { useEffect, useState } from "react";
import { Wrench, Plus } from "lucide-react";
import api from "@/lib/api";

type Profile = {
    id: number;
    name: string;
    vendor: string;
    description?: string;
};

export default function ProfilesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/profiles")
            .then((res) => setProfiles(res.data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-neutral-500">Loading profiles...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Device Profiles</h1>
                    <p className="text-neutral-400">Manage vendor-specific device configurations</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                    <Plus className="h-4 w-4" />
                    New Profile
                </button>
            </div>

            {profiles.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
                    <Wrench className="mx-auto h-12 w-12 text-neutral-600 mb-4" />
                    <p className="text-neutral-400">No device profiles found.</p>
                    <p className="text-sm text-neutral-500 mt-2">Run the seed script to create default profiles.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {profiles.map((profile) => (
                        <div key={profile.id} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 hover:border-blue-500/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <Wrench className="h-5 w-5 text-blue-400" />
                                <span className="text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-300">
                                    {profile.vendor}
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{profile.name}</h3>
                            <p className="text-sm text-neutral-400">
                                {profile.description || "No description provided."}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
