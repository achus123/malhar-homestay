/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { 
  MapPin, 
  Home, 
  Waves, 
  PawPrint, 
  UtensilsCrossed, 
  Phone, 
  Calendar, 
  ChevronRight,
  TrendingUp,
  Instagram,
  Facebook,
  Plus,
  Trash2,
  X,
  Lock,
  Image as ImageIcon
} from "lucide-react";

// Firebase imports
import { 
  onSnapshot,
  collection, 
  addDoc, 
  deleteDoc, 
  setDoc,
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

const APP_NAME = "Malhar Homestay Ranipuram";
const CONTACT_PHONE = "+91 82813 39599";

const FALLBACKS = {
  hero: "https://images.unsplash.com/photo-1549412650-ef3bb78370fb?q=80&w=2574&auto=format&fit=crop", // Lush hills
  pool: "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2670&auto=format&fit=crop", // Luxury pool
  bedroom: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2670&auto=format&fit=crop", // Earthy room
  balcony: "https://images.unsplash.com/photo-1616036740257-9449ea1f6605?q=80&w=2574&auto=format&fit=crop" // Green balcony
};

const INITIAL_GALLERY_IMAGES = [
  { src: "/input_file_0.png", fallback: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?q=80&w=2574&auto=format&fit=crop" }
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not throwing to prevent app crash if Firebase fails
}

export default function App() {
  console.log("App starting...");
  const [galleryImages, setGalleryImages] = useState<any[]>(INITIAL_GALLERY_IMAGES);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Website Content State
  const [content, setContent] = useState<any>({
    heroTitle: "Malhar Homestay Ranipuram",
    heroSubtitle: "An eco-friendly retreat nestled in the lush greenery of Panathady, near the breathtaking Ranipuram trekking trails.",
    heroUrl: FALLBACKS.hero,
    poolUrl: FALLBACKS.pool,
    bedroomUrl: FALLBACKS.bedroom,
    balconyUrl: FALLBACKS.balcony,
    aboutTitle: "Why Choose Malhar Homestay?",
    aboutDescription: "Located close to the famous Ranipuram trekking peak in Kasaragod, Malhar offers a peaceful, eco-friendly retreat for families and groups. Our private villa is designed with a minimal, earthy aesthetic that blends perfectly with the natural surroundings.",
    experienceBadge: "Serene Escape in Nature",
    contactPhone: CONTACT_PHONE,
    locationText: "Panathady, near Ranipuram\nKasaragod, Kerala\nIndia",
    bestTimeTitle: "Best Time to Visit",
    bestTimeDescription: "The Western Ghats are magical year-round, but the period during and after the monsoon (June to October) is when the greenery is at its peak.",
    logoUrl: "/input_file_0.png"
  });

  const [editContent, setEditContent] = useState<any>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Validate connection and sync gallery
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    // Sync Gallery
    const qGallery = query(collection(db, "gallery"), orderBy("createdAt", "asc"));
    const unsubscribeGallery = onSnapshot(qGallery, (snapshot) => {
      const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (images.length > 0) {
        setGalleryImages(images);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "gallery");
    });

    // Sync Content
    const unsubscribeContent = onSnapshot(doc(db, "settings", "content"), (snapshot) => {
      if (snapshot.exists()) {
        setContent(snapshot.data());
      }
      setIsLoading(false); // Content loaded, ready to show
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/content");
      setIsLoading(false); // Still stop loading to show something even on error
    });

    return () => {
      unsubscribeGallery();
      unsubscribeContent();
    };
  }, []);

  const handleMClick = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    } else {
      setShowPinModal(true);
      setPinInput("");
    }
  };

  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pinInput === "8998") {
      setIsAdminMode(true);
      setShowPinModal(false);
      setPinInput("");
      setEditContent({...content});
    } else {
      alert("Incorrect PIN");
      setPinInput("");
    }
  };

  const saveContent = async () => {
    if (!editContent) return;
    try {
      await setDoc(doc(db, "settings", "content"), editContent);
      alert("Content updated successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/content");
      alert("Failed to save content. Check permissions.");
    }
  };

  const addImage = async () => {
    if (newImageUrl.trim()) {
      try {
        await addDoc(collection(db, "gallery"), {
          src: newImageUrl,
          fallback: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2580&auto=format&fit=crop",
          createdAt: serverTimestamp()
        });
        setNewImageUrl("");
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "gallery");
      }
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, targetField?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `${targetField || 'gallery'}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (targetField && editContent) {
        setEditContent({ ...editContent, [targetField]: downloadURL });
        alert("Image uploaded! Don't forget to 'Save All Changes' to apply it to the website.");
      } else {
        await addDoc(collection(db, "gallery"), {
          src: downloadURL,
          fallback: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2580&auto=format&fit=crop",
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please check storage permissions.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async (imgId: string) => {
    try {
      if (window.confirm("Are you sure you want to remove this image from the gallery?")) {
        await deleteDoc(doc(db, "gallery", imgId));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `gallery/${imgId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FDFCFB] flex-col gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#3B4D1C]/20 border-t-[#3B4D1C] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             {content.logoUrl ? (
               <img src={content.logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
             ) : (
               <Home className="w-5 h-5 text-[#3B4D1C]" />
             )}
          </div>
        </div>
        <div className="text-center px-6">
          <p className="text-[#3B4D1C] font-semibold tracking-[0.4em] text-xs uppercase animate-pulse">Malhar Homestay</p>
          <p className="text-[#3B4D1C]/40 text-[10px] mt-2 font-medium tracking-wide">Authenticity in every breath...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#2D2D2D] selection:bg-[#DEE7CE] selection:text-[#3B4D1C]">
      {/* Admin Toggle Hidden in 'M' */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#3B4D1C]/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {content.logoUrl && (
              <img src={content.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
            )}
            <div className="flex items-center gap-1.5">
              <span 
                className="text-xl font-bold tracking-tight text-[#3B4D1C] select-none"
              >
                <span 
                  className="cursor-pointer hover:opacity-70 transition-opacity active:scale-95 inline-block"
                  onClick={handleMClick}
                >
                  M
                </span>
                ALHAR
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-60 translate-y-0.5">Homestay</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 lg:gap-8 text-sm font-medium">
            <a href="#about" className="hover:text-[#3B4D1C] transition-colors">About</a>
            <a href="#amenities" className="hover:text-[#3B4D1C] transition-colors">Amenities</a>
            <a href="#gallery" className="hover:text-[#3B4D1C] transition-colors">Gallery</a>
            {isAdminMode && (
              <button 
                onClick={() => setIsAdminMode(false)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 font-bold transition-all"
              >
                Exit Admin
              </button>
            )}
            <a href={`https://wa.me/${(content.contactPhone || CONTACT_PHONE).replace(/\D/g, '')}?text=Hello%20Malhar%20Homestay%2C%20I%20would%20like%20to%20inquire%20about%20booking%20a%20stay.`} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-[#3B4D1C] text-white rounded-full hover:bg-[#4D6324] transition-all shadow-lg shadow-[#3B4D1C]/20">
              Book Now
            </a>
          </div>
        </div>
      </nav>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-10 h-10" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full screen view" 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Admin Panel Overlay */}
      {isAdminMode && (
        <div className="fixed right-6 top-24 bottom-6 w-full max-w-md bg-[#FDFCFB] shadow-[0_32px_64px_-12px_rgba(59,77,28,0.3)] rounded-[40px] z-[60] border border-[#3B4D1C]/10 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-[#3B4D1C]/10 flex items-center justify-between bg-[#3B4D1C] text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Lock className="w-5 h-5 text-[#DEE7CE]" />
              </div>
              <h3 className="font-bold text-xl tracking-tight">Management</h3>
            </div>
            <button onClick={() => setIsAdminMode(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-10">
            <div className="space-y-6">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#3B4D1C] opacity-60">Website Content</label>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">Hero Title</span>
                  <input 
                    type="text" 
                    value={editContent?.heroTitle || ""}
                    onChange={(e) => setEditContent({...editContent, heroTitle: e.target.value})}
                    className="w-full px-5 py-3 rounded-xl border border-[#3B4D1C]/10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">Hero Subtitle</span>
                  <textarea 
                    value={editContent?.heroSubtitle || ""}
                    onChange={(e) => setEditContent({...editContent, heroSubtitle: e.target.value})}
                    rows={3}
                    className="w-full px-5 py-3 rounded-xl border border-[#3B4D1C]/10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">About Title</span>
                  <input 
                    type="text" 
                    value={editContent?.aboutTitle || ""}
                    onChange={(e) => setEditContent({...editContent, aboutTitle: e.target.value})}
                    className="w-full px-5 py-3 rounded-xl border border-[#3B4D1C]/10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">About Description</span>
                  <textarea 
                    value={editContent?.aboutDescription || ""}
                    onChange={(e) => setEditContent({...editContent, aboutDescription: e.target.value})}
                    rows={4}
                    className="w-full px-5 py-3 rounded-xl border border-[#3B4D1C]/10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">Best Time Title</span>
                  <input 
                    type="text" 
                    value={editContent?.bestTimeTitle || ""}
                    onChange={(e) => setEditContent({...editContent, bestTimeTitle: e.target.value})}
                    className="w-full px-5 py-3 rounded-xl border border-[#3B4D1C]/10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">Best Time Description</span>
                  <textarea 
                    value={editContent?.bestTimeDescription || ""}
                    onChange={(e) => setEditContent({...editContent, bestTimeDescription: e.target.value})}
                    rows={3}
                    className="w-full px-5 py-3 rounded-xl border border-[#3B4D1C]/10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">Location Info</span>
                  <textarea 
                    value={editContent?.locationText || ""}
                    onChange={(e) => setEditContent({...editContent, locationText: e.target.value})}
                    rows={3}
                    className="w-full px-5 py-3 rounded-xl border border-[#3B4D1C]/10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">WhatsApp Number</span>
                  <input 
                    type="text" 
                    value={editContent?.contactPhone || ""}
                    onChange={(e) => setEditContent({...editContent, contactPhone: e.target.value})}
                    placeholder="+91 ..."
                    className="w-full px-5 py-3 rounded-xl border border-[#3B4D1C]/10 bg-white text-sm"
                  />
                </div>
                <div className="space-y-4 pt-4 border-t border-[#3B4D1C]/10">
                  <span className="text-[10px] font-bold text-[#3B4D1C]/60 uppercase ml-1">Main Images</span>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: "Website Logo", field: "logoUrl" },
                      { label: "Hero Banner", field: "heroUrl" },
                      { label: "Bedroom", field: "bedroomUrl" },
                      { label: "Balcony", field: "balconyUrl" }
                    ].map((item) => (
                      <div key={item.field} className="space-y-2 p-4 bg-white rounded-2xl border border-[#3B4D1C]/10 shadow-sm">
                        <span className="text-[10px] font-bold text-[#3B4D1C]/40 uppercase block">{item.label}</span>
                        <div className="flex gap-2">
                           <input 
                            type="text" 
                            value={editContent?.[item.field] || ""}
                            onChange={(e) => setEditContent({...editContent, [item.field]: e.target.value})}
                            placeholder="Image URL..."
                            className="flex-1 px-3 py-2 rounded-lg border border-[#3B4D1C]/5 bg-gray-50 text-[10px]"
                          />
                          <input 
                            type="file" 
                            id={`upload-${item.field}`}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, item.field)}
                            disabled={isUploading}
                          />
                          <label 
                            htmlFor={`upload-${item.field}`}
                            className={`px-3 py-2 bg-[#DEE7CE] text-[#3B4D1C] rounded-lg text-[10px] font-bold cursor-pointer hover:bg-[#CAD6AF] transition-colors flex items-center gap-1 ${isUploading ? 'opacity-50' : ''}`}
                          >
                            <ImageIcon className="w-3 h-3" /> Upload
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={saveContent}
                  className="w-full py-4 bg-[#3B4D1C] text-white rounded-2xl font-bold hover:bg-[#4D6324] transition-all shadow-lg active:scale-[0.98]"
                >
                  Save All Changes
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#3B4D1C] opacity-60">Gallery Management</label>
              
              {/* File Upload Option */}
              <div className="space-y-3">
                <input 
                  type="file" 
                  id="gallery-upload"
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <label 
                  htmlFor="gallery-upload"
                  className={`w-full py-8 border-2 border-dashed border-[#3B4D1C]/20 bg-[#DEE7CE]/5 rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-[#DEE7CE]/15 transition-all group ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-[#3B4D1C] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-[#3B4D1C]">Uploading to Cloud...</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-[#3B4D1C]/5 rounded-full group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-8 h-8 text-[#3B4D1C]" />
                      </div>
                      <div className="text-center">
                        <span className="block text-sm font-bold text-[#3B4D1C]">Upload Photo</span>
                        <span className="text-[10px] text-[#666] mt-1">From local gallery or camera</span>
                      </div>
                    </>
                  )}
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#3B4D1C]/10" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-[#FDFCFB] px-4 text-gray-400 font-medium">Alternatively</span>
                </div>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste image URL here..." 
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 px-5 py-4 rounded-2xl border border-[#3B4D1C]/10 focus:outline-none focus:ring-2 focus:ring-[#3B4D1C]/20 bg-white text-sm"
                />
                <button 
                  onClick={addImage}
                  className="px-6 bg-[#3B4D1C] text-white rounded-2xl hover:bg-[#4D6324] transition-all font-bold shadow-lg shadow-[#3B4D1C]/10"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#3B4D1C] opacity-60">Manage Gallery ({galleryImages.length})</label>
              <div className="grid grid-cols-2 gap-4">
                {galleryImages.map((img, i) => (
                  <div 
                    key={img.id || i} 
                    className="relative aspect-square group rounded-[24px] overflow-hidden border border-[#3B4D1C]/5 shadow-sm"
                  >
                    <img src={img.src} alt="Gallery" className="w-full h-full object-cover" />
                    {img.id && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <button 
                          onClick={() => removeImage(img.id)}
                          className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center hover:bg-red-700 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-[#3B4D1C]/5 border-t border-[#3B4D1C]/10 text-center">
            <p className="text-[10px] text-[#3B4D1C]/60 uppercase tracking-[0.3em] font-bold italic">Malhar Authorized Portal</p>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[70] bg-[#3B4D1C]/30 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#FDFCFB] rounded-[48px] p-12 max-w-sm w-full shadow-[0_64px_128px_-12px_rgba(59,77,28,0.4)] text-center border border-white">
            <div className="w-20 h-20 bg-[#DEE7CE] rounded-3xl flex items-center justify-center text-[#3B4D1C] mx-auto mb-8 rotate-3 shadow-lg">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-[#3B4D1C] mb-3 tracking-tight">Admin Gate</h3>
            <p className="text-[#666] text-sm mb-10 leading-relaxed font-medium">Verify your administrative identity by entering the protection code.</p>
            
            <form onSubmit={handlePinSubmit} className="space-y-8">
              <input 
                type="password" 
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                placeholder="••••"
                className="w-full text-center text-5xl tracking-[0.6em] py-6 rounded-3xl border-2 border-[#3B4D1C]/10 focus:border-[#3B4D1C] focus:bg-white focus:outline-none bg-[#DEE7CE]/10 font-bold transition-all shadow-inner text-[#3B4D1C]"
              />
              
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-5 font-bold text-[#666] hover:bg-gray-100 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-5 bg-[#3B4D1C] text-white font-bold rounded-2xl hover:bg-[#4D6324] shadow-xl shadow-[#3B4D1C]/20 transition-all active:scale-95"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0 cursor-zoom-in" onClick={() => setSelectedImage(content.heroUrl || FALLBACKS.hero)}>
          <img 
            src={content.heroUrl || FALLBACKS.hero} 
            alt="Lush green mountains" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white">
          <div>
            <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.4em] font-semibold mb-6 px-4 py-1.5 border border-white/30 rounded-full bg-white/10 backdrop-blur-sm">
              {content.experienceBadge}
            </span>
            <h1 className="text-5xl md:text-8xl font-bold mb-8 leading-[0.9] tracking-tight whitespace-pre-line">
              {content.heroTitle}
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90 font-light mb-10 leading-relaxed mb-12">
              {content.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`https://wa.me/${(content.contactPhone || CONTACT_PHONE).replace(/\D/g, '')}?text=Hello%20Malhar%20Homestay%2C%20I%20would%20like%20to%20inquire%20about%20booking%20a%20stay.`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-10 py-5 bg-white text-[#3B4D1C] rounded-full font-semibold hover:bg-[#DEE7CE] transition-all flex items-center justify-center gap-2">
                Begin Your Journey <ChevronRight className="w-4 h-4" />
              </a>
              <a href="#amenities" className="w-full sm:w-auto px-10 py-5 border border-white/40 hover:bg-white/10 rounded-full font-medium transition-all backdrop-blur-sm">
                Explore Amenities
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl bg-[#F0F2ED] cursor-zoom-in" onClick={() => setSelectedImage(content.bedroomUrl || FALLBACKS.bedroom)}>
                <img 
                  src={content.bedroomUrl || FALLBACKS.bedroom} 
                  alt="Minimalist bedroom" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 bg-[#DEE7CE] p-8 rounded-[32px] hidden md:block max-w-[280px] shadow-xl">
                <p className="text-[#3B4D1C] font-serif text-lg leading-relaxed italic">
                  "The homestay is perfect year-round, especially magical during and after the monsoon."
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#3B4D1C] opacity-60">The Experience</span>
              <h2 className="text-4xl md:text-5xl leading-tight font-bold">
                {content.aboutTitle}
              </h2>
              <p className="text-lg text-[#555] leading-relaxed">
                {content.aboutDescription}
              </p>
              
              <div className="grid sm:grid-cols-2 gap-8 mt-4">
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#DEE7CE] flex items-center justify-center text-[#3B4D1C]">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-lg">Prime Location</h4>
                  <p className="text-sm text-[#555]">Easy access to scenic trails and breathtaking views of the Western Ghats.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#DEE7CE] flex items-center justify-center text-[#3B4D1C]">
                    <Home className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-lg">Comfortable Stay</h4>
                  <p className="text-sm text-[#555]">2 spacious rooms, ideal for families and groups looking for privacy.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities & Travel Tips */}
      <section id="amenities" className="py-24 bg-[#E8EAE3]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
             <div className="flex gap-6 items-start">
               <div className="w-14 h-14 rounded-full bg-white shadow-sm flex-shrink-0 flex items-center justify-center text-[#3B4D1C]">
                 <PawPrint className="w-6 h-6" />
               </div>
               <div>
                 <h4 className="text-xl font-bold mb-2">Pet-Friendly Stay</h4>
                 <p className="text-[#666]">Traveling with pets? No problem—Malhar warmly welcomes your furry companions to enjoy the nature too.</p>
               </div>
             </div>
             <div className="flex gap-6 items-start">
               <div className="w-14 h-14 rounded-full bg-white shadow-sm flex-shrink-0 flex items-center justify-center text-[#3B4D1C]">
                 <UtensilsCrossed className="w-6 h-6" />
               </div>
               <div>
                 <h4 className="text-xl font-bold mb-2">Authentic Homemade Food</h4>
                 <p className="text-[#666]">Delicious, home-cooked meals are available, often praised by guests for their authentic local taste.</p>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Best Time Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-[#3B4D1C] rounded-[48px] p-12 md:p-20 text-white flex flex-col md:flex-row items-center gap-12 relative">
            <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none overflow-hidden">
               <TrendingUp className="w-full h-full scale-150 rotate-12" />
            </div>
            <div className="flex-1 z-10">
              <span className="text-xs uppercase tracking-widest font-bold opacity-60 mb-4 block">Travel Tip</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">{content.bestTimeTitle}</h2>
              <p className="text-xl opacity-80 leading-relaxed mb-8 whitespace-pre-line">
                {content.bestTimeDescription}
              </p>
              <div className="flex items-center gap-4">
                 <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-sm">Monsoon Magic</div>
                 <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-sm">Winter Serenity</div>
                 <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-sm">Summer Retreat</div>
              </div>
            </div>
            <div className="w-full md:w-[400px] aspect-square rounded-3xl overflow-hidden shadow-2xl relative rotate-3 hover:rotate-0 transition-transform duration-500 bg-white shadow-xl cursor-zoom-in" onClick={() => setSelectedImage(content.balconyUrl || FALLBACKS.balcony)}>
               <img 
                 src={content.balconyUrl || FALLBACKS.balcony} 
                 alt="Balcony View" 
                 className="w-full h-full object-cover" 
                 referrerPolicy="no-referrer"
               />
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-24 bg-[#F8F9F5]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#3B4D1C] opacity-60 mb-2 block">Our Space</span>
              <h2 className="text-4xl font-bold">A Look Inside</h2>
            </div>
            <p className="max-w-md text-[#666] md:text-right">
              Explore the minimalist aesthetic and earthy design of our private villa.
            </p>
          </div>
          
          <div className="columns-2 md:columns-4 gap-4 space-y-4">
            {galleryImages.map((img, i) => (
              <div 
                key={img.id || i}
                className="break-inside-avoid rounded-[2rem] overflow-hidden group bg-gray-100 shadow-md cursor-zoom-in"
                onClick={() => setSelectedImage(img.src)}
              >
                <img 
                  src={img.src} 
                  alt={`Home ${i}`} 
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" 
                  onError={(e) => { e.currentTarget.src = img.fallback; }}
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Booking / Contact */}
      <section id="contact" className="py-24 md:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
           <div className="bg-[#DEE7CE]/40 border border-[#3B4D1C]/10 p-12 md:p-20 rounded-[64px]">
              <div className="w-20 h-20 bg-[#3B4D1C] rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-[#3B4D1C]/20">
                <Calendar className="w-8 h-8" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Escape?</h2>
              <p className="text-lg text-[#555] mb-10 max-w-xl mx-auto">
                Secure your stay at Malhar Homestay. Whether it's a family trip or a group getaway, we ensure a peaceful retreat.
              </p>
              
              <div className="flex flex-col gap-6 items-center">
                <a 
                  href={`https://wa.me/${(content.contactPhone || CONTACT_PHONE).replace(/\D/g, '')}?text=Hello%20Malhar%20Homestay%2C%20I%20would%20like%20to%20inquire%20about%20booking%20a%20stay.`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-10 py-5 bg-[#25D366] text-white rounded-full font-bold text-lg hover:bg-[#128C7E] transition-all flex items-center gap-3 shadow-lg shadow-[#25D366]/30"
                >
                  <Phone className="w-5 h-5" /> Book via WhatsApp
                </a>
                <div className="flex items-center gap-2 text-[#666] font-medium mt-2">
                  <TrendingUp className="w-4 h-4" /> Available via WhatsApp & Phone
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-[#1A1A1A] text-white/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                {content.logoUrl && (
                  <img src={content.logoUrl} alt="Logo" className="w-12 h-12 object-contain brightness-0 invert" />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white">MALHAR</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-60 translate-y-0.5">Homestay</span>
                </div>
              </div>
              <p className="max-w-xs text-sm leading-relaxed mb-6 opacity-60">
                A serene, eco-friendly homestay experience in the heart of Ranipuram, Kerala. Embracing nature, one guest at a time.
              </p>
              <div className="flex gap-4">
                 <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                    <Instagram className="w-4 h-4" />
                 </a>
                 <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                    <Facebook className="w-4 h-4" />
                 </a>
              </div>
            </div>
            <div>
              <h5 className="text-white font-bold mb-6">Navigation</h5>
              <ul className="flex flex-col gap-4 text-sm">
                <li><a href="#about" className="hover:text-white transition-all">About Us</a></li>
                <li><a href="#amenities" className="hover:text-white transition-all">Amenities</a></li>
                <li><a href="#gallery" className="hover:text-white transition-all">Gallery</a></li>
                <li><a href="#contact" className="hover:text-white transition-all">Booking</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-bold mb-6">Location</h5>
              <p className="text-sm leading-relaxed opacity-60 whitespace-pre-line">
                {content.locationText}
              </p>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-6 text-[10px] uppercase tracking-widest font-semibold opacity-40">
             <p>© 2026 {APP_NAME}. All Rights Reserved.</p>
             <p>Designed with Nature in Mind</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
