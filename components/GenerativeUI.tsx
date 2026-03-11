'use client';

import React, { useState, useEffect } from 'react';
import { UIState } from './LiveChat';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Star, Plane, Clock, Calendar, Image as ImageIcon, Check } from 'lucide-react';
import Image from 'next/image';
import { useFirebase } from '@/components/FirebaseProvider';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { v4 as uuidv4 } from 'uuid';

export function GenerativeUI({ state }: { state: UIState }) {
  if (state.type === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <MapPin className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-light text-slate-700 mb-2">Where to next?</h2>
        <p className="max-w-md text-sm">
          Tap the microphone and tell me about your dream destination, budget, and preferences. I'll handle the rest.
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.type}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-4xl mx-auto p-6"
      >
        {state.type === 'properties' && <PropertiesView data={state.data} />}
        {state.type === 'flights' && <FlightsView data={state.data} />}
        {state.type === 'itinerary' && <ItineraryView data={state.data} />}
        {state.type === 'image' && <ImageView data={state.data} />}
        {state.type === 'video' && <VideoView data={state.data} />}
      </motion.div>
    </AnimatePresence>
  );
}

function SaveToTripButton({ item, type, cost }: { item: any, type: string, cost: number }) {
  const { user } = useFirebase();
  const [trips, setTrips] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');

  useEffect(() => {
    if (!user || !showDropdown) return;
    const fetchTrips = async () => {
      const q = query(collection(db, 'trips'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      setTrips(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchTrips();
  }, [user, showDropdown]);

  const handleSave = async (tripId: string, tripData: any) => {
    setSaving(true);
    try {
      const booking = {
        id: uuidv4(),
        type,
        details: { ...item, confirmationNumber },
        cost
      };
      await updateDoc(doc(db, 'trips', tripId), {
        bookings: [...(tripData.bookings || []), booking]
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving booking:', error);
    } finally {
      setSaving(false);
      setShowDropdown(false);
      setConfirmationNumber('');
    }
  };

  if (saved) {
    return (
      <button className="bg-emerald-100 text-emerald-700 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1">
        <Check className="w-4 h-4" /> Saved
      </button>
    );
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        {saving ? 'Saving...' : 'Book / Save'}
      </button>
      {showDropdown && (
        <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-20">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">Save to Trip</div>
          <div className="p-3 border-b border-slate-100">
            <input 
              type="text" 
              placeholder="Confirmation # (optional)" 
              value={confirmationNumber} 
              onChange={e => setConfirmationNumber(e.target.value)} 
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {trips.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">No trips found. Create one first!</div>
            ) : (
              trips.map(trip => (
                <button
                  key={trip.id}
                  onClick={() => handleSave(trip.id, trip)}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-50 last:border-0"
                >
                  {trip.destination}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VideoView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Visualizing your trip</h2>
      <p className="text-slate-500">{data.prompt}</p>
      
      <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
        {data.loading ? (
          <div className="flex flex-col items-center text-slate-400">
            <ImageIcon className="w-12 h-12 mb-4 animate-pulse" />
            <p className="text-sm font-medium">Generating video with Veo 3...</p>
            <p className="text-xs mt-2 text-slate-400 max-w-sm text-center">This may take a few minutes. I'll let you know when it's ready.</p>
          </div>
        ) : data.videoUrl ? (
          <video
            src={data.videoUrl}
            controls
            autoPlay
            loop
            className="w-full h-full object-cover"
          />
        ) : (
          <p className="text-slate-400">Failed to generate video.</p>
        )}
      </div>
    </div>
  );
}

function PropertiesView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Stays in {data.location}</h2>
        <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          {data.properties?.length || 0} options
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.properties?.map((prop: any, i: number) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="relative h-48 w-full bg-slate-200">
              <Image
                src={`https://picsum.photos/seed/${encodeURIComponent(prop.imageUrl || prop.name)}/600/400`}
                alt={prop.name}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-slate-900 leading-tight">{prop.name}</h3>
                <div className="flex items-center text-amber-500 text-sm font-medium">
                  <Star className="w-4 h-4 fill-current mr-1" />
                  {prop.rating}
                </div>
              </div>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">{prop.description}</p>
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <span className="text-xl font-bold text-slate-900">${prop.pricePerNight}</span>
                  <span className="text-slate-500 text-sm"> / night</span>
                </div>
                <SaveToTripButton item={prop} type="hotel" cost={prop.pricePerNight} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlightsView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <h2 className="text-2xl font-semibold text-slate-900">{data.origin}</h2>
        <Plane className="w-6 h-6 text-slate-400" />
        <h2 className="text-2xl font-semibold text-slate-900">{data.destination}</h2>
      </div>
      <div className="space-y-4">
        {data.flights?.map((flight: any, i: number) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                <Plane className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{flight.airline}</p>
                <p className="text-sm text-slate-500">{flight.duration} • Direct</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full md:w-auto gap-8">
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-900">{flight.departureTime}</p>
                <p className="text-xs text-slate-500">{data.origin}</p>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-slate-200 relative min-w-[100px]">
                <Plane className="w-4 h-4 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-900">{flight.arrivalTime}</p>
                <p className="text-xs text-slate-500">{data.destination}</p>
              </div>
            </div>

            <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
              <div className="text-2xl font-bold text-slate-900">${flight.price}</div>
              <SaveToTripButton item={{...flight, origin: data.origin, destination: data.destination}} type="flight" cost={flight.price} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItineraryView({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Itinerary for {data.destination}</h2>
        <button className="text-indigo-600 text-sm font-medium hover:underline">Save Trip</button>
      </div>
      
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {data.days?.map((day: any, i: number) => (
          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <span className="font-semibold text-sm">{day.dayNumber}</span>
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-lg text-slate-900 mb-4">Day {day.dayNumber}</h3>
              <div className="space-y-4">
                {day.activities?.map((activity: any, j: number) => (
                  <div key={j} className="flex gap-4">
                    <div className="w-16 shrink-0 text-sm font-medium text-indigo-600">
                      {activity.time}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{activity.location}</p>
                      <p className="text-slate-500 text-sm mt-0.5">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Visualizing your trip</h2>
      <p className="text-slate-500">{data.prompt}</p>
      
      <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
        {data.loading ? (
          <div className="flex flex-col items-center text-slate-400">
            <ImageIcon className="w-12 h-12 mb-4 animate-pulse" />
            <p className="text-sm font-medium">Generating image with Nano Banana 2...</p>
          </div>
        ) : data.imageUrl ? (
          <Image
            src={data.imageUrl}
            alt={data.prompt}
            fill
            className="object-cover"
          />
        ) : (
          <p className="text-slate-400">Failed to generate image.</p>
        )}
      </div>
    </div>
  );
}
