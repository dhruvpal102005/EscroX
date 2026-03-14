// In-memory data store simulating the escrow backend
// In a real app this would be API calls to Express/MongoDB

export const initialContracts = [
    {
        id: "ESC-001",
        title: "AI Chatbot Integration",
        clientName: "Arjun Mehta",
        clientCountry: "🇮🇳 India",
        freelancerName: "James Carter",
        freelancerCountry: "🇺🇸 USA",
        totalValue: 1500,
        currency: "USD",
        status: "Verification",
        createdAt: "2026-03-01",
        deadline: "2026-04-01",
        milestones: [
            { id: "m1", title: "Requirements & Architecture", amount: 300, status: "Approved", evidenceUrl: "https://github.com/poc-repo", approvedAt: "2026-03-05" },
            { id: "m2", title: "Core API Development", amount: 700, status: "Submitted", evidenceUrl: "https://loom.com/share/demo1", submittedAt: "2026-03-12" },
            { id: "m3", title: "Testing & Deployment", amount: 500, status: "Pending", evidenceUrl: null },
        ],
        auditLog: [
            { id: 1, action: "Contract Created", actor: "System", timestamp: "2026-03-01 09:00", icon: "shield" },
            { id: 2, action: "Funds Deposited to Escrow", actor: "Arjun Mehta (Client)", timestamp: "2026-03-01 10:30", icon: "lock" },
            { id: 3, action: "Milestone 1 Submitted", actor: "James Carter (Freelancer)", timestamp: "2026-03-04 14:00", icon: "upload" },
            { id: 4, action: "Milestone 1 Approved — $300 Released", actor: "Arjun Mehta (Client)", timestamp: "2026-03-05 16:00", icon: "check" },
            { id: 5, action: "Milestone 2 Submitted", actor: "James Carter (Freelancer)", timestamp: "2026-03-12 11:00", icon: "upload" },
        ]
    },
    {
        id: "ESC-002",
        title: "Logo & Brand Identity",
        clientName: "Sophie Laurent",
        clientCountry: "🇫🇷 France",
        freelancerName: "Priya Shah",
        freelancerCountry: "🇮🇳 India",
        totalValue: 800,
        currency: "USD",
        status: "Inspection",
        createdAt: "2026-03-05",
        deadline: "2026-03-25",
        milestones: [
            { id: "m1", title: "Brand Concepts (3 options)", amount: 300, status: "Approved", evidenceUrl: "https://figma.com/proto/concept", approvedAt: "2026-03-10" },
            { id: "m2", title: "Final Logo Files", amount: 300, status: "Submitted", evidenceUrl: "https://drive.google.com/finals", submittedAt: "2026-03-14" },
            { id: "m3", title: "Brand Guidelines PDF", amount: 200, status: "Pending", evidenceUrl: null },
        ],
        auditLog: [
            { id: 1, action: "Contract Created", actor: "System", timestamp: "2026-03-05 10:00", icon: "shield" },
            { id: 2, action: "Funds Deposited to Escrow", actor: "Sophie Laurent (Client)", timestamp: "2026-03-05 11:00", icon: "lock" },
            { id: 3, action: "Milestone 1 Submitted", actor: "Priya Shah (Freelancer)", timestamp: "2026-03-09 09:00", icon: "upload" },
            { id: 4, action: "Milestone 1 Approved — $300 Released", actor: "Sophie Laurent (Client)", timestamp: "2026-03-10 15:00", icon: "check" },
            { id: 5, action: "Milestone 2 Submitted", actor: "Priya Shah (Freelancer)", timestamp: "2026-03-14 17:00", icon: "upload" },
        ]
    },
    {
        id: "ESC-003",
        title: "Mobile App Development",
        clientName: "David Kim",
        clientCountry: "🇰🇷 South Korea",
        freelancerName: "Carlos Rivera",
        freelancerCountry: "🇲🇽 Mexico",
        totalValue: 4200,
        currency: "USD",
        status: "Funding",
        createdAt: "2026-03-13",
        deadline: "2026-05-01",
        milestones: [
            { id: "m1", title: "UI/UX Design & Wireframes", amount: 800, status: "Pending", evidenceUrl: null },
            { id: "m2", title: "Frontend Development", amount: 1400, status: "Pending", evidenceUrl: null },
            { id: "m3", title: "Backend & API Integration", amount: 1400, status: "Pending", evidenceUrl: null },
            { id: "m4", title: "QA Testing & App Store Launch", amount: 600, status: "Pending", evidenceUrl: null },
        ],
        auditLog: [
            { id: 1, action: "Contract Created", actor: "System", timestamp: "2026-03-13 08:00", icon: "shield" },
        ]
    }
];

export const statusFlow = ["Agreement", "Funding", "Verification", "Inspection", "Disbursement", "Completed"];

export const getStatusColor = (status) => {
    const map = {
        "Agreement": "text-blue-400 bg-blue-400/10 border-blue-400/20",
        "Funding": "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
        "Verification": "text-purple-400 bg-purple-400/10 border-purple-400/20",
        "Inspection": "text-orange-400 bg-orange-400/10 border-orange-400/20",
        "Disbursement": "text-green-400 bg-green-400/10 border-green-400/20",
        "Completed": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        "Disputed": "text-red-400 bg-red-400/10 border-red-400/20",
        "Pending": "text-slate-400 bg-slate-400/10 border-slate-400/20",
        "Submitted": "text-blue-400 bg-blue-400/10 border-blue-400/20",
        "Approved": "text-green-400 bg-green-400/10 border-green-400/20",
        "Rejected": "text-red-400 bg-red-400/10 border-red-400/20",
    };
    return map[status] || "text-slate-400 bg-slate-400/10 border-slate-400/20";
};

export const getMilestoneStatusIndex = (status) => {
    return { "Pending": 0, "Submitted": 1, "Approved": 2, "Rejected": 0 }[status] || 0;
};
