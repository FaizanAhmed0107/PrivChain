import { http, createConfig } from "wagmi";
// import { sepolia } from "viem/chains";
import { hardhat } from "viem/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
    // chains: [sepolia],
    chains: [hardhat],
    connectors: [injected()],
    transports: {
        // [sepolia.id]: http(),
        [hardhat.id]: http(),
    },
});

