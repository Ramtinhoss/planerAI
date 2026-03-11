'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { LiveChat, UIState } from '@/components/LiveChat';
import { GenerativeUI } from '@/components/GenerativeUI';
import { Chatbot } from '@/components/Chatbot';
import { Profile } from '@/components/Profile';
import { Trips } from '@/components/Trips';
import { LogOut, Map, Compass, User as UserIcon, Plane, Wallet } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const { user, isAuthReady, signIn, signInGuest, logOut } = useFirebase();
  const [uiState, setUiState] = useState<UIState>({ type: 'idle' });
  const [activeTab, setActiveTab] = useState<'discover' | 'trips' | 'profile'>('discover');

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Compass className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">WanderAI</h1>
          <p className="text-slate-500 mb-8">Your personal AI travel agent. Plan trips, find hotels, and book flights with just your voice.</p>
          <button
            onClick={signIn}
            className="w-full bg-slate-900 text-white font-medium py-3.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <UserIcon className="w-5 h-5" />
            Sign in with Google
          </button>
          <button
            onClick={signInGuest}
            className="w-full bg-white text-slate-700 border border-slate-200 font-medium py-3.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            Continue as Guest
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 text-indigo-600">
          <Compass className="w-6 h-6" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">WanderAI</span>
        </div>
        
        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'discover' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Map className="w-4 h-4" /> Discover
          </button>
          <button
            onClick={() => setActiveTab('trips')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'trips' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Plane className="w-4 h-4" /> My Trips
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <UserIcon className="w-4 h-4" /> Profile
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
            <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full bg-slate-200" />
            <span className="font-medium">{user.displayName}</span>
          </div>
          <button
            onClick={logOut}
            className="text-slate-500 hover:text-slate-900 transition-colors p-2"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-y-auto pb-32">
        <div className="w-full h-full min-h-[60vh] flex flex-col pt-8">
          {activeTab === 'discover' && <GenerativeUI state={uiState} />}
          {activeTab === 'trips' && <Trips />}
          {activeTab === 'profile' && <Profile />}
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around z-40 pb-safe">
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'discover' ? 'text-indigo-600' : 'text-slate-500'}`}
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px] font-medium">Discover</span>
        </button>
        <button
          onClick={() => setActiveTab('trips')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'trips' ? 'text-indigo-600' : 'text-slate-500'}`}
        >
          <Plane className="w-5 h-5" />
          <span className="text-[10px] font-medium">Trips</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-500'}`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>

      {activeTab === 'discover' && <LiveChat onUIUpdate={setUiState} />}
      <Chatbot />
    </div>
  );
}
