'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  isAuthReady: boolean;
  signIn: () => Promise<void>;
  signInGuest: () => Promise<void>;
  logOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  isAuthReady: false,
  signIn: async () => {},
  signInGuest: async () => {},
  logOut: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);

      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Sign-in popup closed by user.');
      } else {
        console.error('Error signing in:', error);
      }
    }
  };

  const signInGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error('Error signing in anonymously:', error);
      if (error.code === 'auth/admin-restricted-operation') {
        alert('Anonymous Sign-In is not enabled. Please go to your Firebase Console -> Authentication -> Sign-in method, and enable "Anonymous".');
      } else {
        alert('Error signing in as guest: ' + error.message);
      }
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, isAuthReady, signIn, signInGuest, logOut }}>
      {children}
    </FirebaseContext.Provider>
  );
}
