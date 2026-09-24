import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';
import AdminDashboardClient from './AdminDashboardClient';

export const revalidate = 0; // Disable caching so it always fetches fresh data

// SERVER ACTIONS
async function addPhysicalRoomAction(formData: FormData) {
  'use server';
  const roomCategoryId = formData.get('roomCategoryId') as string;
  const roomNumber = formData.get('roomNumber') as string;
  const status = (formData.get('status') as string) || 'Available';

  if (!roomCategoryId || !roomNumber) {
    return { success: false, error: 'Room category and room number are required.' };
  }

  try {
    const { error } = await supabaseAdmin.from('physical_rooms').insert([
      {
        room_category_id: roomCategoryId,
        room_number: roomNumber.trim(),
        status: status,
      },
    ]);

    if (error) {
      console.error('Error adding physical room:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: msg };
  }
}

async function updateRoomStatusAction(formData: FormData) {
  'use server';
  const physicalRoomId = formData.get('physicalRoomId') as string;
  const newStatus = formData.get('status') as string;

  if (!physicalRoomId || !newStatus) {
    return { success: false, error: 'Missing room ID or status.' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('physical_rooms')
      .update({ status: newStatus })
      .eq('id', physicalRoomId);

    if (error) {
      console.error('Error updating status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: msg };
  }
}

async function deleteRoomAction(formData: FormData) {
  'use server';
  const physicalRoomId = formData.get('physicalRoomId') as string;

  if (!physicalRoomId) {
    return { success: false, error: 'Missing room ID.' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('physical_rooms')
      .delete()
      .eq('id', physicalRoomId);

    if (error) {
      console.error('Error deleting room:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: msg };
  }
}

// Set, change, or assign a room for any appointment / reservation
async function setRoomForBookingAction(formData: FormData) {
  'use server';
  const bookingId = formData.get('bookingId') as string;
  const newRoomNumber = (formData.get('roomNumber') as string)?.trim();

  if (!bookingId) {
    return { success: false, error: 'Booking ID is required.' };
  }

  try {
    // 1. Fetch current booking to check existing assignment
    const { data: currentBooking, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select('assigned_room_number, status')
      .eq('id', bookingId)
      .single();

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    const oldRoomNumber = currentBooking?.assigned_room_number;

    // 2. If changing/assigning a room
    if (newRoomNumber) {
      // Release old room back to Available if different
      if (oldRoomNumber && oldRoomNumber !== newRoomNumber) {
        await supabaseAdmin
          .from('physical_rooms')
          .update({ status: 'Available' })
          .eq('room_number', oldRoomNumber);
      }

      // Mark newly assigned physical room as Occupied
      await supabaseAdmin
        .from('physical_rooms')
        .update({ status: 'Occupied' })
        .eq('room_number', newRoomNumber);

      // Update booking status to Confirmed and set assigned room
      const { error: updateErr } = await supabaseAdmin
        .from('bookings')
        .update({
          assigned_room_number: newRoomNumber,
          status: 'Confirmed',
        })
        .eq('id', bookingId);

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }
    } else {
      // If unsetting room
      if (oldRoomNumber) {
        await supabaseAdmin
          .from('physical_rooms')
          .update({ status: 'Available' })
          .eq('room_number', oldRoomNumber);
      }

      const { error: updateErr } = await supabaseAdmin
        .from('bookings')
        .update({ assigned_room_number: null })
        .eq('id', bookingId);

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: msg };
  }
}

async function cancelBookingAction(formData: FormData) {
  'use server';
  const bookingId = formData.get('bookingId') as string;

  if (!bookingId) {
    return { success: false, error: 'Booking ID required.' };
  }

  try {
    // Retrieve assigned room number before cancelling
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('assigned_room_number')
      .eq('id', bookingId)
      .single();

    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (booking?.assigned_room_number) {
      // Release physical room back to Available
      await supabaseAdmin
        .from('physical_rooms')
        .update({ status: 'Available' })
        .eq('room_number', booking.assigned_room_number);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: msg };
  }
}

async function createAdminBookingAction(formData: FormData) {
  'use server';
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const roomId = formData.get('roomId') as string;
  const checkIn = formData.get('checkIn') as string;
  const checkOut = formData.get('checkOut') as string;
  const guests = Number(formData.get('guests')) || 1;
  const assignedRoomNumber = (formData.get('assignedRoomNumber') as string)?.trim() || null;
  const totalPrice = Number(formData.get('totalPrice')) || 0;

  if (!firstName || !lastName || !roomId || !checkIn || !checkOut) {
    return { success: false, error: 'Please fill in all required booking fields.' };
  }

  try {
    const { error: insertErr } = await supabaseAdmin.from('bookings').insert([
      {
        first_name: firstName,
        last_name: lastName,
        email: email || 'guest@walkin.hotel',
        phone: phone || 'N/A',
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        guests: guests,
        total_price: totalPrice,
        status: assignedRoomNumber ? 'Confirmed' : 'Pending',
        assigned_room_number: assignedRoomNumber,
      },
    ]);

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    if (assignedRoomNumber) {
      await supabaseAdmin
        .from('physical_rooms')
        .update({ status: 'Occupied' })
        .eq('room_number', assignedRoomNumber);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: msg };
  }
}

export default async function AdminDashboard() {
  // 1. Fetch bookings
  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      rooms ( name, price_per_night )
    `)
    .order('created_at', { ascending: false });

  // 2. Fetch all physical rooms with suite categories
  const { data: physicalRooms, error: physicalRoomsError } = await supabaseAdmin
    .from('physical_rooms')
    .select(`
      id,
      room_number,
      room_category_id,
      status,
      created_at,
      rooms ( name )
    `)
    .order('room_number', { ascending: true });

  // 3. Fetch room categories
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from('rooms')
    .select('id, name, price_per_night')
    .order('price_per_night', { ascending: false });

  const safeBookings = (bookings || []) as any[];
  const safePhysicalRooms = (physicalRooms || []) as any[];
  const safeCategories = categories || [];

  const fetchError =
    bookingsError?.message || physicalRoomsError?.message || categoriesError?.message || null;

  return (
    <AdminDashboardClient
      initialBookings={safeBookings}
      initialPhysicalRooms={safePhysicalRooms}
      categories={safeCategories}
      fetchError={fetchError}
      addRoomAction={addPhysicalRoomAction}
      updateStatusAction={updateRoomStatusAction}
      deleteRoomAction={deleteRoomAction}
      setRoomForBookingAction={setRoomForBookingAction}
      cancelBookingAction={cancelBookingAction}
      createAdminBookingAction={createAdminBookingAction}
    />
  );
}
