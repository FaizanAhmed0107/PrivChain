
import { useState, useEffect } from "react";
import { CredentialType } from "@/utils/credentialTemplates";

export function useTemplates() {
    const [templates, setTemplates] = useState<CredentialType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/templates");
            const data = await res.json();
            if (Array.isArray(data)) {
                setTemplates(data);
            }
        } catch (e) {
            setError("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const addTemplate = async (template: CredentialType) => {
        const res = await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create", template })
        });
        const json = await res.json();
        if (json.success) {
            fetchTemplates(); // Refresh
            return true;
        }
        return false;
    };

    const deprecateTemplate = async (id: string) => {
        const res = await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "deprecate", id })
        });
        const json = await res.json();
        if (json.success) {
            fetchTemplates(); // Refresh
            return true;
        }
        return false;
    };

    return {
        templates,
        activeTemplates: templates.filter(t => !t.isDeprecated),
        loading,
        error,
        addTemplate,
        deprecateTemplate
    };
}
