
import {
    useAccount,
    useBalance,
    useConnect,
    useDisconnect,
    useChainId,
    useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";

export function useWallet() {
    const { address, isConnected, chainId } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const { data: balance } = useBalance({
        address,
        query: { enabled: !!address },
    });

    const connectWallet = () => {
        connect({ connector: injected() });
    };

    const disconnectWallet = () => {
        disconnect();
    };

    const formatBalance = (bal: any) => {
        if (!bal) return "Loading...";
        const decimals: number = bal.decimals ?? 0;
        const symbol: string = bal.symbol ?? "";
        const valueStr: string = (bal.value ?? 0).toString();

        if (decimals === 0) {
            return `${valueStr} ${symbol}`.trim();
        }

        const padded = valueStr.padStart(decimals + 1, "0");
        const intPart = padded.slice(0, padded.length - decimals) || "0";
        let fracPart = padded.slice(-decimals);
        fracPart = fracPart.replace(/0+$/, "");

        return `${intPart}${fracPart ? `.${fracPart}` : ""} ${symbol}`.trim();
    };

    return {
        address,
        isConnected,
        chainId,
        balance,
        connectWallet,
        disconnectWallet,
        switchChain,
        formatBalance,
    };
}
