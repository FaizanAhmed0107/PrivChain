
export interface CredentialField {
    key: string;
    label: string;
    type: "text" | "date" | "number" | "email";
    placeholder?: string;
}

export interface CredentialType {
    id: string;
    label: string;
    isDeprecated?: boolean; // New field
    fields: CredentialField[];
}

// Data is now fetched from API
