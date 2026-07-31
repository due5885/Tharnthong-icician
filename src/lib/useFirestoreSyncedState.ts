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
 *
 * Returns `[value, setValue, ready]`. `ready` flips true once the server copy has been read
 * (or immediately when Firebase isn't configured). Anything that writes on mount — the
 * "merge in whatever's missing" effects — MUST wait for it, otherwise this device's stale
 * localStorage copy is pushed over good server data before the real value ever arrives.
 */
export function useFirestoreSyncedState<T>(
  docPath: string,
  localStorageKey: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValueState] = useState<T>(() => {
    const saved = localStorage.getItem(localStorageKey);
    if (!saved) return initialValue;
    try {
      return JSON.parse(saved) as T;
    } catch {
      return initialValue;
    }
  });

  const [ready, setReady] = useState(!isFirebaseConfigured || !db);

  // Own writes echo back through onSnapshot; skip that one callback so we don't loop.
  const skipNextSnapshotRef = useRef(false);
  const hasSeededRef = useRef(false);
  // Last payload known to match the server, so a "change" that changes nothing stays local.
  const lastSyncedJsonRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setReady(true);
      return;
    }
    const ref = doc(db, docPath);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (skipNextSnapshotRef.current) {
          skipNextSnapshotRef.current = false;
          setReady(true);
          return;
        }
        if (snapshot.exists()) {
          const data = snapshot.data();
          const json = JSON.stringify(data.value);
          lastSyncedJsonRef.current = json;
          setValueState(data.value as T);
          localStorage.setItem(localStorageKey, json);
        } else if (!hasSeededRef.current) {
          // No document on Firestore yet — seed it from whatever we have locally.
          hasSeededRef.current = true;
          skipNextSnapshotRef.current = true;
          try {
            const json = JSON.stringify(valueRef.current);
            const safeValue = sanitizeForFirestore<T>(json);
            lastSyncedJsonRef.current = json;
            setDoc(ref, { value: safeValue }).catch((err) => {
              console.error('Firestore seed failed for', docPath, err);
            });
          } catch (err) {
            console.error('Firestore seed failed for', docPath, err);
          }
        }
        setReady(true);
      },
      (err) => {
        console.error('Firestore subscription failed for', docPath, err);
        setReady(true);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPath]);

  const setValue: Dispatch<SetStateAction<T>> = (next) => {
    setValueState((prev) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
      const json = JSON.stringify(resolved);
      // Identical to the server copy — writing it back would only risk clobbering a
      // newer value from another device with no benefit.
      if (json === lastSyncedJsonRef.current) return prev;
      localStorage.setItem(localStorageKey, json);
      if (isFirebaseConfigured && db) {
        hasSeededRef.current = true;
        skipNextSnapshotRef.current = true;
        lastSyncedJsonRef.current = json;
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

  return [value, setValue, ready];
}
