import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("EscrowModule", (m) => {
    // Pass the deployer address as the arbiter for now
    const arbiter = m.getAccount(0);

    const escrow = m.contract("Escrow", [arbiter]);

    return { escrow };
});
