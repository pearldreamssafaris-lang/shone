/**
 * Voyage Uganda — Firebase + Cloudinary (live)
 * Restrict Firestore/Storage with security rules in Firebase Console.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyC8DBBtpGJZbZ4Pc-Sv1pd6agiMCFA8_nM",
  authDomain: "chichi-811d8.firebaseapp.com",
  projectId: "chichi-811d8",
  storageBucket: "chichi-811d8.firebasestorage.app",
  messagingSenderId: "728136637083",
  appId: "1:728136637083:web:0ed308ae030a703a3d043e",
  measurementId: "G-Q3GQ4MWHLK"
};

export const cloudinaryConfig = {
  cloudName: "ziudh5iv",
  uploadPreset: "chichi_gallery",
  itineraryFolder: "chichi/itineraries",
  galleryFolder: "chichi/gallery",
  supplierFolder: "chichi/suppliers"
};

/** Annual supplier plans (USD / year) */
export const SUBSCRIPTION_PLANS = {
  starter: { id: "starter", name: "Starter", price: 199, maxItineraries: 5 },
  professional: { id: "professional", name: "Professional", price: 399, maxItineraries: null },
  partner: { id: "partner", name: "Partner", price: 699, maxItineraries: null }
};
