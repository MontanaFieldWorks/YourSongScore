import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, getDocFromServer, deleteDoc } from "firebase/firestore";
import { StoredTrack, UserProfile } from "./types";
import { safeLocalStorage } from "./lib/safeStorage";
import firebaseConfig from "../firebase-applet-config.json";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Check if credentials are placeholders
const isPlaceholder = 
  !firebaseConfig || 
  firebaseConfig.apiKey === "placeholder-api-key" || 
  firebaseConfig.projectId === "placeholder-project" ||
  firebaseConfig.apiKey.includes("placeholder");

let dbInstance: any = null;
let authInstance: any = null;
let isFirebaseActive = false;

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid || null,
      email: authInstance?.currentUser?.email || null,
      emailVerified: authInstance?.currentUser?.emailVerified || null,
      isAnonymous: authInstance?.currentUser?.isAnonymous || null,
      tenantId: authInstance?.currentUser?.tenantId || null,
      providerInfo: authInstance?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

if (!isPlaceholder) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    authInstance = getAuth(app);
    isFirebaseActive = true;
    console.log("Firebase has been initialized with active credentials.");

    // Validate connection to Firestore on boot
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(dbInstance, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.error("Please check your Firebase configuration: Firestore client is offline.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.warn("Failed to initialize Firebase SDK. Falling back to local database.", err);
  }
} else {
  console.log("Using High-Fidelity Local DB Fallback (Firebase credentials pending setup).");
}

export { isFirebaseActive };

// Local Database Helpers for fallback
const LOCAL_USERS_KEY = "yoursongscore_users";
const LOCAL_TRACKS_KEY = "yoursongscore_tracks";
const LOCAL_SESSION_KEY = "yoursongscore_current_user";

interface LocalUser {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  password?: string;
}

