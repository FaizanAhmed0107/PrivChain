"use client";

import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useChainId,
} from "wagmi";
import { injected } from "wagmi/connectors";

export default function Page() {
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address,
    query: { enabled: !!address },
  });

  // Format a bigint balance using the token decimals and symbol into a human-readable string.
  const formatBalance = (bal: any) => {
    if (!bal) return "Loading...";
    const decimals: number = bal.decimals ?? 0;
    const symbol: string = bal.symbol ?? "";
    const valueStr: string = (bal.value ?? 0).toString();

    if (decimals === 0) {
      return `${valueStr} ${symbol}`.trim();
    }

    // Ensure we have at least `decimals + 1` characters so slicing works
    const padded = valueStr.padStart(decimals + 1, "0");
    const intPart = padded.slice(0, padded.length - decimals) || "0";
    let fracPart = padded.slice(-decimals);

    // Trim trailing zeros from fractional part
    fracPart = fracPart.replace(/0+$/, "");

    return `${intPart}${fracPart ? `.${fracPart}` : ""} ${symbol}`.trim();
  };

  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <h1>🔗 Wallet Connection Test</h1>

      {!isConnected && (
        <button
          onClick={() => connect({ connector: injected() })}
          style={{
            padding: "12px 20px",
            background: "black",
            color: "white",
            borderRadius: "8px",
            width: "200px",
          }}
        >
          Connect Wallet
        </button>
      )}

      {isConnected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <h2>Wallet Connected 🎉</h2>

          <p>
            <strong>Address:</strong> {address}
          </p>

          <p>
            <strong>Chain ID:</strong> {chainId}
          </p>

          <p>
            <strong>Balance:</strong>{" "}
            {formatBalance(balance)}
          </p>

          <button
            onClick={() => disconnect()}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              background: "red",
              color: "white",
              borderRadius: "8px",
              width: "200px",
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </main>
  );
}
