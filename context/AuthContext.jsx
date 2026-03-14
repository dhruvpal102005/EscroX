'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, signOut, updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Fetch Firestore profile
                const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
                setProfile(snap.exists() ? snap.data() : null);
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

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
