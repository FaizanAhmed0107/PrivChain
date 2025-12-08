"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet";
import { useTemplates } from "@/hooks/useTemplates";
import { CredentialField } from "@/utils/credentialTemplates";
import { checkIsAdmin, getAllIssuers, addIssuer, removeIssuer } from "@/lib/contract";
import { cn } from "@/lib/utils";
import {
    Shield,
    UserPlus,
    UserMinus,
    Users,
    FilePlus,
    Trash2,
    Lock,
    Loader2,
    AlertTriangle,
} from "lucide-react";

export default function AdminPage() {
    const { templates, addTemplate, deprecateTemplate } = useTemplates();
    const [showDeprecated, setShowDeprecated] = useState(false);

    // Auth State
    const { address, isConnected, connectWallet } = useWallet();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(false);
    const [accessError, setAccessError] = useState("");

    // Issuer Management State
    const [issuers, setIssuers] = useState<string[]>([]);
    const [newIssuerAddress, setNewIssuerAddress] = useState("");
    const [loadingIssuers, setLoadingIssuers] = useState(false);

    // Template State
    const [newId, setNewId] = useState("");
    const [newLabel, setNewLabel] = useState("");
    const [newFields, setNewFields] = useState<CredentialField[]>([]);
    const [tempKey, setTempKey] = useState("");
    const [tempLabel, setTempLabel] = useState("");
    const [tempType, setTempType] = useState<"text" | "date" | "number" | "email">("text");

    useEffect(() => {
        if (isConnected && address) {
            verifyAdmin();
        } else {
            setIsAdmin(false);
        }
    }, [isConnected, address]);

    useEffect(() => {
        if (isAdmin) {
            fetchIssuers();
        }
    }, [isAdmin]);

    const verifyAdmin = async () => {
        if (!address) return;
        setCheckingAccess(true);
        try {
            const { ok, isAdmin: adminStatus, error } = await checkIsAdmin(address);
            if (ok && adminStatus) {
                setIsAdmin(true);
                setAccessError("");
            } else {
                setIsAdmin(false);
                setAccessError("Access Denied: Default Admin Role Required.");
            }
        } catch (e) {
            console.error(e);
            setAccessError("Failed to verify admin status.");
        } finally {
            setCheckingAccess(false);
        }
    };

    const fetchIssuers = async () => {
        setLoadingIssuers(true);
        const { ok, data } = await getAllIssuers();
        if (ok && data) {
            setIssuers(data);
        }
        setLoadingIssuers(false);
    };

    const handleAddIssuer = async () => {
        if (!newIssuerAddress) return;

        try {
            const { ok, error } = await addIssuer(newIssuerAddress);
            if (ok) {
                alert("Issuer Added (Wait for confirmation)");
                setNewIssuerAddress("");
                setTimeout(fetchIssuers, 4000);
            } else {
                alert("Failed: " + error);
            }
        } catch (e) {
            alert("Error: " + (e as any).message);
        }
    };

    const handleRemoveIssuer = async (addr: string) => {
        if (!confirm(`Remove ${addr}?`)) return;
        const { ok, error } = await removeIssuer(addr);
        if (ok) {
            setTimeout(fetchIssuers, 4000);
        } else {
            alert("Failed: " + error);
        }
    };

    const handleAddField = () => {
        if (!tempKey || !tempLabel) return;
        setNewFields([...newFields, { key: tempKey, label: tempLabel, type: tempType }]);
        setTempKey("");
        setTempLabel("");
    };

    const handleCreateTemplate = async () => {
        if (!newId || !newLabel || newFields.length === 0) return alert("Fill all details");
        const success = await addTemplate({
            id: newId,
            label: newLabel,
            fields: newFields,
            isDeprecated: false
        });
        if (success) {
            setNewId("");
            setNewLabel("");
            setNewFields([]);
            alert("Template Created in DB");
        } else {
            alert("Failed to create template");
        }
    };

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="bg-primary/10 p-6 rounded-full mb-6 max-w-min mx-auto">
                    <Shield className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Admin Access Required</h2>
                <button
                    onClick={connectWallet}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    if (checkingAccess) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="bg-destructive/10 p-6 rounded-full mb-6 max-w-min mx-auto">
                    <AlertTriangle className="w-16 h-16 text-destructive" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-destructive">
                    Access Denied
                </h2>
                <p className="text-muted-foreground mb-4">{accessError || "You are not an admin."}</p>
                <div className="text-xs font-mono bg-secondary p-2 rounded">{address}</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-12">
            <div className="border-b border-border pb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
                    <p className="text-muted-foreground mt-1">Manage system issuers and templates.</p>
                </div>
                <div className="text-xs font-mono bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                    Admin: {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ISSUER MANAGEMENT */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            Issuer Management
                        </h2>
                    </div>

                    <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex gap-4 mb-6">
                            <input
                                className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                placeholder="0x..."
                                value={newIssuerAddress}
                                onChange={e => setNewIssuerAddress(e.target.value)}
                            />
                            <button
                                onClick={handleAddIssuer}
                                disabled={!newIssuerAddress}
                                className={cn("px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium transition-colors flex items-center gap-2", !newIssuerAddress && "opacity-50")}
                            >
                                <UserPlus className="w-4 h-4" /> Add
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {loadingIssuers && <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />}
                            {!loadingIssuers && issuers.length === 0 && <p className="text-sm text-muted-foreground text-center">No issuers found.</p>}
                            {issuers.map(i => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 border border-border">
                                    <span className="font-mono text-sm truncate max-w-[200px]">{i}</span>
                                    <button
                                        onClick={() => handleRemoveIssuer(i)}
                                        className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                                    >
                                        <UserMinus className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* TEMPLATE MANAGEMENT */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <FilePlus className="w-6 h-6 text-cyan-400" />
                            Templates
                        </h2>
                        <label className="text-xs flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={showDeprecated} onChange={e => setShowDeprecated(e.target.checked)} />
                            Show Deprecated
                        </label>
                    </div>

                    <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                        <div className="space-y-4 mb-6 p-4 bg-secondary/20 rounded-lg border border-border/50">
                            <h3 className="font-semibold text-sm mb-2">Create New</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <input className="bg-background border border-input rounded px-3 py-2 text-sm" placeholder="ID (e.g. visa)" value={newId} onChange={e => setNewId(e.target.value)} />
                                <input className="bg-background border border-input rounded px-3 py-2 text-sm" placeholder="Label (e.g. Visa)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                            </div>

                            <div className="flex gap-2 items-center">
                                <input className="flex-1 bg-background border px-2 py-1 text-xs rounded" placeholder="Field Key" value={tempKey} onChange={e => setTempKey(e.target.value)} />
                                <input className="flex-1 bg-background border px-2 py-1 text-xs rounded" placeholder="Label" value={tempLabel} onChange={e => setTempLabel(e.target.value)} />
                                <select className="bg-background border px-2 py-1 text-xs rounded" value={tempType} onChange={e => setTempType(e.target.value as any)}>
                                    <option value="text">Text</option>
                                    <option value="date">Date</option>
                                    <option value="number">Num</option>
                                </select>
                                <button onClick={handleAddField} className="bg-secondary hover:bg-border border px-3 py-1 text-xs rounded">+</button>
                            </div>

                            {newFields.length > 0 && (
                                <div className="text-xs text-muted-foreground bg-background p-2 rounded border border-border">
                                    {newFields.map(f => f.key).join(", ")}
                                </div>
                            )}

                            <button onClick={handleCreateTemplate} disabled={!newId || !newLabel} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded text-sm font-bold transition-colors">
                                Save Template
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {templates.filter(t => showDeprecated ? true : !t.isDeprecated).map(t => (
                                <div key={t.id} className={cn("p-3 rounded border flex justify-between items-center", t.isDeprecated ? "bg-muted opacity-60" : "bg-card border-border")}>
                                    <div>
                                        <p className="font-bold text-sm">{t.label}</p>
                                        <p className="text-xs text-muted-foreground">{t.fields.length} fields</p>
                                    </div>
                                    {!t.isDeprecated && (
                                        <button onClick={() => deprecateTemplate(t.id)} className="text-destructive text-xs hover:underline">
                                            Deprecate
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
