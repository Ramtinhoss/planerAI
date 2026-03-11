'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Save, User as UserIcon, Award, Heart, Loader2 } from 'lucide-react';

export function Profile() {
  const { user } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    interests: '',
    preferredAirlines: '',
    hotelPreferences: '',
  });
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<{ programName: string; memberId: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.preferences) {
            setPreferences({
              interests: data.preferences.interests?.join(', ') || '',
              preferredAirlines: data.preferences.preferredAirlines?.join(', ') || '',
              hotelPreferences: data.preferences.hotelPreferences?.join(', ') || '',
            });
          }
          if (data.loyaltyPrograms) {
            setLoyaltyPrograms(data.loyaltyPrograms);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        preferences: {
          interests: preferences.interests.split(',').map(s => s.trim()).filter(Boolean),
          preferredAirlines: preferences.preferredAirlines.split(',').map(s => s.trim()).filter(Boolean),
          hotelPreferences: preferences.hotelPreferences.split(',').map(s => s.trim()).filter(Boolean),
        },
        loyaltyPrograms: loyaltyPrograms.filter(p => p.programName && p.memberId),
      });
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const addLoyaltyProgram = () => {
    setLoyaltyPrograms([...loyaltyPrograms, { programName: '', memberId: '' }]);
  };

  const updateLoyaltyProgram = (index: number, field: 'programName' | 'memberId', value: string) => {
    const newPrograms = [...loyaltyPrograms];
    newPrograms[index][field] = value;
    setLoyaltyPrograms(newPrograms);
  };

  const removeLoyaltyProgram = (index: number) => {
    setLoyaltyPrograms(loyaltyPrograms.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full" />
            ) : (
              <UserIcon className="w-8 h-8" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{user?.displayName}</h2>
            <p className="text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-rose-500" /> Travel Preferences
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interests & Activities (comma separated)</label>
                <input
                  type="text"
                  value={preferences.interests}
                  onChange={(e) => setPreferences({ ...preferences, interests: e.target.value })}
                  placeholder="e.g., Hiking, Museums, Food tours"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Airlines (comma separated)</label>
                <input
                  type="text"
                  value={preferences.preferredAirlines}
                  onChange={(e) => setPreferences({ ...preferences, preferredAirlines: e.target.value })}
                  placeholder="e.g., Delta, Emirates"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hotel Preferences (comma separated)</label>
                <input
                  type="text"
                  value={preferences.hotelPreferences}
                  onChange={(e) => setPreferences({ ...preferences, hotelPreferences: e.target.value })}
                  placeholder="e.g., Boutique, Pool, Gym"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-500" /> Loyalty Programs
            </h3>
            <div className="space-y-3">
              {loyaltyPrograms.map((program, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={program.programName}
                    onChange={(e) => updateLoyaltyProgram(index, 'programName', e.target.value)}
                    placeholder="Program Name (e.g., Marriott Bonvoy)"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={program.memberId}
                    onChange={(e) => updateLoyaltyProgram(index, 'memberId', e.target.value)}
                    placeholder="Member ID"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={() => removeLoyaltyProgram(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={addLoyaltyProgram}
                className="text-indigo-600 font-medium text-sm hover:underline"
              >
                + Add Loyalty Program
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
