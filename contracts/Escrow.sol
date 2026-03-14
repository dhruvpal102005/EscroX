// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EscrowX
 * @dev Secure, milestone-based escrow contract for freelance marketplaces.
 * Funds are locked upon creation and only released by the client to the freelancer.
 */
contract Escrow {
    address public arbiter;

    struct Milestone {
        string title;
        uint256 amount;
        bool isApproved;
    }

    struct Project {
        address client;
        address freelancer;
        uint256 totalValue;
        uint256 balance;
        bool isCompleted;
        bool isDisputed;
        mapping(uint256 => Milestone) milestones;
        uint256 milestoneCount;
    }

    mapping(uint256 => Project) public projects;
    uint256 public nextProjectId;

    // Events for frontend tracking
    event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer, uint256 totalValue);
    event MilestoneApproved(uint256 indexed projectId, uint256 milestoneIndex, uint256 amountReleased);
    event ProjectRefunded(uint256 indexed projectId, uint256 refundAmount);
    event DisputeRaised(uint256 indexed projectId);

    modifier onlyClient(uint256 _projectId) {
        require(msg.sender == projects[_projectId].client, "Only client can approve");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can resolve disputes");
        _;
    }

    constructor(address _arbiter) {
        arbiter = _arbiter;
    }

    /**
     * @dev Initialize a new project and lock the exactly funded amount in the contract.
     */
    function createProject(
        address _freelancer,
        string[] memory _milestoneTitles,
        uint256[] memory _milestoneAmounts
    ) external payable returns (uint256) {
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_milestoneTitles.length == _milestoneAmounts.length, "Mismatched milestone arrays");
        require(msg.value > 0, "Must fund escrow to create project");

        uint256 calculatedTotal = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            calculatedTotal += _milestoneAmounts[i];
        }
        require(msg.value == calculatedTotal, "Deposit must exactly match total milestone amounts");

        uint256 projectId = nextProjectId++;
        Project storage newProject = projects[projectId];
        newProject.client = msg.sender;
        newProject.freelancer = _freelancer;
        newProject.totalValue = msg.value;
        newProject.balance = msg.value;
        newProject.isCompleted = false;
        newProject.isDisputed = false;
        newProject.milestoneCount = _milestoneAmounts.length;

        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            newProject.milestones[i] = Milestone({
                title: _milestoneTitles[i],
                amount: _milestoneAmounts[i],
                isApproved: false
            });
        }

        emit ProjectCreated(projectId, msg.sender, _freelancer, msg.value);
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
        require(project.balance >= milestone.amount, "Insufficient escrow balance");

        // Mark approved and deduct from contract tracking balance
        milestone.isApproved = true;
        project.balance -= milestone.amount;

        // Auto-complete if balance is empty
        if (project.balance == 0) {
            project.isCompleted = true;
        }

        // Transfer funds physically to freelancer wallet
        (bool success, ) = payable(project.freelancer).call{value: milestone.amount}("");
        require(success, "ETH transfer failed");

        emit MilestoneApproved(_projectId, _milestoneIndex, milestone.amount);
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
        require(project.balance > 0, "No funds left to refund");

        uint256 amountToRefund = project.balance;
        project.balance = 0;
        project.isCompleted = true;

        (bool success, ) = payable(project.client).call{value: amountToRefund}("");
        require(success, "Refund failed");

        emit ProjectRefunded(_projectId, amountToRefund);
    }

    // Fallback for unexpected direct transfers
    receive() external payable {}
}
