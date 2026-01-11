"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "@/components/WalletConnect";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LayoutDashboard, UploadCloud, ShieldAlert, Scan } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function Navbar() {
    const pathname = usePathname();
    const { isIssuer, isAdmin } = useUserRole();
    const { theme, setTheme } = useTheme();

    const navItems = [
        {
            name: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
            visible: true,
        },
        {
            name: "Verify",
            href: "/verify",
            icon: Scan,
            visible: true,
        },
        {
            name: "Issue Credential",
            href: "/upload",
            icon: UploadCloud,
            visible: isIssuer,
        },
        {
            name: "Admin Panel",
            href: "/admin",
            icon: ShieldAlert,
            visible: isAdmin,
        },
    ];

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto max-w-7xl">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <span className="hidden font-bold sm:inline-block text-lg tracking-tight">
                            ZK Credential
                        </span>
                    </Link>

                    <div className="hidden md:flex gap-1">
                        {navItems.map((item) => (
                            item.visible && (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                                        pathname === item.href
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            )
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Role Badges for quick visibility */}
                    {(isIssuer || isAdmin) && (
                        <div className="hidden lg:flex gap-2 mr-2">
                            {isIssuer && <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20">Issuer</Badge>}
                            {isAdmin && <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">Admin</Badge>}
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        className="rounded-full"
                    >
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    <WalletConnect />
                </div>
            </div>
        </nav>
    );
}
