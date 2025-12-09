import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { checkIsAdmin, checkIsIssuer } from "@/lib/contract";

export function useUserRole() {
    const { address, isConnected } = useAccount();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isIssuer, setIsIssuer] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRoles = async () => {
            if (!isConnected || !address) {
                setIsAdmin(false);
                setIsIssuer(false);
                return;
            }

            setLoading(true);
            try {
                const [adminResult, issuerResult] = await Promise.all([
                    checkIsAdmin(address),
                    checkIsIssuer(address),
                ]);

                if (adminResult.ok) setIsAdmin(!!adminResult.isAdmin);
                if (issuerResult.ok) setIsIssuer(!!issuerResult.isIssuer);
            } catch (error) {
                console.error("Failed to fetch roles", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
    }, [address, isConnected]);

    return { isAdmin, isIssuer, loading };
}
