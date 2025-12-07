
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ cid: string }> }
) {
    try {
        const { cid } = await params;

        if (!cid) {
            return NextResponse.json({ error: "Missing CID" }, { status: 400 });
        }

        // Use the public gateway (Server-to-Server fetch has no CORS issues)
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

        const response = await fetch(gatewayUrl);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch from IPFS: ${response.statusText}` },
                { status: response.status }
            );
        }

        // Forward the content
        return new NextResponse(response.body, {
            status: 200,
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });

    } catch (error) {
        console.error("IPFS Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
