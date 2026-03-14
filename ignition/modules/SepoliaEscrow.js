const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SepoliaEscrowModule = buildModule("SepoliaEscrowModule", (m) => {
    // Pass the deployer address as the arbiter for now
    const arbiter = m.getAccount(0);

    // ETH/USD Data Feed on Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306
    const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

    const escrow = m.contract("Escrow", [arbiter, priceFeedAddress]);

    return { escrow };
});

module.exports = SepoliaEscrowModule;
