
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { CredentialType } from "@/utils/credentialTemplates";

export function useTemplates() {
    const [templates, setTemplates] = useState<CredentialType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchTemplates = async () => {
        try {
            const { data, error } = await supabase
                .from("templates")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (data) {
                // Map DB fields to our interface
                const formatted: CredentialType[] = data.map((t: any) => ({
                    id: t.id,
                    label: t.label,
                    isDeprecated: t.is_deprecated,
                    fields: t.fields // JSONB comes back as object
                }));
                setTemplates(formatted);
            }
        } catch (e) {
            console.error(e);
            setError("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const addTemplate = async (template: CredentialType) => {
        try {
            const { error } = await supabase.from("templates").insert({
                id: template.id,
                label: template.label,
                is_deprecated: template.isDeprecated || false,
                fields: template.fields
            });

            if (error) {
                console.error("Add Error:", error);
                return false;
            }
            fetchTemplates(); // Refresh
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const deprecateTemplate = async (id: string) => {
        try {
            const { error } = await supabase
                .from("templates")
                .update({ is_deprecated: true })
                .eq("id", id);

            if (error) {
                console.error("Deprecate Error:", error);
                return false;
            }
            fetchTemplates(); // Refresh
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
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
