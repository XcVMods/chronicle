/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Auth from './components/Auth';
import CharacterCreation from './components/CharacterCreation';
import Game from './components/Game';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data());
          } else {
            setUser({ uid: firebaseUser.uid, needsCharacter: true });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-amber-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Auth onLogin={setUser} />
      </ErrorBoundary>
    );
  }

  if (user.needsCharacter || !user.character) {
    return (
      <ErrorBoundary>
        <CharacterCreation user={user} onComplete={setUser} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Game user={user} onLogout={handleLogout} />
    </ErrorBoundary>
  );
}

