'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function BookPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    checkIn: '',
    checkOut: '',
    guests: '1',
    specialRequests: ''
  });

  // Calculate minimum dates for safeties
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minCheckIn = tomorrow.toISOString().split('T')[0];

  const minCheckOut = formData.checkIn
    ? (() => {
      const d = new Date(formData.checkIn);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })()
    : (() => {
      const d = new Date(tomorrow);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();

  useEffect(() => {
    async function fetchRooms() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('price_per_night', { ascending: false })
        .limit(3);
      if (data) {
        setRooms(data);
        if (data.length > 0) setSelectedRoom(data[0]); // Select first room by default
      }
      setLoading(false);
    }
    fetchRooms();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      alert("Please select a room to book.");
      return;
    }

    if (formData.checkIn < minCheckIn) {
      alert("Check-in date cannot be in the past or today. Please select tomorrow or later.");
      return;
    }

    if (formData.checkOut <= formData.checkIn) {
      alert("Check-out date must be at least one day after check-in.");
      return;
    }

    setIsSubmitting(true);

    // Check for room availability (max 5 rooms per category)
    const { count, error: countError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', selectedRoom.id)
      .neq('status', 'Cancelled')
      .lt('check_in', formData.checkOut)
      .gt('check_out', formData.checkIn);

    if (countError) {
      console.error(countError);
      alert("Error checking availability. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const roomQuantity = selectedRoom.quantity || 5; // Default to 5 if column isn't set yet
    if (count !== null && count >= roomQuantity) {
      alert("Sorry, this room category is fully booked for the selected dates. Please try different dates or another room.");
      setIsSubmitting(false);
      return;
    }

    const start = new Date(formData.checkIn);
    const end = new Date(formData.checkOut);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const totalPrice = days * selectedRoom.price_per_night;

    const { error } = await supabase.from('bookings').insert([
      {
        room_id: selectedRoom.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        check_in: formData.checkIn,
        check_out: formData.checkOut,
        guests: parseInt(formData.guests),
        special_requests: formData.specialRequests,
        total_price: totalPrice,
        status: 'Pending'
      }
    ]);

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert("There was an error submitting your booking. Please try again.");
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            ✓
          </div>
          <h2 className="text-3xl font-serif text-[#1c1c1c] mb-4">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-8">
            Thank you, {formData.firstName}. Your reservation for the {selectedRoom?.name} has been received. We will send a confirmation email to {formData.email} shortly.
          </p>
          <Link href="/" className="btn-primary inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 z-50">
        <Link href="/" className="text-[#1c1c1c] text-2xl font-serif tracking-widest uppercase">
          Aura Iloilo
        </Link>
        <Link href="/" className="text-gray-500 hover:text-black font-medium text-sm">
          Cancel & Return
        </Link>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">

        {/* Left Side: Room Selection */}
        <div className="flex-1">
          <h1 className="text-3xl font-serif text-[#1c1c1c] mb-2">Select Your Room</h1>
          <p className="text-gray-500 mb-8">Choose from our luxurious accommodations.</p>

          {loading ? (
            <div className="text-gray-500">Loading rooms...</div>
          ) : (
            <div className="space-y-6">
              {rooms.map((room) => {
                const isSelected = selectedRoom?.id === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-2 ${isSelected ? 'border-[var(--color-accent)] shadow-md transform -translate-y-1' : 'border-transparent shadow-sm hover:shadow-md'}`}
                  >
                    <div className="relative w-full sm:w-1/3 h-48 sm:h-auto min-h-[200px]">
                      <Image
                        src={room.image_url || "/images/suite.jpg"}
                        alt={room.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{room.category}</p>
                          <h3 className="text-xl font-serif text-[#1c1c1c]">{room.name}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-[#1c1c1c]">₱{room.price_per_night}</span>
                          <span className="block text-xs text-gray-500">per night</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mt-2">{room.description}</p>

                      <div className="mt-4 flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[var(--color-accent)]' : 'border-gray-300'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />}
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-[var(--color-accent)]' : 'text-gray-500'}`}>
                          {isSelected ? 'Selected' : 'Select Room'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Booking Form */}
        <div className="w-full lg:w-[450px]">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 sticky top-32">
            <h2 className="text-2xl font-serif text-[#1c1c1c] mb-6">Reservation Details</h2>

            {selectedRoom && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex gap-4 items-center">
                <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
                  <Image src={selectedRoom.image_url || "/images/suite.jpg"} alt={selectedRoom.name} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-serif text-[#1c1c1c]">{selectedRoom.name}</h4>
                  <p className="text-sm text-gray-500">₱{selectedRoom.price_per_night} / night</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Check-in</label>
                  <input required type="date" name="checkIn" min={minCheckIn} value={formData.checkIn} onChange={handleChange} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Check-out</label>
                  <input required type="date" name="checkOut" min={minCheckOut} value={formData.checkOut} onChange={handleChange} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Guests</label>
                <select name="guests" value={formData.guests} onChange={handleChange} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition-colors bg-white">
                  <option value="1">1 Adult</option>
                  <option value="2">2 Adults</option>
                  <option value="3">3 Adults</option>
                  <option value="4">4 Adults</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">First Name</label>
                  <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Name</label>
                  <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition-colors" />
              </div>

              <button
                type="submit"
                className="w-full bg-[#1c1c1c] hover:bg-[#333333] text-white font-medium py-4 rounded-lg transition-colors mt-6 disabled:opacity-50"
                disabled={isSubmitting || !selectedRoom}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Reservation'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </main>
  );
}
