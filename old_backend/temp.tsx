'use client';

import { useState } from 'react';
import { fetchRole } from '../lib/contract';

export default function Page() {
    const [role, setRole] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null); // State to track errors

    const handleFetchRole = async () => {
        // Reset state before fetching
        setRole(null);
        setError(null);

        try {
            setRole(await fetchRole());
        } catch (e) {
            console.error(e);
            setError("Failed to fetch role");
        }
    };

    // return (
    //     <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    //         <h1>Check Issuer Role</h1>

    //         <button
    //             onClick={handleFetchRole}
    //             style={{
    //                 padding: '10px 20px',
    //                 cursor: 'pointer',
    //                 backgroundColor: '#0070f3',
    //                 color: 'white',
    //                 border: 'none',
    //                 borderRadius: '5px'
    //             }}
    //         >
    //             Get Role
    //         </button>

    //         {/* Success State */}
    //         {role && (
    //             <div style={{ marginTop: '20px', padding: '15px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '5px' }}>
    //                 <h3 style={{ margin: '0 0 10px 0', color: '#166534' }}>Success:</h3>
    //                 <code style={{ wordBreak: 'break-all' }}>{role}</code>
    //             </div>
    //         )}

    //         {/* Error State */}
    //         {error && (
    //             <div style={{ marginTop: '20px', padding: '15px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '5px' }}>
    //                 <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>Error:</h3>
    //                 <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>
    //                 {error.includes("returned no data") && (
    //                     <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#b91c1c' }}>
    //                         <strong>Tip:</strong> Your Hardhat node likely restarted. You need to redeploy your contract (`npx hardhat run scripts/deploy.js --network localhost`) and update the address in the code.
    //                     </p>
    //                 )}
    //             </div>
    //         )}
    //     </div>
    // );
}