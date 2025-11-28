'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
  "function ISSUER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
];

export default function Home() {
  // State
  const [wallet, setWallet] = useState({ address: '', chainId: null, isConnected: false });
  const [contractData, setContractData] = useState({ issuerRole: 'Waiting for fetch...', isAdmin: 'Waiting for fetch...' });
  const [logs, setLogs] = useState(["> Ready to connect..."]);
  const [loading, setLoading] = useState(false);

  // Refs for scrolling logs
  const logsEndRef = useRef(null);

  // Helper to add logs
  const addLog = (msg) => {
    setLogs((prev) => [...prev, `> ${msg}`]);
  };

  // Scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Connect Wallet Function
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      addLog("Error: MetaMask not found! Please install it.");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Request accounts
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setWallet({ address, chainId, isConnected: true });

      addLog(`Wallet connected: ${address}`);
      addLog(`Network detected: ${network.name} (${chainId})`);

      if (chainId !== 31337) {
        addLog("WARNING: You are not on Localhost (Chain ID 31337). Verify your MetaMask network.");
      }
    } catch (error) {
      console.error(error);
      addLog(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Read Contract Function
  const readContract = async () => {
    if (!wallet.isConnected) {
      addLog("Error: Wallet not connected.");
      return;
    }

    try {
      setLoading(true);
      addLog("Fetching public variables from contract...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

      // 1. Fetch ISSUER_ROLE
      const issuerRole = await contract.ISSUER_ROLE();
      addLog("Success: Fetched ISSUER_ROLE");

      // 2. Fetch DEFAULT_ADMIN_ROLE and check hasRole
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      const isAdmin = await contract.hasRole(adminRole, wallet.address);

      setContractData({
        issuerRole: issuerRole,
        isAdmin: `${isAdmin ? "YES" : "NO"} (checked against ${wallet.address.substring(0, 6)}...)`
      });

      addLog("Success: Verification complete.");

    } catch (error) {
      console.error(error);
      addLog("Contract Error: Could not fetch data. Is the local node running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 font-sans p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-8">
        <h1 className="text-3xl font-bold mb-2 text-indigo-400">Smart Contract Tester</h1>
        <p className="text-slate-400 mb-8">Connect to Localhost and verify your CredentialRegistry deployment.</p>

        {/* Status Bar */}
        <div className="bg-slate-900 p-4 rounded-lg mb-6 border border-slate-700">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${wallet.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <span className="font-mono text-sm">
              {wallet.isConnected
                ? `Connected: ${wallet.address.substring(0, 6)}...${wallet.address.substring(38)} (Chain ID: ${wallet.chainId})`
                : "Not Connected"
              }
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono">
            Target Contract: <span className="text-slate-300">{CONTRACT_ADDRESS}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={connectWallet}
            disabled={wallet.isConnected || loading}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${wallet.isConnected
              ? 'bg-slate-700 text-slate-400 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
          >
            {wallet.isConnected ? "1. Wallet Connected" : "1. Connect Wallet"}
          </button>

          <button
            onClick={readContract}
            disabled={!wallet.isConnected || loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            2. Test Contract Read
          </button>
        </div>

        {/* Output Log */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2">Contract Data</h3>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-900 p-4 rounded border border-slate-700">
              <span className="text-xs text-slate-500 uppercase tracking-wider">ISSUER_ROLE (Hash)</span>
              <p className="font-mono text-indigo-300 mt-1 text-sm break-all">
                {contractData.issuerRole}
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded border border-slate-700">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Does Current User have Admin Role?</span>
              <p className="font-mono text-emerald-300 mt-1 text-sm">
                {contractData.isAdmin}
              </p>
            </div>
          </div>

          {/* Console Output */}
          <div className="mt-6">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Logs</span>
            <div className="bg-black/50 p-4 rounded font-mono text-xs text-green-400 h-40 overflow-y-auto mt-2 flex flex-col">
              {logs.map((log, index) => (
                <span key={index} className={log.includes("WARNING") ? "text-yellow-400" : log.includes("Error") ? "text-red-400" : ""}>
                  {log}
                </span>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}