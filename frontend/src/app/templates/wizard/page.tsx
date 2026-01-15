'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Save, Code } from "lucide-react";
import api from "@/lib/api";

type Profile = {
    id: number;
    name: string;
    vendor: string;
};

export default function WizardPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        profileId: undefined as number | undefined,
        mgmtVlan: "1",
        mgmtIpType: "static", // static, dhcp
        enableSsh: true,
        localUser: "admin",
        generateCrypto: true,
    });

    useEffect(() => {
        // Load profiles
        api.get("profiles/").then((res) => setProfiles(res.data)).catch(() => { });
    }, []);

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const generateTemplate = () => {
        let body = "";

        // Basic stuff
        body += "hostname {{ hostname }}\n";
        body += "!\n";

        // Mgmt VLAN
        body += `interface Vlan${formData.mgmtVlan}\n`;
        if (formData.mgmtIpType === "static") {
            body += " ip address {{ mgmt_ip }} {{ mgmt_mask }}\n";
        } else {
            body += " ip address dhcp\n";
        }
        body += " no shutdown\n";
        body += "!\n";

        // Gateway
        body += "ip default-gateway {{ gateway }}\n";
        body += "!\n";

        // SSH & User
        if (formData.enableSsh) {
            body += `username ${formData.localUser} privilege 15 secret {{ secret }}\n`;
            body += "ip domain-name example.com\n";
            if (formData.generateCrypto) {
                body += "crypto key generate rsa modulus 2048\n";
            }
            body += "line vty 0 4\n";
            body += " transport input ssh\n";
            body += " login local\n";
            body += "!\n";
        }

        return body;
    };

    const generateSchema = () => {
        const fields = [
            { name: "hostname", label: "Hostname", type: "text", required: true },
            { name: "gateway", label: "Default Gateway", type: "ipv4", required: true },
        ];

        if (formData.mgmtIpType === "static") {
            fields.push({ name: "mgmt_ip", label: "Management IP", type: "ipv4", required: true });
            fields.push({ name: "mgmt_mask", label: "Subnet Mask", type: "ipv4", required: true });
        }

        if (formData.enableSsh) {
            fields.push({ name: "secret", label: `${formData.localUser} Password`, type: "password", required: true });
        }

        return { fields };
    };

    const handleSubmit = async () => {
        try {
            await api.post("templates/", {
                name: formData.name,
                body: generateTemplate(),
                config_schema: generateSchema(),
                profile_id: formData.profileId
            });
            router.push("/templates");
        } catch (err) {
            alert("Failed to save template");
            console.error(err);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Template Wizard</h1>
                <p className="text-neutral-400">Create a standard switch configuration template.</p>
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded ${step === 1 ? "bg-blue-600 text-white" : "text-neutral-500"}`}>1. Basics</span>
                <ChevronRight className="h-3 w-3 text-neutral-600" />
                <span className={`px-2 py-1 rounded ${step === 2 ? "bg-blue-600 text-white" : "text-neutral-500"}`}>2. Network</span>
                <ChevronRight className="h-3 w-3 text-neutral-600" />
                <span className={`px-2 py-1 rounded ${step === 3 ? "bg-blue-600 text-white" : "text-neutral-500"}`}>3. Security</span>
                <ChevronRight className="h-3 w-3 text-neutral-600" />
                <span className={`px-2 py-1 rounded ${step === 4 ? "bg-emerald-600 text-white" : "text-neutral-500"}`}>4. Preview</span>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-6">
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">General Information</h2>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">Template Name</label>
                            <input
                                className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-2 text-white mt-1"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Access Switch L2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">Description</label>
                            <textarea
                                className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-2 text-white mt-1"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">Device Profile (Optional)</label>
                            <select
                                className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-2 text-white mt-1"
                                value={formData.profileId || ""}
                                onChange={e => setFormData({ ...formData, profileId: e.target.value ? parseInt(e.target.value) : undefined })}
                            >
                                <option value="">-- Generic/Default --</option>
                                {profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.vendor})</option>)}
                            </select>
                            <p className="text-xs text-neutral-500 mt-1">Select a device profile to use vendor-specific command patterns.</p>
                        </div>
                    </div>
                )}


                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">Management Network</h2>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">Management VLAN ID</label>
                            <input
                                type="number"
                                className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-2 text-white mt-1"
                                value={formData.mgmtVlan}
                                onChange={e => setFormData({ ...formData, mgmtVlan: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">IP Configuration</label>
                            <select
                                className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-2 text-white mt-1"
                                value={formData.mgmtIpType}
                                onChange={e => setFormData({ ...formData, mgmtIpType: e.target.value })}
                            >
                                <option value="static">Static IP (Ask per device)</option>
                                <option value="dhcp">DHCP</option>
                            </select>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">Access & Security</h2>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.enableSsh}
                                onChange={e => setFormData({ ...formData, enableSsh: e.target.checked })}
                                className="accent-blue-600"
                            />
                            <label className="text-sm text-neutral-300">Enable SSH Access</label>
                        </div>
                        {formData.enableSsh && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300">Local Admin Username</label>
                                    <input
                                        className="w-full rounded bg-neutral-950 border border-neutral-700 px-3 py-2 text-white mt-1"
                                        value={formData.localUser}
                                        onChange={e => setFormData({ ...formData, localUser: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.generateCrypto}
                                        onChange={e => setFormData({ ...formData, generateCrypto: e.target.checked })}
                                        className="accent-blue-600"
                                    />
                                    <label className="text-sm text-neutral-300">Generate Crypto Keys (RSA 2048)</label>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">Review Template</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <span className="text-xs uppercase text-neutral-500 font-bold block">Generated Config</span>
                                <pre className="text-xs font-mono bg-black p-3 rounded-lg overflow-x-auto text-green-400 border border-neutral-800">
                                    {generateTemplate()}
                                </pre>
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs uppercase text-neutral-500 font-bold block">Generated Schema</span>
                                <pre className="text-xs font-mono bg-black p-3 rounded-lg overflow-x-auto text-blue-400 border border-neutral-800">
                                    {JSON.stringify(generateSchema(), null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex justify-between pt-4 border-t border-neutral-800">
                    <button
                        onClick={prevStep}
                        disabled={step === 1}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:text-white disabled:opacity-50"
                    >
                        <ChevronLeft className="h-4 w-4" /> Back
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!formData.name}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" /> Save Template
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
