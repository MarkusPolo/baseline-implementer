"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MacroEditor } from "@/components/MacroEditor";

export default function EditMacroPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;
    const [macro, setMacro] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetch(`/api/macros/${id}`)
                .then((res) => {
                    if (!res.ok) throw new Error("Macro not found");
                    return res.json();
                })
                .then((data) => setMacro(data))
                .catch((err) => {
                    console.error(err);
                    alert("Failed to load macro");
                    router.push("/macros");
                })
                .finally(() => setLoading(false));
        }
    }, [id, router]);

    const handleSave = async (name: string, description: string, steps: any[], schema: any) => {
        try {
            const response = await fetch(`/api/macros/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    steps,
                    config_schema: schema
                }),
            });

            if (response.ok) {
                alert("Macro updated successfully!");
                router.push("/macros");
            } else {
                const err = await response.json();
                alert(`Error: ${JSON.stringify(err.detail)}`);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to update macro");
        }
    };

    if (loading) return <div className="text-center py-12 text-neutral-500">Loading macro...</div>;
    if (!macro) return null;

    return (
        <div className="mx-auto max-w-4xl py-6">
            <MacroEditor
                initialSteps={macro.steps}
                initialName={macro.name}
                initialDescription={macro.description}
                onSave={handleSave}
                onCancel={() => router.push("/macros")}
            />
        </div>
    );
}
