'use client';

import { useState, useTransition } from 'react';

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

interface Props {
  initialRooms: PhysicalRoom[];
  categories: RoomCategory[];
  fetchError?: string | null;
  addRoomAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  updateStatusAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteRoomAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export default function RoomInventoryManager({
  initialRooms,
  categories,
  fetchError,
  addRoomAction,
  updateStatusAction,
  deleteRoomAction,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter logic
  const filteredRooms = initialRooms.filter((room) => {
    const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || room.room_category_id === categoryFilter;
    const matchesSearch =
      room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.rooms?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  // KPI calculations
  const totalCount = initialRooms.length;
  const availableCount = initialRooms.filter((r) => r.status === 'Available').length;
  const occupiedCount = initialRooms.filter((r) => r.status === 'Occupied').length;
  const cleaningCount = initialRooms.filter((r) => r.status === 'Cleaning').length;
  const maintenanceCount = initialRooms.filter((r) => r.status === 'Maintenance').length;
  const bookedOutCount = initialRooms.filter((r) => r.status === 'Booked Out').length;

  const handleAddRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await addRoomAction(formData);
      if (res.success) {
        setActionMessage({ type: 'success', text: `Room successfully added to inventory!` });
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
        setActionMessage({ type: 'success', text: `Status updated to "${newStatus}"` });
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to update status.' });
      }
    });
  };

  const handleDeleteRoom = (roomId: string, roomNumber: string) => {
    if (!confirm(`Are you sure you want to remove Room ${roomNumber}?`)) return;
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

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-serif text-gray-900 tracking-tight">Room Inventory & Statuses</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Register new physical rooms, monitor live occupancy, and update housekeeping statuses on the fly.
        </p>
      </div>

      {/* Notifications */}
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

      {/* Database Error Banner if any */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <strong>Database Notice:</strong> {fetchError}
        </div>
      )}

      {/* ON-PAGE: Add New Physical Room Form */}
      <div className="bg-white p-6 md:p-7 rounded-2xl shadow-xs border border-gray-200/90">
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold text-lg">
            +
          </div>
          <div>
            <h3 className="font-serif font-bold text-gray-900 text-lg">Add New Physical Room</h3>
            <p className="text-xs text-gray-500">Enter the room details below to add it directly to the database.</p>
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
                <span>Adding Room...</span>
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

      {/* Status Counters (KPIs) */}
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
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
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
          <p className="text-2xl font-bold text-emerald-700 mt-1">{availableCount}</p>
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
          <p className="text-2xl font-bold text-blue-700 mt-1">{occupiedCount}</p>
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
          <p className="text-2xl font-bold text-amber-700 mt-1">{cleaningCount}</p>
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
          <p className="text-2xl font-bold text-rose-700 mt-1">{maintenanceCount}</p>
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
          <p className="text-2xl font-bold text-purple-700 mt-1">{bookedOutCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by room # or suite name..."
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

          {/* Filter by Suite */}
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

          {/* Filter by Status */}
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

        {/* View Toggle (Grid / Table) */}
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

      {/* Main Room Status Display Section */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No rooms registered yet</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
            Add your first room using the form above.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Display for Room Statuses */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Room</span>
                    <h3 className="text-2xl font-bold text-gray-900 font-serif tracking-tight">{room.room_number}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                      room.status
                    )}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(room.status)}`} />
                    {room.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-4 truncate" title={room.rooms?.name || 'Suite'}>
                  {room.rooms?.name || 'Suite / Category'}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Update Status
                </label>
                <div className="flex items-center gap-2">
                  <select
                    disabled={isPending}
                    value={room.status}
                    onChange={(e) => handleUpdateStatus(room.id, e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-black font-medium text-gray-800"
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
            </div>
          ))}
        </div>
      ) : (
        /* Table Display for Room Statuses */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Room Number</th>
                  <th className="px-6 py-4">Suite / Category</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4 text-right">Change Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-base font-bold text-gray-900 font-serif">{room.room_number}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {room.rooms?.name || 'Unknown Category'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          room.status
                        )}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(room.status)}`} />
                        {room.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <select
                          disabled={isPending}
                          value={room.status}
                          onChange={(e) => handleUpdateStatus(room.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-black font-medium text-gray-800"
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
        </div>
      )}
    </div>
  );
}
