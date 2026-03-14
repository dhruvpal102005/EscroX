'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, signOut, updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { useAccount } from 'wagmi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { address, isConnected } = useAccount();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    const ref = doc(db, 'users', firebaseUser.uid);
                    const snap = await getDoc(ref);
                    setProfile(snap.exists() ? snap.data() : null);
                } catch (e) {
                    console.error("Firestore user fetch error:", e);
                    setProfile(null);
                }
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Sync wallet address to Firestore independently
    useEffect(() => {
        if (!user || !profile || !isConnected || !address) return;

        if (profile.walletAddress !== address) {
            const ref = doc(db, 'users', user.uid);
            updateDoc(ref, {
                walletAddress: address,
                updatedAt: serverTimestamp()
            }).then(() => {
                setProfile(prev => ({ ...prev, walletAddress: address }));
            }).catch(e => console.error("Wallet sync error:", e));
        }
    }, [user, profile, isConnected, address]);

    /** Persist or update user doc in Firestore */
    async function upsertUserDoc(firebaseUser, extra = {}) {
        const ref = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                role: extra.role || 'client',
                country: extra.country || '',
                createdAt: serverTimestamp(),
            });
        }
        const updated = (await getDoc(ref)).data();
        setProfile(updated);
        return updated;
    }

    async function loginWithGoogle() {
        const result = await signInWithPopup(auth, googleProvider);
        await upsertUserDoc(result.user);
        return result.user;
    }

    async function loginWithEmail(email, password) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    }

    async function signupWithEmail(email, password, displayName, role, country) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await upsertUserDoc(result.user, { role, country });
        return result.user;
    }

    async function logout() {
        await signOut(auth);
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
