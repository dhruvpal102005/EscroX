const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const EscrowModule = buildModule("EscrowModule", (m) => {
    // Pass the deployer address as the arbiter for now
    const arbiter = m.getAccount(0);

    // Initial price for Mock Aggregator: $2500 per ETH (with 8 decimals)
    const initialPrice = 2500n * 10n ** 8n;
    const mockAggregator = m.contract("MockV3Aggregator", [8, initialPrice]);

    const escrow = m.contract("Escrow", [arbiter, mockAggregator]);

    return { escrow, mockAggregator };
});

module.exports = EscrowModule;


