// Debug script to inspect escrow contract state
// Run with: npx hardhat run scripts/debug_escrow.cjs --network localhost

const hre = require("hardhat");

async function main() {
    const ESCROW_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const signers = await hre.ethers.getSigners();

    console.log("\n=== HARDHAT ACCOUNTS ===");
    for (let i = 0; i < 5; i++) {
        const balance = await hre.ethers.provider.getBalance(signers[i].address);
        console.log(`Account ${i}: ${signers[i].address} => ${hre.ethers.formatEther(balance)} ETH`);
    }

    const escrow = await hre.ethers.getContractAt("Escrow", ESCROW_ADDRESS);

    const contractBalance = await hre.ethers.provider.getBalance(ESCROW_ADDRESS);
    const nextProjectId = await escrow.nextProjectId();
    console.log(`\n=== ESCROW CONTRACT ===`);
    console.log(`Address: ${ESCROW_ADDRESS}`);
    console.log(`Balance held in contract: ${hre.ethers.formatEther(contractBalance)} ETH`);
    console.log(`Total projects created: ${nextProjectId}`);
    console.log(`Arbiter: ${await escrow.arbiter()}`);

    if (Number(nextProjectId) > 0) {
        console.log(`\n=== PROJECTS ===`);
        for (let i = 0; i < Number(nextProjectId); i++) {
            // projects() returns: client, freelancer, totalValueUSD, totalValueETH, balanceETH, isCompleted, isDisputed, milestoneCount
            const [client, freelancer, totalValueUSD, totalValueETH, balanceETH, isCompleted, isDisputed, milestoneCount] = await escrow.projects(i);
            console.log(`\n--- Project #${i} ---`);
            console.log(`  Client     : ${client}`);
            console.log(`  Freelancer : ${freelancer}`);
            console.log(`  Total USD  : $${Number(totalValueUSD) / 100}`);
            console.log(`  Total ETH  : ${hre.ethers.formatEther(totalValueETH)} ETH`);
            console.log(`  Balance    : ${hre.ethers.formatEther(balanceETH)} ETH (locked in contract)`);
            console.log(`  Completed  : ${isCompleted}`);
            console.log(`  Disputed   : ${isDisputed}`);
            console.log(`  Milestones : ${milestoneCount}`);

            // Check Hardhat accounts to see if client/freelancer match
            const knownAccounts = signers.map((s, idx) => `Account ${idx}: ${s.address}`);
            console.log(`\n  Client matches: ${knownAccounts.find(a => a.toLowerCase().includes(client.toLowerCase())) || '⚠️ Not a Hardhat account!'}`);
            console.log(`  Freelancer matches: ${knownAccounts.find(a => a.toLowerCase().includes(freelancer.toLowerCase())) || '⚠️ NOT a Hardhat account - funds go here but may not show in MetaMask!'}`);
        }
    } else {
        console.log("\n⚠️  No projects found on-chain yet. Create a new contract first.");
    }
}

main().catch(console.error);
