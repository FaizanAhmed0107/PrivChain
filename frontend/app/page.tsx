"use client";

import { useWallet } from "@/lib/wallet";

export default function Page() {
  const {
    connectWallet,
    disconnectWallet,
    address,
    isConnected,
    chainId,
    balance,
    formatBalance
  } = useWallet();

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
          onClick={connectWallet}
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
            onClick={disconnectWallet}
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
