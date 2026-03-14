import {
    collection, doc, addDoc, getDoc, getDocs,
    updateDoc, query, where, orderBy, serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { createHash } from 'crypto';

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Generate a SHA-256 fingerprint of the contract — acts as immutable tx hash */
function generateTxHash(data) {
    const str = JSON.stringify(data) + Date.now();
    return createHash('sha256').update(str).digest('hex').slice(0, 64);
}

// ─── USER ────────────────────────────────────────────────────────────────────

export async function saveUser(uid, data) {
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() })
        .catch(() => addDoc(collection(db, 'users'), { uid, ...data, createdAt: serverTimestamp() }));
}

export async function getUser(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── CONTRACTS ───────────────────────────────────────────────────────────────

export async function createContract(payload) {
    const {
        clientUid, clientName, clientEmail, clientCountry,
        freelancerName, freelancerEmail, freelancerCountry, freelancerWallet,
        title, totalValue, currency, deadline, milestones,
        txHash, onChain, onChainId, status
    } = payload;

    const data = {
        clientUid, clientName, clientEmail, clientCountry,
        freelancerName, freelancerEmail, freelancerCountry, freelancerWallet: freelancerWallet || '',
        title, totalValue, currency, deadline,
        status: status || 'Agreement',
        txHash: txHash || null,
        onChain: onChain || false,
        onChainId: (onChainId !== undefined && onChainId !== null) ? onChainId : null,
        createdAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, 'contracts'), data);

    // Add milestones as subcollection
    for (const ms of (milestones || [])) {
        await addDoc(collection(db, 'contracts', ref.id, 'milestones'), {
            ...ms, status: ms.status || 'Pending', evidenceUrl: null, createdAt: serverTimestamp()
        });
    }

    // Initial audit log entry
    await addDoc(collection(db, 'contracts', ref.id, 'auditLog'), {
        action: onChain
            ? `✅ Escrow Funded On-Chain (Project #${onChainId})`
            : 'Contract Initialized',
        actor: `${clientName} (Client)`,
        timestamp: serverTimestamp(),
        txHash: txHash || null,
        icon: 'lock'
    });

    return ref.id;
}

export async function getContract(contractId) {
    const snap = await getDoc(doc(db, 'contracts', contractId));
    if (!snap.exists()) return null;

    const milestones = await getMilestones(contractId);
    const auditLog = await getAuditLog(contractId);

    return { id: snap.id, ...snap.data(), milestones, auditLog };
}

export async function getUserContracts(uid) {
    const q = query(
        collection(db, 'contracts'),
        where('clientUid', '==', uid)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
}

export async function getFreelancerContracts(email) {
    const q = query(
        collection(db, 'contracts'),
        where('freelancerEmail', '==', email)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
}

export async function updateContractStatus(contractId, status) {
    await updateDoc(doc(db, 'contracts', contractId), { status });
}

// ─── MILESTONES ──────────────────────────────────────────────────────────────

export async function getMilestones(contractId) {
    const snap = await getDocs(collection(db, 'contracts', contractId, 'milestones'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.order - b.order);
}

export async function submitMilestone(contractId, milestoneId, evidenceUrl, freelancerName) {
    await updateDoc(doc(db, 'contracts', contractId, 'milestones', milestoneId), {
        status: 'Submitted',
        evidenceUrl,
        submittedAt: serverTimestamp()
    });
    await updateContractStatus(contractId, 'Inspection');
    await addAuditLog(contractId, `Milestone submitted`, `${freelancerName} (Freelancer)`, 'upload');
}

export async function approveMilestone(contractId, milestoneId, amount, title, clientName) {
    await updateDoc(doc(db, 'contracts', contractId, 'milestones', milestoneId), {
        status: 'Approved',
        approvedAt: serverTimestamp()
    });

    // Check if all milestones approved
    const milestones = await getMilestones(contractId);
    const allDone = milestones.every(m => m.id === milestoneId || m.status === 'Approved');
    await updateContractStatus(contractId, allDone ? 'Completed' : 'Verification');
    await addAuditLog(contractId, `"${title}" Approved — $${amount} Released`, `${clientName} (Client)`, 'check');
}

export async function rejectMilestone(contractId, milestoneId, title, clientName) {
    await updateDoc(doc(db, 'contracts', contractId, 'milestones', milestoneId), {
        status: 'Pending',
        evidenceUrl: null,
        submittedAt: null
    });
    await updateContractStatus(contractId, 'Verification');
    await addAuditLog(contractId, `"${title}" Rejected — Resubmission Required`, `${clientName} (Client)`, 'shield');
}

export async function fundContract(contractId, clientName) {
    await updateContractStatus(contractId, 'Verification');
    await addAuditLog(contractId, 'Funds Deposited to Escrow Vault', `${clientName} (Client)`, 'lock');
}

export async function raiseDispute(contractId, resolution, clientName) {
    const action = resolution === 'client'
        ? 'Dispute Resolved — Funds Refunded to Client'
        : 'Dispute Resolved — Payment Released to Freelancer';
    await updateContractStatus(contractId, 'Disputed');
    await addAuditLog(contractId, action, 'Platform Arbitrator', 'shield');
}

export async function acceptContract(contractId, freelancerName) {
    await updateContractStatus(contractId, 'Verification'); // Move from Agreement -> Verification
    await addAuditLog(contractId, 'Contract Offer Accepted & Activated', `${freelancerName} (Freelancer)`, 'check');
}

export async function rejectContract(contractId, freelancerName) {
    // If a contract is explicitly rejected, we can mark it as Rejected
    await updateContractStatus(contractId, 'Rejected');
    await addAuditLog(contractId, 'Contract Offer Declined', `${freelancerName} (Freelancer)`, 'shield');
}

// ─── AUDIT LOG ───────────────────────────────────────────────────────────────

export async function addAuditLog(contractId, action, actor, icon = 'shield') {
    const data = {
        action, actor, icon, timestamp: serverTimestamp()
    };
    // Simulate an on-chain verification hash
    data.txHash = createHash('sha256')
        .update(JSON.stringify(data) + Math.random())
        .digest('hex')
        .slice(0, 32);

    await addDoc(collection(db, 'contracts', contractId, 'auditLog'), data);
}

export async function getAuditLog(contractId) {
    const snap = await getDocs(
        query(collection(db, 'contracts', contractId, 'auditLog'), orderBy('timestamp', 'asc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── REAL-TIME ───────────────────────────────────────────────────────────────

/** Subscribe to live contract updates */
export function subscribeToContract(contractId, callback) {
    return onSnapshot(doc(db, 'contracts', contractId), async (snap) => {
        if (!snap.exists()) return;
        const milestones = await getMilestones(contractId);
        const auditLog = await getAuditLog(contractId);
        callback({ id: snap.id, ...snap.data(), milestones, auditLog });
    });
}
