'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

type RoomCategory = {
  id: string;
  name: string;
  price_per_night?: number;
};

type PhysicalRoom = {
  id: string;
  room_number: string;
  room_category_id: string;
  status: string;
  rooms?: {
    name: string;
  } | null;
};

type Booking = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  room_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: string;
  assigned_room_number?: string | null;
  created_at?: string;
  rooms?: {
    name: string;
    price_per_night?: number;
  } | null;
};

interface Props {
  initialBookings: Booking[];
  initialPhysicalRooms: PhysicalRoom[];
  categories: RoomCategory[];
  fetchError?: string | null;
  addRoomAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  updateStatusAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteRoomAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  setRoomForBookingAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  cancelBookingAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  createAdminBookingAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export default function AdminDashboardClient({
  initialBookings,
  initialPhysicalRooms,
  categories,
  fetchError,
  addRoomAction,
  updateStatusAction,
  deleteRoomAction,
  setRoomForBookingAction,
  cancelBookingAction,
  createAdminBookingAction,
}: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'rooms' | 'bookings'>('all');
  
  // Room filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Booking filters
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');
  const [bookingSearch, setBookingSearch] = useState('');

  // Editing state for setting room
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  // New Appointment Modal
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [newBookingRoomId, setNewBookingRoomId] = useState<string>(categories[0]?.id || '');
  const [newBookingNights, setNewBookingNights] = useState<number>(1);

  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter physical rooms
  const filteredRooms = initialPhysicalRooms.filter((room) => {
    const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || room.room_category_id === categoryFilter;
    const matchesSearch =
      room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.rooms?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  // Filter bookings
  const filteredBookings = initialBookings.filter((b) => {
    let matchesType = true;
    if (bookingFilter === 'UNASSIGNED') matchesType = !b.assigned_room_number && b.status !== 'Cancelled';
    else if (bookingFilter === 'ASSIGNED') matchesType = !!b.assigned_room_number;
    else if (bookingFilter === 'CONFIRMED') matchesType = b.status === 'Confirmed';
    else if (bookingFilter === 'PENDING') matchesType = b.status === 'Pending';
    else if (bookingFilter === 'CANCELLED') matchesType = b.status === 'Cancelled';

    const searchLower = bookingSearch.toLowerCase();
    const guestName = `${b.first_name} ${b.last_name}`.toLowerCase();
    const matchesSearch =
      guestName.includes(searchLower) ||
      b.email.toLowerCase().includes(searchLower) ||
      (b.assigned_room_number || '').toLowerCase().includes(searchLower) ||
      (b.rooms?.name || '').toLowerCase().includes(searchLower);

    return matchesType && matchesSearch;
  });

  // KPI calculations
  const totalRooms = initialPhysicalRooms.length;
  const availableRooms = initialPhysicalRooms.filter((r) => r.status === 'Available').length;
  const occupiedRooms = initialPhysicalRooms.filter((r) => r.status === 'Occupied').length;
  const cleaningRooms = initialPhysicalRooms.filter((r) => r.status === 'Cleaning').length;
  const maintenanceRooms = initialPhysicalRooms.filter((r) => r.status === 'Maintenance').length;
  const bookedOutRooms = initialPhysicalRooms.filter((r) => r.status === 'Booked Out').length;

  const totalBookings = initialBookings.length;
  const unassignedBookings = initialBookings.filter((b) => !b.assigned_room_number && b.status !== 'Cancelled').length;
  const pendingBookings = initialBookings.filter((b) => b.status === 'Pending').length;
  const totalRevenue = initialBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

  // Map each room number to the active guest booking
  const roomToBookingMap = new Map<string, Booking>();
  initialBookings.forEach((b) => {
    if (b.assigned_room_number && b.status !== 'Cancelled') {
      roomToBookingMap.set(b.assigned_room_number, b);
    }
  });

  // Form Handlers
  const handleAddRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await addRoomAction(formData);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Room successfully added to database!` });
        form.reset();
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to add room.' });
      }
    });
  };

  const handleUpdateStatus = (roomId: string, newStatus: string) => {
    setActionMessage(null);
    const formData = new FormData();
    formData.append('physicalRoomId', roomId);
    formData.append('status', newStatus);

    startTransition(async () => {
      const res = await updateStatusAction(formData);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Room status updated to "${newStatus}"` });
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to update status.' });
      }
    });
  };

  const handleDeleteRoom = (roomId: string, roomNumber: string) => {
    if (!confirm(`Are you sure you want to delete Room ${roomNumber}?`)) return;
    setActionMessage(null);
    const formData = new FormData();
    formData.append('physicalRoomId', roomId);

    startTransition(async () => {
      const res = await deleteRoomAction(formData);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Room ${roomNumber} deleted.` });
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to delete room.' });
      }
    });
  };

  // Set / Change Room for a Guest Appointment
  const handleSetRoom = (bookingId: string, roomNumber: string) => {
    setActionMessage(null);
    const formData = new FormData();
    formData.append('bookingId', bookingId);
    formData.append('roomNumber', roomNumber);

    startTransition(async () => {
      const res = await setRoomForBookingAction(formData);
      if (res.success) {
        setEditingBookingId(null);
        setActionMessage({
          type: 'success',
          text: roomNumber
            ? `Room ${roomNumber} assigned to guest & set to Occupied!`
            : 'Room assignment released back to Available.',
        });
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to set room for appointment.' });
      }
    });
  };

  const handleCancelBooking = (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment / booking?')) return;
    setActionMessage(null);
    const formData = new FormData();
    formData.append('bookingId', bookingId);

    startTransition(async () => {
      const res = await cancelBookingAction(formData);
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Appointment cancelled and any assigned room freed.' });
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to cancel appointment.' });
      }
    });
  };

  const handleCreateNewBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createAdminBookingAction(formData);
      if (res.success) {
        setActionMessage({ type: 'success', text: 'New guest appointment created and room assigned successfully!' });
        setIsNewBookingModalOpen(false);
        form.reset();
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to create appointment.' });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Occupied':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Cleaning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Maintenance':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Booked Out':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500';
      case 'Occupied':
        return 'bg-blue-500';
      case 'Cleaning':
        return 'bg-amber-500';
      case 'Maintenance':
        return 'bg-rose-500';
      case 'Booked Out':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Helper to get selected category price
  const selectedCategoryObj = categories.find((c) => c.id === newBookingRoomId);
  const calculatedPrice = (selectedCategoryObj?.price_per_night || 25000) * (newBookingNights || 1);

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#141414] text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-serif tracking-widest uppercase">Aura Admin</h1>
          <span className="text-[10px] text-gray-400 font-mono tracking-wider">HOTEL MANAGEMENT PORTAL</span>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-left cursor-pointer ${
              activeTab === 'all' ? 'bg-white/15 text-white font-semibold shadow-xs' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Overview (All in One)
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium text-left cursor-pointer ${
              activeTab === 'bookings' ? 'bg-white/15 text-white font-semibold shadow-xs' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Guest Appointments</span>
            </div>
            {unassignedBookings > 0 && (
              <span className="bg-[var(--color-accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unassignedBookings} need room
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium text-left cursor-pointer ${
              activeTab === 'rooms' ? 'bg-white/15 text-white font-semibold shadow-xs' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Room Inventory</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">{totalRooms}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            href="/"
            className="block text-center px-4 py-2.5 border border-white/20 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:border-white transition-all"
          >
            Back to Public Site ↗
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif text-gray-900 tracking-tight">Admin Management Dashboard</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Manage guest appointments, set & assign physical rooms, and track real-time occupancy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewBookingModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[#b03527] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ New Appointment</span>
            </button>

            <div className="flex items-center gap-1 bg-gray-200/70 p-1.5 rounded-2xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'all' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'bookings' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Appointments ({totalBookings})
              </button>
              <button
                onClick={() => setActiveTab('rooms')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'rooms' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Rooms ({totalRooms})
              </button>
            </div>
          </div>
        </div>

        {/* Global Notifications / Alerts */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between border transition-all ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{actionMessage.type === 'success' ? '✓' : '⚠️'}</span>
              <span className="font-medium">{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {fetchError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <strong>Database Notice:</strong> {fetchError}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 1: GUEST APPOINTMENTS & ROOM ASSIGNMENT           */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'bookings') && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-serif font-bold text-gray-900">Guest Appointments & Room Assignments</h3>
                <p className="text-xs text-gray-500">
                  Select and set physical rooms for appointments. Changing an assigned room automatically updates room availability.
                </p>
              </div>

              {unassignedBookings > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>{unassignedBookings} appointment(s) need a room assigned</span>
                </div>
              )}
            </div>

            {/* Quick KPI Cards for Appointments */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                onClick={() => setBookingFilter('ALL')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  bookingFilter === 'ALL' ? 'ring-2 ring-gray-900 border-transparent shadow-xs' : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalBookings}</p>
              </div>

              <div
                onClick={() => setBookingFilter('UNASSIGNED')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  bookingFilter === 'UNASSIGNED' ? 'ring-2 ring-[var(--color-accent)] border-transparent shadow-xs' : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider">Unassigned Rooms</p>
                  {unassignedBookings > 0 && <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />}
                </div>
                <p className="text-2xl font-bold text-[var(--color-accent)] mt-1">{unassignedBookings}</p>
              </div>

              <div
                onClick={() => setBookingFilter('CONFIRMED')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  bookingFilter === 'CONFIRMED' ? 'ring-2 ring-emerald-500 border-transparent shadow-xs' : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Confirmed</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{initialBookings.filter(b => b.status === 'Confirmed').length}</p>
              </div>

              <div
                onClick={() => setBookingFilter('ALL')}
                className="p-4 rounded-xl border bg-white border-gray-200/80"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₱{totalRevenue.toLocaleString()}</p>
              </div>
            </div>

            {/* Appointment Filters Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Search appointment by guest name, email, or room #..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-black transition-colors"
                />
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setBookingFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    bookingFilter === 'ALL' ? 'bg-gray-900 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setBookingFilter('UNASSIGNED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    bookingFilter === 'UNASSIGNED' ? 'bg-[var(--color-accent)] text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Needs Room ({unassignedBookings})
                </button>
                <button
                  onClick={() => setBookingFilter('ASSIGNED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    bookingFilter === 'ASSIGNED' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Room Set
                </button>
                <button
                  onClick={() => setBookingFilter('CONFIRMED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    bookingFilter === 'CONFIRMED' ? 'bg-emerald-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Confirmed
                </button>
              </div>
            </div>

            {/* APPOINTMENTS & ROOM SETTING TABLE */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Guest Information</th>
                      <th className="px-6 py-4">Suite Category</th>
                      <th className="px-6 py-4">Dates</th>
                      <th className="px-6 py-4">Set Physical Room</th>
                      <th className="px-6 py-4 text-right">Status & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                          No guest appointments found matching this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => {
                        // Find available physical rooms for this booking's category
                        const categoryRooms = initialPhysicalRooms.filter(
                          (pr) => pr.room_category_id === booking.room_id
                        );
                        const isEditingThis = editingBookingId === booking.id;

                        return (
                          <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                            {/* Guest Details */}
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">
                                {booking.first_name} {booking.last_name}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{booking.email}</div>
                              <div className="text-xs text-gray-500">{booking.phone}</div>
                            </td>

                            {/* Suite Category */}
                            <td className="px-6 py-4">
                              <span className="font-medium text-gray-900 block">{booking.rooms?.name || 'Suite'}</span>
                              <span className="text-xs text-gray-500">{booking.guests} Guest(s)</span>
                            </td>

                            {/* Dates */}
                            <td className="px-6 py-4 text-gray-700 text-xs">
                              <div className="font-medium text-gray-900">{new Date(booking.check_in).toLocaleDateString()}</div>
                              <div className="text-gray-500">to {new Date(booking.check_out).toLocaleDateString()}</div>
                            </td>

                            {/* SET ROOM COLUMN */}
                            <td className="px-6 py-4">
                              {booking.status === 'Cancelled' ? (
                                <span className="text-xs text-gray-400 italic">Booking Cancelled</span>
                              ) : booking.assigned_room_number && !isEditingThis ? (
                                /* Room already assigned */
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                    <span>Assigned: Room {booking.assigned_room_number}</span>
                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded ml-1">Occupied</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs">
                                    <button
                                      onClick={() => setEditingBookingId(booking.id)}
                                      className="text-gray-600 hover:text-black font-medium underline cursor-pointer"
                                    >
                                      Change
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                      onClick={() => handleSetRoom(booking.id, '')}
                                      className="text-rose-500 hover:text-rose-700 font-medium underline cursor-pointer"
                                    >
                                      Unassign
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Room Selection Form with explicit Confirm Button */
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const selectedRoom = formData.get('selectedRoom') as string;
                                    if (!selectedRoom) {
                                      alert('Please select a room from the dropdown first.');
                                      return;
                                    }
                                    handleSetRoom(booking.id, selectedRoom);
                                  }}
                                  className="flex flex-wrap items-center gap-2"
                                >
                                  {(() => {
                                    const matchingRooms = initialPhysicalRooms.filter(
                                      (pr) => pr.room_category_id === booking.room_id
                                    );
                                    const otherRooms = initialPhysicalRooms.filter(
                                      (pr) => pr.room_category_id !== booking.room_id
                                    );

                                    return (
                                      <select
                                        name="selectedRoom"
                                        disabled={isPending}
                                        defaultValue={booking.assigned_room_number || ''}
                                        className={`text-xs border rounded-xl px-3 py-1.5 font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black bg-white ${
                                          booking.assigned_room_number
                                            ? 'border-blue-300 text-blue-900'
                                            : 'border-amber-300 bg-amber-50/60 text-amber-950 ring-1 ring-amber-400'
                                        }`}
                                      >
                                        <option value="">
                                          {booking.assigned_room_number ? '— Keep Current Room —' : '⚡ Select Room to Assign...'}
                                        </option>

                                        {/* Matching category rooms */}
                                        {matchingRooms.length > 0 && (
                                          <optgroup label={`Matching ${booking.rooms?.name || 'Suite'} Rooms`}>
                                            {matchingRooms.map((pr) => {
                                              const isCurrent = pr.room_number === booking.assigned_room_number;
                                              const isAvailable = pr.status === 'Available';
                                              return (
                                                <option
                                                  key={pr.id}
                                                  value={pr.room_number}
                                                  disabled={!isAvailable && !isCurrent}
                                                >
                                                  Room {pr.room_number} — {pr.status} {!isAvailable && !isCurrent ? '(Unavailable)' : ''}
                                                </option>
                                              );
                                            })}
                                          </optgroup>
                                        )}

                                        {/* Other rooms in the hotel */}
                                        {otherRooms.length > 0 && (
                                          <optgroup label={matchingRooms.length > 0 ? "Other Rooms / Upgrades" : "All Registered Hotel Rooms"}>
                                            {otherRooms.map((pr) => {
                                              const isCurrent = pr.room_number === booking.assigned_room_number;
                                              const isAvailable = pr.status === 'Available';
                                              return (
                                                <option
                                                  key={pr.id}
                                                  value={pr.room_number}
                                                  disabled={!isAvailable && !isCurrent}
                                                >
                                                  Room {pr.room_number} ({pr.rooms?.name || 'Suite'}) — {pr.status} {!isAvailable && !isCurrent ? '(Unavailable)' : ''}
                                                </option>
                                              );
                                            })}
                                          </optgroup>
                                        )}

                                        {initialPhysicalRooms.length === 0 && (
                                          <option value="" disabled>
                                            No rooms in database. Register one below!
                                          </option>
                                        )}
                                      </select>
                                    );
                                  })()}

                                  <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    {isPending ? 'Saving...' : '✓ Confirm & Set'}
                                  </button>

                                  {isEditingThis && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingBookingId(null)}
                                      className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-1"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </form>
                              )}
                            </td>

                            {/* Status & Cancel Action */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    booking.status === 'Confirmed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : booking.status === 'Pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {booking.status}
                                </span>

                                <div className="text-xs font-bold text-gray-900">
                                  ₱{Number(booking.total_price).toLocaleString()}
                                </div>

                                {booking.status !== 'Cancelled' && (
                                  <button
                                    onClick={() => handleCancelBooking(booking.id)}
                                    className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 2: ROOM INVENTORY & STATUSES                     */}
        {/* ========================================================= */}
        {(activeTab === 'all' || activeTab === 'rooms') && (
          <section className="space-y-6 pt-4">
            <div>
              <h3 className="text-xl font-serif font-bold text-gray-900">Physical Rooms & Live Statuses</h3>
              <p className="text-xs text-gray-500">
                Monitor room housekeeping, occupied guest assignments, and register new physical rooms into the database.
              </p>
            </div>

            {/* INLINE ADD ROOM FORM */}
            <div className="bg-white p-6 md:p-7 rounded-2xl shadow-xs border border-gray-200/90">
              <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold text-lg">
                  +
                </div>
                <div>
                  <h4 className="font-serif font-bold text-gray-900 text-base">Add New Physical Room</h4>
                  <p className="text-xs text-gray-500">Provide room number, suite category, and initial status.</p>
                </div>
              </div>

              <form onSubmit={handleAddRoom} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* 1. Room Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    required
                    placeholder="e.g. 101, 204, PH-01"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-medium bg-gray-50/50 focus:bg-white transition-all"
                  />
                </div>

                {/* 2. Room Type / Suite */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Room Type / Suite *
                  </label>
                  <select
                    name="roomCategoryId"
                    required
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white font-medium"
                  >
                    <option value="">Select Suite Type...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Room Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Room Status *
                  </label>
                  <select
                    name="status"
                    required
                    defaultValue="Available"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-white font-medium"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Booked Out">Booked Out</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[var(--color-accent)] hover:bg-[#b03527] disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl shadow-xs transition-all h-[42px] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Room</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* STATUS SUMMARY KPIS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div
                onClick={() => setStatusFilter('ALL')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  statusFilter === 'ALL'
                    ? 'ring-2 ring-[var(--color-accent)] border-transparent shadow-xs'
                    : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalRooms}</p>
              </div>

              <div
                onClick={() => setStatusFilter('Available')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  statusFilter === 'Available'
                    ? 'ring-2 ring-emerald-500 border-transparent shadow-xs'
                    : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Available</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{availableRooms}</p>
              </div>

              <div
                onClick={() => setStatusFilter('Occupied')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  statusFilter === 'Occupied'
                    ? 'ring-2 ring-blue-500 border-transparent shadow-xs'
                    : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Occupied</p>
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-700 mt-1">{occupiedRooms}</p>
              </div>

              <div
                onClick={() => setStatusFilter('Cleaning')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  statusFilter === 'Cleaning'
                    ? 'ring-2 ring-amber-500 border-transparent shadow-xs'
                    : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Cleaning</p>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <p className="text-2xl font-bold text-amber-700 mt-1">{cleaningRooms}</p>
              </div>

              <div
                onClick={() => setStatusFilter('Maintenance')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  statusFilter === 'Maintenance'
                    ? 'ring-2 ring-rose-500 border-transparent shadow-xs'
                    : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Maintenance</p>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                </div>
                <p className="text-2xl font-bold text-rose-700 mt-1">{maintenanceRooms}</p>
              </div>

              <div
                onClick={() => setStatusFilter('Booked Out')}
                className={`p-4 rounded-xl border bg-white cursor-pointer transition-all ${
                  statusFilter === 'Booked Out'
                    ? 'ring-2 ring-purple-500 border-transparent shadow-xs'
                    : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Booked Out</p>
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                </div>
                <p className="text-2xl font-bold text-purple-700 mt-1">{bookedOutRooms}</p>
              </div>
            </div>

            {/* FILTER & VIEW CONTROLS */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex flex-1 flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search room number or suite..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-black transition-colors"
                  />
                  <svg
                    className="w-4 h-4 text-gray-400 absolute left-3 top-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:bg-white focus:border-black transition-colors"
                >
                  <option value="ALL">All Suite Types</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:bg-white focus:border-black transition-colors"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Booked Out">Booked Out</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-end md:self-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white shadow-xs text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ROOM STATUSES DISPLAY */}
            {filteredRooms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-10 text-center">
                <p className="text-gray-500 text-sm">No physical rooms found. Register one using the form above.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Room</span>
                          <h4 className="text-2xl font-bold text-gray-900 font-serif tracking-tight">{room.room_number}</h4>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                            room.status
                          )}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(room.status)}`} />
                          {room.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-600 mb-4 truncate" title={room.rooms?.name || 'Suite'}>
                        {room.rooms?.name || 'Suite Category'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                      <select
                        disabled={isPending}
                        value={room.status}
                        onChange={(e) => handleUpdateStatus(room.id, e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-black font-medium text-gray-800 cursor-pointer"
                      >
                        <option value="Available">Available</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Booked Out">Booked Out</option>
                      </select>

                      <button
                        disabled={isPending}
                        onClick={() => handleDeleteRoom(room.id, room.room_number)}
                        title="Delete Room"
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3.5">Room Number</th>
                      <th className="px-6 py-3.5">Suite Category</th>
                      <th className="px-6 py-3.5">Room Status</th>
                      <th className="px-6 py-3.5 text-right">Update Status / Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRooms.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-bold font-serif text-gray-900">{room.room_number}</td>
                        <td className="px-6 py-3.5 text-gray-700">{room.rooms?.name || 'Unknown'}</td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                              room.status
                            )}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(room.status)}`} />
                            {room.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <select
                              disabled={isPending}
                              value={room.status}
                              onChange={(e) => handleUpdateStatus(room.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-black font-medium text-gray-800 cursor-pointer"
                            >
                              <option value="Available">Available</option>
                              <option value="Occupied">Occupied</option>
                              <option value="Cleaning">Cleaning</option>
                              <option value="Maintenance">Maintenance</option>
                              <option value="Booked Out">Booked Out</option>
                            </select>
                            <button
                              disabled={isPending}
                              onClick={() => handleDeleteRoom(room.id, room.room_number)}
                              title="Delete Room"
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* MODAL: NEW GUEST APPOINTMENT (WALK-IN OR CALL-IN)         */}
        {/* ========================================================= */}
        {isNewBookingModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsNewBookingModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 border border-gray-100 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div>
                  <h3 className="text-xl font-bold font-serif text-gray-900">New Guest Appointment</h3>
                  <p className="text-xs text-gray-500">Record a booking and immediately assign a physical room</p>
                </div>
                <button
                  onClick={() => setIsNewBookingModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateNewBooking} className="space-y-4">
                <input type="hidden" name="totalPrice" value={calculatedPrice} />

                {/* Guest Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      placeholder="Jane"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      placeholder="Doe"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="guest@example.com"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+63 912 345 6789"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Suite Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Room Type / Suite Category *
                  </label>
                  <select
                    name="roomId"
                    required
                    value={newBookingRoomId}
                    onChange={(e) => setNewBookingRoomId(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none bg-white font-medium"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} (₱{cat.price_per_night?.toLocaleString() || '25,000'}/night)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Check-in Date *
                    </label>
                    <input
                      type="date"
                      name="checkIn"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Check-out Date *
                    </label>
                    <input
                      type="date"
                      name="checkOut"
                      required
                      defaultValue={(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        return d.toISOString().split('T')[0];
                      })()}
                      onChange={(e) => {
                        // Estimate nights
                        setNewBookingNights(1);
                      }}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Set Physical Room & Guests */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Assign Physical Room
                    </label>
                    <select
                      name="assignedRoomNumber"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none bg-white font-medium"
                    >
                      <option value="">— Assign Later —</option>
                      {initialPhysicalRooms
                        .filter((pr) => pr.room_category_id === newBookingRoomId && pr.status === 'Available')
                        .map((pr) => (
                          <option key={pr.id} value={pr.room_number}>
                            Room {pr.room_number} (Available)
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Number of Guests
                    </label>
                    <input
                      type="number"
                      name="guests"
                      min="1"
                      max="10"
                      defaultValue="2"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Price Preview */}
                <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Estimated Total Price:</span>
                  <span className="text-base font-bold text-gray-900 font-serif">₱{calculatedPrice.toLocaleString()}</span>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewBookingModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-[var(--color-accent)] hover:bg-[#b03527] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium shadow-xs transition-colors text-sm cursor-pointer"
                  >
                    {isPending ? 'Creating Appointment...' : 'Create & Set Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
