import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

// Firestore's setDoc() throws synchronously (not just a rejected promise) on any `undefined`
// field anywhere in the payload, e.g. an optional DeliveryRecord.statusDetails left unset.
// A JSON round-trip drops `undefined` keys/array-entries the same way JSON.stringify always
// has, so this keeps the data Firestore-safe without hand-auditing every optional field.
function sanitizeForFirestore<T>(json: string): T {
  return JSON.parse(json) as T;
}

/**
 * Drop-in replacement for the `useState` + localStorage-effect pattern used throughout
 * App.tsx, but also mirrors the value to a single Firestore document for cross-device sync.
 * Falls back to plain localStorage-only behavior (same as before) if Firebase isn't configured.
 */
export function useFirestoreSyncedState<T>(
  docPath: string,
  localStorageKey: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValueState] = useState<T>(() => {
    const saved = localStorage.getItem(localStorageKey);
    if (!saved) return initialValue;
    try {
      return JSON.parse(saved) as T;
    } catch {
      return initialValue;
    }
  });

  // Own writes echo back through onSnapshot; skip that one callback so we don't loop.
  const skipNextSnapshotRef = useRef(false);
  const hasSeededRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const ref = doc(db, docPath);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (skipNextSnapshotRef.current) {
          skipNextSnapshotRef.current = false;
          return;
        }
        if (snapshot.exists()) {
          const data = snapshot.data();
          setValueState(data.value as T);
          localStorage.setItem(localStorageKey, JSON.stringify(data.value));
        } else if (!hasSeededRef.current) {
          // No document on Firestore yet — seed it from whatever we have locally.
          hasSeededRef.current = true;
          skipNextSnapshotRef.current = true;
          try {
            const safeValue = sanitizeForFirestore<T>(JSON.stringify(value));
            setDoc(ref, { value: safeValue }).catch((err) => {
              console.error('Firestore seed failed for', docPath, err);
            });
          } catch (err) {
            console.error('Firestore seed failed for', docPath, err);
          }
        }
      },
      (err) => {
        console.error('Firestore subscription failed for', docPath, err);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPath]);

  const setValue: Dispatch<SetStateAction<T>> = (next) => {
    setValueState((prev) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
      const json = JSON.stringify(resolved);
      localStorage.setItem(localStorageKey, json);
      if (isFirebaseConfigured && db) {
        hasSeededRef.current = true;
        skipNextSnapshotRef.current = true;
        try {
          const safeValue = sanitizeForFirestore<T>(json);
          setDoc(doc(db, docPath), { value: safeValue }).catch((err) => {
            console.error('Firestore sync failed for', docPath, err);
          });
        } catch (err) {
          console.error('Firestore sync failed for', docPath, err);
        }
      }
      return resolved;
    });
  };

  return [value, setValue];
}
