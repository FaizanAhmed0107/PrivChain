export interface CredentialField {
    key: string;
    label: string;
    type: "text" | "date" | "number" | "email";
    placeholder?: string;
    zkpType?: "age" | "cgpa" | "none";
}

export interface CredentialType {
    id: string;
    label: string;
    isDeprecated?: boolean;
    fields: CredentialField[];
}
