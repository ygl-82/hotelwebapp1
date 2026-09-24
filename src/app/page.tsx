'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Home() {
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    async function fetchRooms() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('price_per_night', { ascending: false })
        .limit(3);
      if (data) setRooms(data);
    }
    fetchRooms();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      {/* Header / Nav */}
      <header className="absolute top-0 w-full z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white text-2xl font-serif tracking-widest uppercase">
          Aura Iloilo
        </div>
        <nav className="hidden md:flex gap-8 text-white font-medium text-sm items-center">
          <Link href="/admin" className="text-[var(--color-accent)] hover:text-white border border-[var(--color-accent)] px-3 py-1 rounded text-xs transition-colors">
            Admin (Test)
          </Link>
          <a href="#" className="hover:text-gray-300">Offers</a>
          <a href="#" className="hover:text-gray-300">Experiences</a>
          <a href="#" className="hover:text-gray-300">Sign In</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative h-[70vh] flex flex-col justify-end pb-24 px-6">
        <Image 
          src="/images/hero.jpg" 
          alt="Aura Hotel Lobby in Iloilo" 
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="absolute inset-0 bg-black/30 z-10" />
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          <h1 className="text-4xl md:text-6xl text-white font-serif mb-4 drop-shadow-md">
            Welcome to the City of Love.
          </h1>
          <p className="text-lg md:text-xl text-white drop-shadow-md max-w-xl">
            Experience world-class Ilonggo hospitality right in the heart of Iloilo Business Park.
          </p>
        </div>
      </section>

      {/* Call to Action Bar (Overlaying the hero slightly) */}
      <section className="relative z-30 max-w-4xl mx-auto px-6 -mt-12">
        <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-serif text-[#1c1c1c] mb-1">Ready for an unforgettable stay?</h3>
            <p className="text-gray-500">Book directly with us for the best rates and exclusive perks.</p>
          </div>
          <Link href="/book" className="btn-primary w-full md:w-auto py-4 px-12 text-lg text-center shadow-lg">
            Book Now
          </Link>
        </div>
      </section>

      {/* Featured Destinations / Suites Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif text-[#1c1c1c] mb-2">Featured Accommodations</h2>
            <p className="text-gray-600">Handpicked stays for your trip to Iloilo.</p>
          </div>
          <Link href="/book" className="hidden md:inline-block text-sm font-bold uppercase tracking-wider border-b-2 border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition-colors">
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {rooms.length > 0 ? rooms.map((room) => (
            <Link href="/book" key={room.id} className="card group cursor-pointer block">
              <div className="relative h-64 overflow-hidden">
                <Image 
                  src={room.image_url || "/images/suite.jpg"} 
                  alt={room.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{room.category}</p>
                <h3 className="text-xl font-serif text-[#1c1c1c] mb-2 group-hover:text-[var(--color-accent)] transition-colors">{room.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {room.description}
                </p>
                <div className="text-sm font-medium">
                  From <span className="text-lg font-bold text-[#1c1c1c]">₱{room.price_per_night}</span> / night
                </div>
              </div>
            </Link>
          )) : (
            <div className="col-span-3 text-center text-gray-500 py-12">
              Loading accommodations... (Make sure you've run the Supabase setup script!)
            </div>
          )}

        </div>
      </section>
      
      {/* Promotional Banner */}
      <section className="bg-[#1c1c1c] text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif mb-4">Join Aura Rewards</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Earn points on every stay, enjoy exclusive member rates, and unlock free nights. Travel more, get more.
          </p>
          <button className="btn-accent">
            Join for Free
          </button>
        </div>
      </section>
    </main>
  );
}
