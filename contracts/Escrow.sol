// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EscrowX
 * @dev Secure, milestone-based escrow contract for freelance marketplaces.
 * Funds are locked upon creation and only released by the client to the freelancer.
 */
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract Escrow {
    address public arbiter;
    AggregatorV3Interface internal priceFeed;

    struct Milestone {
        string title;
        uint256 amountUSD; // Stored in USD (with 2 decimals, e.g., 1000 = $10.00)
        uint256 amountETH; // Equivalent ETH in wei at time of creation
        bool isApproved;
    }

    struct Project {
        address client;
        address freelancer;
        uint256 totalValueUSD;
        uint256 totalValueETH;
        uint256 balanceETH;
        bool isCompleted;
        bool isDisputed;
        mapping(uint256 => Milestone) milestones;
        uint256 milestoneCount;
    }

    mapping(uint256 => Project) public projects;
    uint256 public nextProjectId;

    // Events for frontend tracking
    event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer, uint256 totalUSD, uint256 totalETH);
    event MilestoneApproved(uint256 indexed projectId, uint256 milestoneIndex, uint256 amountReleasedETH);
    event ProjectRefunded(uint256 indexed projectId, uint256 refundAmountETH);
    event DisputeRaised(uint256 indexed projectId);

    modifier onlyClient(uint256 _projectId) {
        require(msg.sender == projects[_projectId].client, "Only client can approve");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can resolve disputes");
        _;
    }

    constructor(address _arbiter, address _priceFeed) {
        arbiter = _arbiter;
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /**
     * @dev Get latest ETH price from Chainlink (assuming 8 decimals for USD)
     */
    function getLatestPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price data");
        return uint256(price);
    }

    /**
     * @dev Convert USD (2 decimals) to ETH (wei)
     */
    function convertUSDToETH(uint256 _amountUSD) public view returns (uint256) {
        uint256 ethPrice = getLatestPrice(); // Price of 1 ETH in USD with 8 decimals
        // _amountUSD has 2 decimals.
        // Result should be in wei (18 decimals).
        // (USD * 1e18) / (ETHPrice * 1e8 / 1e2)
        // ethPrice is USD/ETH * 1e8
        // amountUSD is USD * 1e2
        // Result (wei) = (amountUSD * 1e18 * 1e8) / (ethPrice * 1e2)
        // Simplified: (amountUSD * 1e24) / ethPrice
        return (_amountUSD * 1e24) / ethPrice;
    }

    /**
     * @dev Initialize a new project and lock the exactly funded amount in the contract.
     * @param _milestoneAmountsUSD MIlestone amounts in USD cents (e.g. 1000 = $10.00)
     */
    function createProject(
        address _freelancer,
        string[] memory _milestoneTitles,
        uint256[] memory _milestoneAmountsUSD
    ) external payable returns (uint256) {
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_milestoneTitles.length == _milestoneAmountsUSD.length, "Mismatched milestone arrays");
        require(msg.value > 0, "Must fund escrow to create project");

        uint256 totalUSD = 0;
        for (uint256 i = 0; i < _milestoneAmountsUSD.length; i++) {
            totalUSD += _milestoneAmountsUSD[i];
        }

        uint256 expectedETH = convertUSDToETH(totalUSD);
        
        // Allow a small margin (0.5%) for price volatility during transaction
        uint256 margin = (expectedETH * 5) / 1000;
        require(msg.value >= expectedETH - margin, "Insufficient ETH sent for USD value");

        uint256 projectId = nextProjectId++;
        Project storage newProject = projects[projectId];
        newProject.client = msg.sender;
        newProject.freelancer = _freelancer;
        newProject.totalValueUSD = totalUSD;
        newProject.totalValueETH = msg.value;
        newProject.balanceETH = msg.value;
        newProject.isCompleted = false;
        newProject.isDisputed = false;
        newProject.milestoneCount = _milestoneAmountsUSD.length;

        for (uint256 i = 0; i < _milestoneAmountsUSD.length; i++) {
            // Allocate ETH proportionately based on USD milestones
            uint256 msETH = (msg.value * _milestoneAmountsUSD[i]) / totalUSD;
            newProject.milestones[i] = Milestone({
                title: _milestoneTitles[i],
                amountUSD: _milestoneAmountsUSD[i],
                amountETH: msETH,
                isApproved: false
            });
        }

        emit ProjectCreated(projectId, msg.sender, _freelancer, totalUSD, msg.value);
        return projectId;
    }

    /**
     * @dev Client approves a specific milestone, releasing its exact amount to the freelancer.
     */
    function approveMilestone(uint256 _projectId, uint256 _milestoneIndex) external onlyClient(_projectId) {
        Project storage project = projects[_projectId];
        require(!project.isCompleted, "Project already completed");
        require(!project.isDisputed, "Project is disputed, await arbitration");
        require(_milestoneIndex < project.milestoneCount, "Invalid milestone index");
        
        Milestone storage milestone = project.milestones[_milestoneIndex];
        require(!milestone.isApproved, "Milestone already approved");
        require(project.balanceETH >= milestone.amountETH, "Insufficient escrow balance");

        // Mark approved and deduct from contract tracking balance
        milestone.isApproved = true;
        project.balanceETH -= milestone.amountETH;

        // Auto-complete if balance is empty
        if (project.balanceETH < 1000) { // Small dust threshold
            project.isCompleted = true;
        }

        // Transfer funds physically to freelancer wallet
        (bool success, ) = payable(project.freelancer).call{value: milestone.amountETH}("");
        require(success, "ETH transfer failed");

        emit MilestoneApproved(_projectId, _milestoneIndex, milestone.amountETH);
    }

    /**
     * @dev Freeze the funds if something goes wrong.
     */
    function raiseDispute(uint256 _projectId) external {
        Project storage project = projects[_projectId];
        require(
            msg.sender == project.client || msg.sender == project.freelancer,
            "Only parties involved can dispute"
        );
        project.isDisputed = true;
        emit DisputeRaised(_projectId);
    }

    /**
     * @dev Platform arbiter forces a refund to the client.
     */
    function resolveDisputeRefundClient(uint256 _projectId) external onlyArbiter {
        Project storage project = projects[_projectId];
        require(project.isDisputed, "Project must be disputed to refund");
        require(project.balanceETH > 0, "No funds left to refund");

        uint256 amountToRefund = project.balanceETH;
        project.balanceETH = 0;
        project.isCompleted = true;

        (bool success, ) = payable(project.client).call{value: amountToRefund}("");
        require(success, "Refund failed");

        emit ProjectRefunded(_projectId, amountToRefund);
    }

    // Fallback for unexpected direct transfers
    receive() external payable {}
}

