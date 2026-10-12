/**
 * Shared Firebase init + auth / firestore helpers
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  limit
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, cloudinaryConfig, SUBSCRIPTION_PLANS } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { SUBSCRIPTION_PLANS, cloudinaryConfig };

const googleProvider = new GoogleAuthProvider();

/* ---------- Auth ---------- */
export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function loginEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred;
}

export async function loginGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logout() {
  return signOut(auth);
}

/* ---------- User profile (role: client | supplier | admin) ---------- */
export async function ensureUserProfile(user, extras = {}) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile = {
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || extras.name || (user.email || "").split("@")[0],
      role: extras.role || "client",
      phone: extras.phone || "",
      country: extras.country || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...extras
    };
    await setDoc(ref, profile);
    return profile;
  }
  return { id: snap.id, ...snap.data() };
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() });
}

/* ---------- Suppliers ---------- */
export async function saveSupplierProfile(uid, data) {
  const ref = doc(db, "suppliers", uid);
  const existing = await getDoc(ref);
  const payload = {
    ...data,
    uid,
    updatedAt: serverTimestamp()
  };
  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
    payload.subscription = data.subscription || {
      status: "unpaid",
      plan: null,
      price: null,
      currency: "USD",
      expires: null,
      billing: "annual"
    };
    await setDoc(ref, payload);
  } else {
    await updateDoc(ref, payload);
  }
  // mirror role
  await setDoc(doc(db, "users", uid), { role: "supplier", updatedAt: serverTimestamp() }, { merge: true });
}

export async function getSupplier(uid) {
  const snap = await getDoc(doc(db, "suppliers", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function isSubscriptionActive(supplier) {
  if (!supplier || !supplier.subscription) return false;
  const sub = supplier.subscription;
  if (sub.status !== "active") return false;
  if (!sub.expires) return false;
  const exp = sub.expires.toDate ? sub.expires.toDate() : new Date(sub.expires);
  return exp > new Date();
}

export async function requestSubscription(uid, planId) {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) throw new Error("Unknown plan");
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  await updateDoc(doc(db, "suppliers", uid), {
    subscription: {
      status: "pending_payment",
      plan: plan.id,
      price: plan.price,
      currency: "USD",
      billing: "annual",
      requestedAt: serverTimestamp(),
      expires: null
    },
    updatedAt: serverTimestamp()
  });
  await addDoc(collection(db, "subscription_requests"), {
    supplierId: uid,
    plan: plan.id,
    price: plan.price,
    currency: "USD",
    status: "pending",
    createdAt: serverTimestamp()
  });
  return plan;
}

/** Admin activates after payment received */
export async function activateSubscription(uid, planId, price) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  await updateDoc(doc(db, "suppliers", uid), {
    subscription: {
      status: "active",
      plan: planId,
      price: price,
      currency: "USD",
      billing: "annual",
      paidAt: serverTimestamp(),
      expires: expires.toISOString()
    },
    updatedAt: serverTimestamp()
  });
}

export async function listSuppliers() {
  const snap = await getDocs(collection(db, "suppliers"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ---------- Itineraries ---------- */
export async function createItinerary(data) {
  const ref = await addDoc(collection(db, "itineraries"), {
    ...data,
    status: data.status || "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    rating: data.rating || 0,
    reviewsCount: data.reviewsCount || 0
  });
  return ref.id;
}

export async function updateItinerary(id, data) {
  await updateDoc(doc(db, "itineraries", id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function getItinerary(id) {
  const snap = await getDoc(doc(db, "itineraries", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listItineraries(filters = {}) {
  // Simple fetch; filter client-side for flexibility without composite indexes
  const snap = await getDocs(collection(db, "itineraries"));
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (filters.status) list = list.filter((i) => i.status === filters.status);
  if (filters.range) list = list.filter((i) => i.range === filters.range);
  if (filters.supplierId) list = list.filter((i) => i.supplierId === filters.supplierId);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (i) =>
        (i.title || "").toLowerCase().includes(q) ||
        (i.summary || "").toLowerCase().includes(q) ||
        (i.parks || []).join(" ").toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || 0;
    return tb - ta;
  });
  return list;
}

export async function setItineraryStatus(id, status) {
  await updateDoc(doc(db, "itineraries", id), { status, updatedAt: serverTimestamp() });
}

/* ---------- Reviews ---------- */
export async function addReview(itineraryId, review) {
  await addDoc(collection(db, "reviews"), {
    itineraryId,
    ...review,
    createdAt: serverTimestamp()
  });
  // update aggregate (simple re-fetch)
  const snap = await getDocs(query(collection(db, "reviews"), where("itineraryId", "==", itineraryId)));
  const scores = snap.docs.map((d) => d.data().score || 0);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  await updateDoc(doc(db, "itineraries", itineraryId), {
    rating: Math.round(avg * 10) / 10,
    reviewsCount: scores.length,
    updatedAt: serverTimestamp()
  });
}

export async function listReviews(itineraryId) {
  const snap = await getDocs(query(collection(db, "reviews"), where("itineraryId", "==", itineraryId)));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return list;
}

/* ---------- Cloudinary unsigned upload ---------- */
export async function uploadToCloudinary(file, folder) {
  const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", cloudinaryConfig.uploadPreset);
  if (folder) form.append("folder", folder);
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Cloudinary upload failed: " + err);
  }
  const data = await res.json();
  return data.secure_url;
}

export async function uploadMany(files, folder) {
  const urls = [];
  for (const f of files) {
    urls.push(await uploadToCloudinary(f, folder));
  }
  return urls;
}
