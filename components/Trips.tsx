'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Plus, MapPin, Calendar, DollarSign, Trash2, Loader2, Plane, Hotel, Edit2, Info, Clock, AlignLeft, List } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function Trips() {
  const { user } = useFirebase();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState('date-desc');

  // New Trip Form
  const [isCreating, setIsCreating] = useState(false);
  const [newTrip, setNewTrip] = useState({ destination: '', startDate: '', endDate: '', description: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'trips'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      setTrips(tripsData);
      if (selectedTrip) {
        const updatedSelected = tripsData.find(t => t.docId === selectedTrip.docId);
        if (updatedSelected) setSelectedTrip(updatedSelected);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, selectedTrip?.docId]);

  const handleCreateTrip = async () => {
    if (!user || !newTrip.destination.trim()) return;
    try {
      const tripId = uuidv4();
      await addDoc(collection(db, 'trips'), {
        id: tripId,
        userId: user.uid,
        destination: newTrip.destination,
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
        description: newTrip.description,
        createdAt: new Date().toISOString(),
        budget: 0,
        expenses: [],
        bookings: []
      });
      setNewTrip({ destination: '', startDate: '', endDate: '', description: '' });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating trip:', error);
    }
  };

  const handleDeleteTrip = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'trips', docId));
      if (selectedTrip?.docId === docId) setSelectedTrip(null);
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (selectedTrip) {
    return <TripDetails trip={selectedTrip} onBack={() => setSelectedTrip(null)} />;
  }

  const sortedTrips = [...trips].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'dest-asc') return a.destination.localeCompare(b.destination);
    if (sortBy === 'budget-desc') return (b.budget || 0) - (a.budget || 0);
    return 0;
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">My Trips</h2>
        <div className="flex items-center gap-4">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="dest-asc">Destination (A-Z)</option>
            <option value="budget-desc">Highest Budget</option>
          </select>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Trip
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-semibold">Create New Trip</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Destination *" value={newTrip.destination} onChange={e => setNewTrip({...newTrip, destination: e.target.value})} className="px-4 py-2 border border-slate-300 rounded-lg" />
            <input type="text" placeholder="Description" value={newTrip.description} onChange={e => setNewTrip({...newTrip, description: e.target.value})} className="px-4 py-2 border border-slate-300 rounded-lg" />
            <input type="date" placeholder="Start Date" value={newTrip.startDate} onChange={e => setNewTrip({...newTrip, startDate: e.target.value})} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-500" />
            <input type="date" placeholder="End Date" value={newTrip.endDate} onChange={e => setNewTrip({...newTrip, endDate: e.target.value})} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleCreateTrip} disabled={!newTrip.destination.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Save Trip</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTrips.map(trip => (
          <div key={trip.docId} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer flex flex-col" onClick={() => setSelectedTrip(trip)}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                <MapPin className="w-6 h-6" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTrip(trip.docId); }}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{trip.destination}</h3>
            {trip.locations && trip.locations.length > 0 && (
              <p className="text-sm text-slate-600 mb-2 line-clamp-1">
                {trip.locations.map((l: any) => `${l.city}, ${l.country}`).join(' • ')}
              </p>
            )}
            {trip.startDate && trip.endDate && (
              <p className="text-xs text-slate-500 mb-3">{trip.startDate} to {trip.endDate}</p>
            )}
            {trip.description && (
              <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1">{trip.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-auto pt-4 border-t border-slate-100">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(trip.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> ${trip.budget || 0}</span>
            </div>
          </div>
        ))}
        {trips.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 text-slate-500">
            No trips planned yet. Create one to start tracking budget and bookings!
          </div>
        )}
      </div>
    </div>
  );
}

