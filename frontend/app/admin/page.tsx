"use client";

import { useState, useEffect } from "react";
import { useTemplates } from "@/hooks/useTemplates";
import { CredentialField } from "@/utils/credentialTemplates";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminPage() {
    const router = useRouter();
    const { templates, addTemplate, deprecateTemplate } = useTemplates();
    const [showDeprecated, setShowDeprecated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Auth Check
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace("/login");
            } else {
                setLoadingAuth(false);
            }
        };
        checkUser();
    }, [router]);

    // New Template State
    const [newId, setNewId] = useState("");
    const [newLabel, setNewLabel] = useState("");
    const [newFields, setNewFields] = useState<CredentialField[]>([]);

    // Temporary field state for builder
    const [tempKey, setTempKey] = useState("");
    const [tempLabel, setTempLabel] = useState("");
    const [tempType, setTempType] = useState<"text" | "date">("text");

    const handleAddField = () => {
        if (!tempKey || !tempLabel) return;
        setNewFields([...newFields, { key: tempKey, label: tempLabel, type: tempType }]);
        setTempKey("");
        setTempLabel("");
    };

    const handleCreate = async () => {
        if (!newId || !newLabel || newFields.length === 0) return alert("Fill all details");

        const success = await addTemplate({
            id: newId,
            label: newLabel,
            fields: newFields,
            isDeprecated: false
        });

        if (success) {
            alert("Template Created!");
            setNewId("");
            setNewLabel("");
            setNewFields([]);
        } else {
            alert("Error creating template (ID might be duplicate)");
        }
    };

    return (
        <main className="w-full min-h-screen p-8 bg-gray-50 text-gray-900">
            <h1 className="text-3xl font-bold mb-8">Admin Panel: Template Manager</h1>

            <div className="flex gap-8 flex-col lg:flex-row">

                {/* LIST SECTION */}
                <div className="flex-1 bg-white p-6 rounded shadow text-gray-900">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Existing Templates</h2>
                        <label className="text-sm flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={showDeprecated}
                                onChange={e => setShowDeprecated(e.target.checked)}
                            />
                            Show Deprecated
                        </label>
                    </div>

                    <div className="flex flex-col gap-4">
                        {templates
                            .filter(t => showDeprecated ? true : !t.isDeprecated)
                            .map(t => (
                                <div key={t.id} className={`border p-4 rounded flex justify-between items-center ${t.isDeprecated ? 'bg-gray-100 opacity-75' : 'bg-white'}`}>
                                    <div>
                                        <p className="font-bold">{t.label}</p>
                                        <p className="text-xs text-gray-500">ID: {t.id} • {t.fields.length} Fields</p>
                                        {t.isDeprecated && <span className="text-xs bg-red-100 text-red-800 px-2 rounded">Deprecated</span>}
                                    </div>
                                    {!t.isDeprecated && (
                                        <button
                                            onClick={() => deprecateTemplate(t.id)}
                                            className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm transition-colors"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>

                {/* CREATE SECTION */}
                <div className="flex-1 bg-white p-6 rounded shadow h-fit text-gray-900">
                    <h2 className="text-xl font-bold mb-4">Create New Template</h2>

                    <div className="flex flex-col gap-3 mb-6">
                        <input className="border p-2 rounded bg-white text-gray-900" placeholder="Template ID (e.g. library_card)" value={newId} onChange={e => setNewId(e.target.value)} />
                        <input className="border p-2 rounded bg-white text-gray-900" placeholder="Template Name (e.g. Library Card)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                    </div>

                    <div className="bg-gray-50 p-4 rounded mb-4">
                        <p className="text-sm font-bold mb-2">Add Field</p>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <input className="border p-2 rounded text-sm bg-white text-gray-900" placeholder="Key (e.g. bookName)" value={tempKey} onChange={e => setTempKey(e.target.value)} />
                            <input className="border p-2 rounded text-sm bg-white text-gray-900" placeholder="Label (e.g. Book Name)" value={tempLabel} onChange={e => setTempLabel(e.target.value)} />
                            <select className="border p-2 rounded text-sm bg-white text-gray-900" value={tempType} onChange={e => setTempType(e.target.value as any)}>
                                <option value="text">Text</option>
                                <option value="date">Date</option>
                                <option value="number">Number</option>
                            </select>
                        </div>
                        <button onClick={handleAddField} className="bg-gray-200 hover:bg-gray-300 w-full rounded py-1 text-sm text-gray-900">Add Field</button>
                    </div>

                    {/* Field Preview */}
                    <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">Fields Preview:</p>
                        {newFields.length === 0 && <p className="text-xs text-gray-400 italic">No fields added</p>}
                        <ul className="list-disc pl-5 text-sm">
                            {newFields.map((f, i) => (
                                <li key={i}>{f.label} <span className="text-gray-400">({f.type})</span></li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={handleCreate}
                        className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={!newId || !newLabel || newFields.length === 0}
                    >
                        Create Template
                    </button>
                </div>
            </div>
        </main>
    );
}