const getLocalUsers = (): LocalUser[] => {
  try {
    const data = safeLocalStorage.getItem(LOCAL_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalUsers = (users: LocalUser[]) => {
  try {
    safeLocalStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn("Failed to write users to safe storage:", err);
  }
};

const getLocalTracks = (): StoredTrack[] => {
  try {
    const data = safeLocalStorage.getItem(LOCAL_TRACKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalTracks = (tracks: StoredTrack[]) => {
  try {
    safeLocalStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(tracks));
  } catch (err) {
    console.warn("safeLocalStorage quota exceeded or failed to save tracks locally. Attempting fallback pruning...", err);
    try {
      // Step A: Strip coverArt and critique from older tracks to save massive space
      const prunedTracks = tracks.map((t, index) => {
        if (index < tracks.length - 1) {
          return {
            ...t,
            coverArt: undefined,
            critique: undefined, // remove bloated data from local history
          };
        }
        return t;
      });
      safeLocalStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(prunedTracks));
      console.log("Successfully saved pruned tracks to local storage.");
    } catch (innerErr) {
      console.warn("Pruning older tracks still exceeded storage space. Saving minimal track lists only...", innerErr);
      try {
        // Step B: Strip coverArt and critique from ALL tracks to fit
        const minimalTracks = tracks.map(t => ({
          ...t,
          coverArt: undefined,
          critique: undefined,
        }));
        safeLocalStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(minimalTracks));
      } catch (finalErr) {
        console.error("Local storage completely full. Unable to write any tracks data locally.", finalErr);
      }
    }
  }
};

// EXPORTED SERVICES

// 1. Listen to Auth State Changes
export const subscribeToAuth = (callback: (user: UserProfile | null) => void) => {
  let lastSession: string | null = safeLocalStorage.getItem(LOCAL_SESSION_KEY);
  
  const checkLocalSessionAndNotify = () => {
    const currentSession = safeLocalStorage.getItem(LOCAL_SESSION_KEY);
    if (currentSession) {
      try {
        const u = JSON.parse(currentSession);
        if (u && u.uid && u.uid.startsWith("usr_")) {
          callback(u);
          return true; // Local session is active and taking precedence
        }
      } catch {}
    }
    return false;
  };

  // Run initial check
  const hasLocalActive = checkLocalSessionAndNotify();

  // If Firebase is active, subscribe to Firebase Auth
  let unsubscribeFirebase: (() => void) | null = null;
  if (isFirebaseActive && authInstance) {
    unsubscribeFirebase = onAuthStateChanged(authInstance, async (fbUser: User | null) => {
      // Only handle Firebase auth state if there is NO active local bypass session taking precedence!
      const isLocalActiveNow = (() => {
        const currentSession = safeLocalStorage.getItem(LOCAL_SESSION_KEY);
        if (currentSession) {
          try {
            const u = JSON.parse(currentSession);
            return u && u.uid && u.uid.startsWith("usr_");
          } catch {}
        }
        return false;
      })();

      if (isLocalActiveNow) {
        return; // local takes precedence
      }

      if (fbUser) {
        let displayName = fbUser.displayName || fbUser.email?.split("@")[0] || "Artist";
        try {
          const userDoc = await getDoc(doc(dbInstance, "users", fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            displayName = data.displayName || displayName;
          }
        } catch (e) {
          console.warn("Error fetching user profile from firestore:", e);
          handleFirestoreError(e, OperationType.GET, `users/${fbUser.uid}`);
        }
        callback({
          uid: fbUser.uid,
          email: fbUser.email || "",
          displayName,
        });
      } else {
        callback(null);
      }
    });
  }

  // Set up local session interval checker as fallback/bridge for the bypass click & session updates
  const interval = setInterval(() => {
    const currentSession = safeLocalStorage.getItem(LOCAL_SESSION_KEY);
    if (currentSession !== lastSession) {
      lastSession = currentSession;
      if (currentSession) {
        try {
          const u = JSON.parse(currentSession);
          if (u && u.uid && u.uid.startsWith("usr_")) {
            callback(u);
          } else if (!isFirebaseActive) {
            callback(null);
          }
        } catch {
          if (!isFirebaseActive) callback(null);
        }
      } else {
        // Local session was cleared/logged out
        if (isFirebaseActive && authInstance && authInstance.currentUser) {
          // If Firestore is active and user is still logged in there, they are the active user now
          const fbUser = authInstance.currentUser;
          callback({
            uid: fbUser.uid,
            email: fbUser.email || "",
            displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Artist",
          });
        } else {
          callback(null);
        }
      }
    }
  }, 500);

  return () => {
    clearInterval(interval);
    if (unsubscribeFirebase) {
      unsubscribeFirebase();
    }
  };
};

// 2. Register User
export const registerUser = async (email: string, password: string, displayName: string): Promise<UserProfile> => {
  const normEmail = email.toLowerCase().trim();
  
  if (isFirebaseActive && authInstance && dbInstance) {
    try {
      const uCredential = await createUserWithEmailAndPassword(authInstance, normEmail, password);
      const fbUser = uCredential.user;
      
      const userProfile = {
        uid: fbUser.uid,
        email: normEmail,
        displayName,
        createdAt: new Date().toISOString()
      };
      
      // Save profile to Firestore
      try {
        await setDoc(doc(dbInstance, "users", fbUser.uid), userProfile);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${fbUser.uid}`);
      }
      
      return {
        uid: fbUser.uid,
        email: fbUser.email || normEmail,
        displayName
      };
    } catch (err: any) {
      throw new Error(err.message || "Registration failed");
    }
  } else {
    // Local Register
    const users = getLocalUsers();
    if (users.some(u => u.email === normEmail)) {
      throw new Error("Local email address already registered");
    }
    
    const uid = "usr_" + Math.random().toString(36).substr(2, 9);
    const newLocalUser: LocalUser = {
      uid,
      email: normEmail,
      displayName,
      password,
      createdAt: new Date().toISOString()
    };
    
    users.push(newLocalUser);
    saveLocalUsers(users);
    
    const sessionProfile: UserProfile = {
      uid,
      email: normEmail,
      displayName
    };
    
    safeLocalStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionProfile));
    return sessionProfile;
  }
};

// 3. Login User
export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const normEmail = email.toLowerCase().trim();
  
  if (isFirebaseActive && authInstance) {
    try {
      const uCredential = await signInWithEmailAndPassword(authInstance, normEmail, password);
      const fbUser = uCredential.user;
      
      let displayName = fbUser.email?.split("@")[0] || "Artist";
      try {
        const userDoc = await getDoc(doc(dbInstance, "users", fbUser.uid));
        if (userDoc.exists()) {
          displayName = userDoc.data().displayName || displayName;
        }
      } catch (e) {
        console.warn("Firestore error during login profile fetch:", e);
        handleFirestoreError(e, OperationType.GET, `users/${fbUser.uid}`);
      }
      
      return {
        uid: fbUser.uid,
        email: fbUser.email || normEmail,
        displayName
      };
    } catch (err: any) {
      throw new Error(err.message || "Invalid email or password");
    }
  } else {
    // Local Login
    const users = getLocalUsers();
    const found = users.find(u => u.email === normEmail && u.password === password);
    if (!found) {
      throw new Error("Invalid local email or password");
    }
    
    const sessionProfile: UserProfile = {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName || found.email.split("@")[0] || "Artist"
    };
    
    safeLocalStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionProfile));
    return sessionProfile;
  }
};

// 3.5. Login or Register Bypass (For Ezryn Z Test Account)
const initLocalBypass = (email: string, password: string, displayName: string): UserProfile => {
  const users = getLocalUsers();
  let found = users.find(u => u.email === email);
  if (!found) {
    found = {
      uid: "usr_ezryn_bypass",
      email,
      displayName,
      password,
      createdAt: new Date().toISOString()
    };
    users.push(found);
    saveLocalUsers(users);
  }
  const sessionProfile: UserProfile = {
    uid: found.uid,
    email: found.email,
    displayName: found.displayName || displayName
  };
  safeLocalStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionProfile));
  
  // Trigger storage re-check
  window.dispatchEvent(new Event("storage"));
  
  return sessionProfile;
};

export const loginOrRegisterBypass = async (): Promise<UserProfile> => {
  const email = "ezryn@yoursongscore.test";
  const password = "EzrynPassword123!";
  const displayName = "Ezryn Z";

  if (isFirebaseActive && authInstance && dbInstance) {
    try {
      // First try to sign in
      const uCredential = await signInWithEmailAndPassword(authInstance, email, password);
      const fbUser = uCredential.user;
      
      // Let's verify or write user profile document
      try {
        const userDoc = await getDoc(doc(dbInstance, "users", fbUser.uid));
        if (!userDoc.exists()) {
          const userProfile = {
            uid: fbUser.uid,
            email,
            displayName,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(dbInstance, "users", fbUser.uid), userProfile);
        }
      } catch (errProfile) {
        console.warn("Bypass user profile check failure:", errProfile);
      }

      return {
        uid: fbUser.uid,
        email: fbUser.email || email,
        displayName: displayName
      };
    } catch (err: any) {
      const errCode = err.code || "";
      if (errCode === "auth/operation-not-allowed") {
        console.warn("Firebase Email/Password login is not enabled in Firebase project. Falling back to robust local database mode for Ezryn Z.");
        return initLocalBypass(email, password, displayName);
      }

      // If user does not exist or login failed for credential reasons, register new account
      const errMsg = err.message || "";
      const shouldSignUp = 
        errCode === "auth/user-not-found" || 
        errCode === "auth/invalid-credential" || 
        errMsg.includes("user-not-found") || 
        errMsg.includes("invalid-credential") ||
        errMsg.includes("INVALID_LOGIN_CREDENTIALS");

      if (shouldSignUp) {
        try {
          const uCredential = await createUserWithEmailAndPassword(authInstance, email, password);
          const fbUser = uCredential.user;
          const userProfile = {
            uid: fbUser.uid,
            email,
            displayName,
            createdAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(dbInstance, "users", fbUser.uid), userProfile);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, `users/${fbUser.uid}`);
          }
          return {
            uid: fbUser.uid,
            email,
            displayName
          };
        } catch (regErr: any) {
          const regErrCode = regErr.code || "";
          if (regErrCode === "auth/operation-not-allowed") {
            console.warn("Firebase Email/Password registration is not enabled in Firebase project. Falling back to robust local database mode for Ezryn Z.");
            return initLocalBypass(email, password, displayName);
          }
          // Fallback if there is a race condition where account was created in-between
          try {
            const uCredential = await signInWithEmailAndPassword(authInstance, email, password);
            const fbUser = uCredential.user;
            return {
              uid: fbUser.uid,
              email: fbUser.email || email,
              displayName: displayName
            };
          } catch (lastErr) {
            throw new Error("Unable to initialize bypass user: " + regErr.message);
          }
        }
      } else {
        throw err;
      }
    }
  } else {
    return initLocalBypass(email, password, displayName);
  }
};

// 4. Logout User
export const logoutUser = async (): Promise<void> => {
  safeLocalStorage.removeItem(LOCAL_SESSION_KEY);
  if (isFirebaseActive && authInstance) {
    try {
      await signOut(authInstance);
    } catch (e) {
      console.warn("Logout error:", e);
    }
  }
};

// 5. Fetch User Tracks
export const fetchUserTracks = async (userId: string): Promise<StoredTrack[]> => {
  // If the user is authenticated (not a guest/local usr_ prefix), check if they have any guest/bypass tracks to migrate
  if (!userId.startsWith("usr_")) {
    const allLocal = getLocalTracks();
    let migratedAny = false;
    
    const updatedLocal = allLocal.map((t) => {
      if (t.userId.startsWith("usr_") || t.userId === "usr_ezryn_bypass") {
        migratedAny = true;
        const migratedTrack = { ...t, userId: userId };
        
        // Asynchronously upload migrated track to Firestore so and it stays locked to their permanent account
        if (isFirebaseActive && dbInstance) {
          setDoc(doc(dbInstance, "tracks", t.id), migratedTrack).catch((err) => {
            console.warn("[Coalesce] Failed to sync migrated track to Firestore:", err);
          });
        }
        return migratedTrack;
      }
      return t;
    });

    if (migratedAny) {
      saveLocalTracks(updatedLocal);
      console.log(`[Coalesce] Successfully coalesced local guest tracks into user: ${userId}`);
    }
  }

  const localTracks = getLocalTracks().filter(t => t.userId === userId);

  if (isFirebaseActive && dbInstance && !userId.startsWith("usr_")) {
    try {
      const q = query(collection(dbInstance, "tracks"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const firestoreTracks: StoredTrack[] = [];
      querySnapshot.forEach((docSnap) => {
        firestoreTracks.push(docSnap.data() as StoredTrack);
      });

      // Merge local storage tracks and Firestore tracks to be completely audit-resilient
      // Deduplicate by ID, preferring whichever version has more complete data (e.g. status === "analyzed" or contains "critique")
      const mergedMap = new Map<string, StoredTrack>();
      
      // Seed with local tracks
      localTracks.forEach((t) => {
        mergedMap.set(t.id, t);
      });

      // Overlay with Firestore tracks
      firestoreTracks.forEach((t) => {
        const existing = mergedMap.get(t.id);
        if (!existing) {
          mergedMap.set(t.id, t);
        } else {
          // If Firestore track has more complete analysis details, prefer it
          const isFirestoreMoreComplete = 
            (t.status === "analyzed" && existing.status !== "analyzed") || 
            (!!t.critique && !existing.critique);
          
          if (isFirestoreMoreComplete || t.status === existing.status) {
            mergedMap.set(t.id, t);
          }
        }
      });

      const mergedTracks = Array.from(mergedMap.values());
      return mergedTracks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn("Firestore fetchUserTracks error, falling back to local storage representation:", err);
      return localTracks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } else {
    return localTracks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};

// Helper to recursively strip any undefined or null keys from plain objects and arrays to prevent Firestore write failure errors
const deepCleanFirestoreObject = (val: any): any => {
  if (val === null || val === undefined) {
    return undefined;
  }
  if (Array.isArray(val)) {
    return val
      .map(item => deepCleanFirestoreObject(item))
      .filter(item => item !== undefined);
  }
  if (typeof val === "object") {
    // Return primitive-like objects untouched
    if (val instanceof Date) return val;
    
    const cleaned: any = {};
    Object.keys(val).forEach((key) => {
      const cleanedVal = deepCleanFirestoreObject(val[key]);
      if (cleanedVal !== undefined) {
        cleaned[key] = cleanedVal;
      }
    });
    return cleaned;
  }
  return val;
};

// 6. Save or Update User Track
export const saveUserTrack = async (track: StoredTrack): Promise<void> => {
  const cleanTrack = deepCleanFirestoreObject(track);

  // Always save to local storage first as fallback
  const allTracks = getLocalTracks().filter(t => t.id !== cleanTrack.id);
  allTracks.push(cleanTrack);
  saveLocalTracks(allTracks);

  // Save to Firestore for all authenticated users regardless of userId format
  if (isFirebaseActive && dbInstance && cleanTrack.userId && cleanTrack.userId.length > 0) {
    try {
      await setDoc(doc(dbInstance, "tracks", cleanTrack.id), cleanTrack);
    } catch (err) {
      console.warn("Firestore saveUserTrack error, local fallback active:", err);
    }
  }
};

// 7. Update Track (e.g. state transitions or user-defined Circumplex valence/energy coordinates)
export const updateTrackFields = async (trackId: string, updates: Partial<StoredTrack>): Promise<void> => {
  // Recursively clean undefined/null values out of the updates object to avoid Firestore write errors
  const cleanUpdates = deepCleanFirestoreObject(updates);

  // Always update local tracks if found
  const allTracks = getLocalTracks();
  const idx = allTracks.findIndex(t => t.id === trackId);
  let isLocalTrack = false;
  if (idx !== -1) {
    isLocalTrack = allTracks[idx].userId.startsWith("usr_");
    allTracks[idx] = { ...allTracks[idx], ...cleanUpdates };
    saveLocalTracks(allTracks);
  }

  // Also update in Firestore if active, not a local track, and user is logged in
  if (isFirebaseActive && dbInstance && !isLocalTrack && authInstance?.currentUser) {
    try {
      await updateDoc(doc(dbInstance, "tracks", trackId), cleanUpdates);
    } catch (err) {
      console.warn("Firestore updateTrackFields error:", err);
    }
  }
};

// 8. Delete a track
export const deleteUserTrack = async (trackId: string): Promise<void> => {
  // Always remove from local tracks
  const localTracks = getLocalTracks();
  const targetTrack = localTracks.find(t => t.id === trackId);
  const isLocalTrack = targetTrack ? targetTrack.userId.startsWith("usr_") : false;
  const afterDelete = localTracks.filter(t => t.id !== trackId);
  if (afterDelete.length !== localTracks.length) {
    saveLocalTracks(afterDelete);
  }

  // Also remove from Firestore if active, not a local track, and user is logged in
  if (isFirebaseActive && dbInstance && !isLocalTrack && authInstance?.currentUser) {
    try {
      await deleteDoc(doc(dbInstance, "tracks", trackId));
    } catch (err) {
      console.warn("Firestore deleteUserTrack error:", err);
    }
  }
};