function TripDetails({ trip, onBack }: { trip: any, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary'>('overview');
  const [budget, setBudget] = useState(trip.budget || 0);
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'Food', description: '' });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Itinerary state
  const [newDayDate, setNewDayDate] = useState('');
  const [newActivity, setNewActivity] = useState({ dayId: '', time: '', location: '', notes: '' });

  // Locations state
  const [newLocation, setNewLocation] = useState({ city: '', country: '' });

  const handleUpdateBudget = async () => {
    try {
      await updateDoc(doc(db, 'trips', trip.docId), { budget: Number(budget) });
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const handleSaveExpense = async () => {
    if (!newExpense.amount || !newExpense.description) return;
    try {
      let updatedExpenses = [...(trip.expenses || [])];
      
      if (editingExpenseId) {
        updatedExpenses = updatedExpenses.map(e => 
          e.id === editingExpenseId 
            ? { ...e, amount: Number(newExpense.amount), category: newExpense.category, description: newExpense.description }
            : e
        );
      } else {
        updatedExpenses.push({
          id: uuidv4(),
          amount: Number(newExpense.amount),
          category: newExpense.category,
          description: newExpense.description,
          date: new Date().toISOString()
        });
      }

      await updateDoc(doc(db, 'trips', trip.docId), { expenses: updatedExpenses });
      setNewExpense({ amount: '', category: 'Food', description: '' });
      setEditingExpenseId(null);
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpenseId(expense.id);
    setNewExpense({ amount: expense.amount.toString(), category: expense.category, description: expense.description });
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const updatedExpenses = (trip.expenses || []).filter((e: any) => e.id !== expenseId);
      await updateDoc(doc(db, 'trips', trip.docId), { expenses: updatedExpenses });
      if (editingExpenseId === expenseId) {
        setEditingExpenseId(null);
        setNewExpense({ amount: '', category: 'Food', description: '' });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleAddDay = async () => {
    if (!newDayDate) return;
    try {
      const day = { id: uuidv4(), date: newDayDate, activities: [] };
      const updatedDays = [...(trip.itineraryDays || []), day].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      await updateDoc(doc(db, 'trips', trip.docId), { itineraryDays: updatedDays });
      setNewDayDate('');
    } catch (error) {
      console.error('Error adding day:', error);
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    try {
      const updatedDays = (trip.itineraryDays || []).filter((day: any) => day.id !== dayId);
      await updateDoc(doc(db, 'trips', trip.docId), { itineraryDays: updatedDays });
    } catch (error) {
      console.error('Error deleting day:', error);
    }
  };

  const handleAddActivity = async (dayId: string) => {
    if (!newActivity.location) return;
    try {
      const updatedDays = (trip.itineraryDays || []).map((day: any) => {
        if (day.id === dayId) {
          return {
            ...day,
            activities: [...(day.activities || []), { id: uuidv4(), time: newActivity.time, location: newActivity.location, notes: newActivity.notes }].sort((a, b) => a.time.localeCompare(b.time))
          };
        }
        return day;
      });
      await updateDoc(doc(db, 'trips', trip.docId), { itineraryDays: updatedDays });
      setNewActivity({ dayId: '', time: '', location: '', notes: '' });
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const handleDeleteActivity = async (dayId: string, activityId: string) => {
    try {
      const updatedDays = (trip.itineraryDays || []).map((day: any) => {
        if (day.id === dayId) {
          return { ...day, activities: day.activities.filter((a: any) => a.id !== activityId) };
        }
        return day;
      });
      await updateDoc(doc(db, 'trips', trip.docId), { itineraryDays: updatedDays });
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.city || !newLocation.country) return;
    try {
      const updatedLocations = [...(trip.locations || []), { id: uuidv4(), city: newLocation.city, country: newLocation.country }];
      await updateDoc(doc(db, 'trips', trip.docId), { locations: updatedLocations });
      setNewLocation({ city: '', country: '' });
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      const updatedLocations = (trip.locations || []).filter((l: any) => l.id !== locationId);
      await updateDoc(doc(db, 'trips', trip.docId), { locations: updatedLocations });
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const totalExpenses = (trip.expenses || []).reduce((sum: number, e: any) => sum + e.amount, 0);
  const totalBookings = (trip.bookings || []).reduce((sum: number, b: any) => sum + (b.cost || 0), 0);
  const totalSpent = totalExpenses + totalBookings;
  const remaining = (trip.budget || 0) - totalSpent;
  const percentSpent = trip.budget ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <button onClick={onBack} className="text-indigo-600 font-medium hover:underline mb-4 inline-block">&larr; Back to Trips</button>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">{trip.destination}</h2>
          {(trip.startDate || trip.endDate) && (
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {trip.startDate} {trip.endDate ? `to ${trip.endDate}` : ''}
            </p>
          )}
        </div>
        {trip.description && (
          <div className="bg-slate-100 px-4 py-2 rounded-lg max-w-md">
            <p className="text-sm text-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" /> {trip.description}
            </p>
          </div>
        )}
      </div>

      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('itinerary')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'itinerary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Itinerary
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            {/* Locations */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-500" /> Locations</h3>
              
              {(!trip.locations || trip.locations.length === 0) ? (
                <p className="text-slate-500 text-sm mb-4">No locations added yet.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {trip.locations.map((loc: any) => (
                    <div key={loc.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{loc.city}</p>
                        <p className="text-xs text-slate-500">{loc.country}</p>
                      </div>
                      <button onClick={() => handleDeleteLocation(loc.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <div className="space-y-2">
                  <input type="text" placeholder="City" value={newLocation.city} onChange={e => setNewLocation({...newLocation, city: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  <input type="text" placeholder="Country" value={newLocation.country} onChange={e => setNewLocation({...newLocation, country: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  <button onClick={handleAddLocation} disabled={!newLocation.city || !newLocation.country} className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                    Add Location
                  </button>
                </div>
              </div>
            </div>

            {/* Budget Tracker */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Budget Tracker</h3>
            
            <div className="flex gap-2 mb-6">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Total Budget"
              />
              <button onClick={handleUpdateBudget} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium">Set</button>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Spent: ${totalSpent}</span>
                <span className="font-medium text-slate-900">Budget: ${trip.budget || 0}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative">
                <div className={`h-full rounded-full transition-all duration-500 ${percentSpent > 90 ? 'bg-red-500' : percentSpent > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentSpent}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                  {Math.round(percentSpent)}%
                </div>
              </div>
              <div className="text-right text-xs font-medium text-slate-500">
                ${remaining} remaining
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-medium text-slate-900 mb-3">{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</h4>
              <div className="space-y-3">
                <input type="number" placeholder="Amount ($)" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                <input type="text" placeholder="Description" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option>Food</option>
                  <option>Transport</option>
                  <option>Activity</option>
                  <option>Shopping</option>
                  <option>Other</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={handleSaveExpense} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    {editingExpenseId ? 'Update' : 'Add'}
                  </button>
                  {editingExpenseId && (
                    <button onClick={() => { setEditingExpenseId(null); setNewExpense({ amount: '', category: 'Food', description: '' }); }} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details & Bookings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Bookings & Saved Items</h3>
            {(!trip.bookings || trip.bookings.length === 0) ? (
              <p className="text-slate-500 text-sm">No bookings saved yet. Use the AI assistant to find and save flights or hotels!</p>
            ) : (
              <div className="space-y-4">
                {trip.bookings.map((booking: any) => (
                  <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50 gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${booking.type === 'flight' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {booking.type === 'flight' ? <Plane className="w-5 h-5" /> : <Hotel className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{booking.details.name || booking.details.airline}</p>
                        <p className="text-xs text-slate-500">{booking.type === 'flight' ? `${booking.details.origin} to ${booking.details.destination}` : booking.details.description}</p>
                        {booking.details.confirmationNumber && (
                          <p className="text-xs font-medium text-indigo-600 mt-1">Conf #: {booking.details.confirmationNumber}</p>
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 sm:text-right">${booking.cost}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Expense Log</h3>
            {(!trip.expenses || trip.expenses.length === 0) ? (
              <p className="text-slate-500 text-sm">No expenses logged yet.</p>
            ) : (
              <div className="space-y-3">
                {trip.expenses.map((expense: any) => (
                  <div key={expense.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-900">{expense.description}</p>
                      <p className="text-xs text-slate-500">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">${expense.amount}</span>
                      <button onClick={() => handleEditExpense(expense)} className="text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteExpense(expense.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <List className="w-6 h-6 text-indigo-600" /> Day-by-Day Itinerary
              </h3>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={newDayDate} 
                  onChange={e => setNewDayDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <button 
                  onClick={handleAddDay}
                  disabled={!newDayDate}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                >
                  Add Day
                </button>
              </div>
            </div>

            {(!trip.itineraryDays || trip.itineraryDays.length === 0) ? (
              <div className="text-center py-12 text-slate-500">
                No days added to your itinerary yet. Select a date and click "Add Day" to get started.
              </div>
            ) : (
              <div className="space-y-8">
                {trip.itineraryDays.map((day: any) => (
                  <div key={day.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                      </h4>
                      <button onClick={() => handleDeleteDay(day.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {day.activities?.map((activity: any) => (
                        <div key={activity.id} className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg group transition-colors">
                          <div className="w-16 shrink-0 text-sm font-medium text-slate-600 flex items-start gap-1 pt-0.5">
                            <Clock className="w-3.5 h-3.5 mt-0.5" />
                            {activity.time || 'Any'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{activity.location}</p>
                            {activity.notes && (
                              <p className="text-sm text-slate-500 mt-1 flex items-start gap-1">
                                <AlignLeft className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                {activity.notes}
                              </p>
                            )}
                          </div>
                          <button 
                            onClick={() => handleDeleteActivity(day.id, activity.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input 
                          type="time" 
                          value={newActivity.dayId === day.id ? newActivity.time : ''}
                          onChange={e => setNewActivity({ ...newActivity, dayId: day.id, time: e.target.value })}
                          className="sm:col-span-3 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <input 
                          type="text" 
                          placeholder="Location / Activity" 
                          value={newActivity.dayId === day.id ? newActivity.location : ''}
                          onChange={e => setNewActivity({ ...newActivity, dayId: day.id, location: e.target.value })}
                          className="sm:col-span-4 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <input 
                          type="text" 
                          placeholder="Notes (optional)" 
                          value={newActivity.dayId === day.id ? newActivity.notes : ''}
                          onChange={e => setNewActivity({ ...newActivity, dayId: day.id, notes: e.target.value })}
                          className="sm:col-span-3 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <button 
                          onClick={() => handleAddActivity(day.id)}
                          disabled={newActivity.dayId !== day.id || !newActivity.location}
                          className="sm:col-span-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
