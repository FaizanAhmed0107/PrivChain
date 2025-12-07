
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define the path to the JSON DB
const DB_PATH = path.join(process.cwd(), "data", "templates.json");

// Helper to read DB
function readDB() {
    if (!fs.existsSync(DB_PATH)) {
        return [];
    }
    const fileContent = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(fileContent);
}

// Helper to write DB
function writeDB(data: any) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), "utf-8");
}

export async function GET() {
    try {
        const templates = readDB();
        return NextResponse.json(templates);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, template, id } = body;

        let templates = readDB();

        if (action === "create") {
            // Add new template
            // Check ID uniqueness
            if (templates.find((t: any) => t.id === template.id)) {
                return NextResponse.json({ error: "Template ID already exists" }, { status: 400 });
            }
            templates.push({ ...template, isDeprecated: false });
        }
        else if (action === "deprecate") {
            // Find and set isDeprecated = true
            templates = templates.map((t: any) =>
                t.id === id ? { ...t, isDeprecated: true } : t
            );
        }

        writeDB(templates);
        return NextResponse.json({ success: true, templates });

    } catch (e) {
        return NextResponse.json({ error: "Failed to update templates" }, { status: 500 });
    }
}
