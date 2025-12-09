"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet";
import { useTemplates } from "@/hooks/useTemplates";
import { CredentialField } from "@/utils/credentialTemplates";
import { getAllIssuers, addIssuer, removeIssuer } from "@/lib/contract";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Plus,
    Minus
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
    const { templates, addTemplate, deprecateTemplate } = useTemplates();
    const [showDeprecated, setShowDeprecated] = useState(false);

    // Auth State
    const { address, isConnected } = useWallet();
    const { isAdmin, loading: loadingRole } = useUserRole();

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
        if (isAdmin) {
            fetchIssuers();
        }
    }, [isAdmin]);


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
                alert("Issuer Added (Wait for confirmation on chain)");
                setNewIssuerAddress("");
                // Optimistic UI or wait? We'll wait a bit then refresh
                setTimeout(fetchIssuers, 4000);
            } else {
                alert("Failed: " + error);
            }
        } catch (e) {
            alert("Error: " + (e as any).message);
        }
    };

    const handleRemoveIssuer = async (addr: string) => {
        if (!confirm(`Remove access for ${addr}?`)) return;
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
        if (!newId || !newLabel || newFields.length === 0) return alert("Please fill all details and add at least one field.");
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
            alert("Template Created!");
        } else {
            alert("Failed to create template");
        }
    };


    if (loadingRole) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isConnected) {
        return (
            <main className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-primary/5 p-8 rounded-full mb-6 relative">
                    <Shield className="h-16 w-16 text-primary" />
                    <Lock className="h-6 w-6 absolute bottom-6 right-6 text-primary bg-background rounded-full p-1" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3">Admin Access Required</h1>
                <p className="text-muted-foreground max-w-md mb-8">
                    Connect an accredited admin wallet to access system settings.
                </p>
            </main>
        );
    }

    if (!isAdmin) {
        return (
            <main className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-destructive/10 p-8 rounded-full mb-6 text-destructive">
                    <AlertTriangle className="h-16 w-16" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3 text-destructive">Access Denied</h1>
                <p className="text-muted-foreground max-w-md mb-4 leading-relaxed">
                    Account <br /><code className="bg-muted px-2 py-1 rounded font-mono text-sm inline-block my-2">{address}</code><br /> does not have admin privileges.
                </p>
                <Button asChild variant="outline">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Console</h1>
                    <p className="text-muted-foreground">Manage authorized issuers and system configuration.</p>
                </div>
                <Badge variant="secondary" className="font-mono">{issuers.length} Active Issuers</Badge>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ISSUER MANAGEMENT */}
                <Card className="h-fit">
                    <CardHeader className="bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Issuer Management
                        </CardTitle>
                        <CardDescription>Grant or revoke issuer capabilities.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Issuer Address (0x...)"
                                className="font-mono flex-1"
                                value={newIssuerAddress}
                                onChange={e => setNewIssuerAddress(e.target.value)}
                            />
                            <Button
                                onClick={handleAddIssuer}
                                disabled={!newIssuerAddress}
                                className="shrink-0"
                            >
                                <UserPlus className="w-4 h-4 mr-2" /> Add
                            </Button>
                        </div>

                        <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto bg-background/50">
                            {loadingIssuers && <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>}
                            {!loadingIssuers && issuers.length === 0 && <p className="p-4 text-sm text-center text-muted-foreground">No authorized issuers found.</p>}
                            {issuers.map(i => (
                                <div key={i} className="flex justify-between items-center p-3 hover:bg-muted/50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Shield className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="font-mono text-xs sm:text-sm text-muted-foreground group-hover:text-foreground transition-colors">{i}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveIssuer(i)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Revoke Access"
                                    >
                                        <UserMinus className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* TEMPLATE MANAGEMENT */}
                <Card className="h-fit">
                    <CardHeader className="bg-muted/10">
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <FilePlus className="w-5 h-5 text-indigo-500" />
                                Credential Templates
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                                    <input type="checkbox" className="accent-primary" checked={showDeprecated} onChange={e => setShowDeprecated(e.target.checked)} />
                                    Show Deprecated
                                </label>
                            </div>
                        </div>
                        <CardDescription>Define structures for new credentials.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">

                        <div className="p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                            <h4 className="font-semibold text-sm mb-2 text-indigo-700 dark:text-indigo-400">New Template Definition</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Type ID (e.g. visa_v1)" value={newId} onChange={e => setNewId(e.target.value)} />
                                <Input placeholder="Label (e.g. Tourist Visa)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase text-muted-foreground">Add Field</div>
                                <div className="flex gap-2">
                                    <Input placeholder="Key" className="h-8 text-xs font-mono" value={tempKey} onChange={e => setTempKey(e.target.value)} />
                                    <Input placeholder="Label" className="h-8 text-xs" value={tempLabel} onChange={e => setTempLabel(e.target.value)} />
                                    <select
                                        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={tempType}
                                        onChange={e => setTempType(e.target.value as any)}
                                    >
                                        <option value="text">Text</option>
                                        <option value="date">Date</option>
                                        <option value="number">Num</option>
                                    </select>
                                    <Button size="sm" variant="secondary" onClick={handleAddField} className="h-8 w-8 p-0" title="Add Field">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {newFields.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {newFields.map((f, i) => (
                                        <Badge key={i} variant="outline" className="bg-background text-indigo-600 border-indigo-200">
                                            {f.key} <span className="text-[10px] ml-1 opacity-50">({f.type})</span>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <Button onClick={handleCreateTemplate} disabled={!newId || !newLabel} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                Save Template
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {templates.filter(t => showDeprecated ? true : !t.isDeprecated).map(t => (
                                <div key={t.id} className={cn("p-3 rounded-lg border flex justify-between items-center transition-all hover:bg-muted/50", t.isDeprecated ? "bg-muted opacity-60 grayscale" : "bg-card")}>
                                    <div>
                                        <p className="font-bold text-sm">{t.label}</p>
                                        <div className="flex gap-2 mt-1">
                                            <Badge variant="outline" className="text-[10px] h-5">{t.id}</Badge>
                                            <span className="text-xs text-muted-foreground">{t.fields.length} fields</span>
                                        </div>
                                    </div>
                                    {!t.isDeprecated && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deprecateTemplate(t.id)}
                                            className="text-destructive hover:bg-destructive/10 h-8"
                                        >
                                            Deprecate
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
