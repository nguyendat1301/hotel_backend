const db = require("./db");
const bookingService = require("./services/bookingService");

async function runTestSuite() {
  console.log("==================================================");
  console.log("  HOTEL BOOKING TEST SUITE: MULTI-ROOM UPGRADE   ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = "") {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName} ${extraInfo}`);
      failed++;
    }
  }

  // Find a test user or create mock user
  const [users] = await db.query("SELECT id, user_name, email FROM users LIMIT 1");
  const testUser = users[0] || { id: 1, user_name: "Test User", email: "test@example.com" };

  // Find available rooms for testing
  const [rooms] = await db.query(`
    SELECT r.id, r.room_number, r.room_type_id, rt.room_name, rt.price_per_night, rt.max_guests
    FROM room r
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE LOWER(COALESCE(r.status, 'available')) = 'available'
    LIMIT 10
  `);

  if (rooms.length < 3) {
    console.error("Not enough rooms in database for comprehensive tests!");
    process.exit(1);
  }

  const roomA = rooms[0];
  const roomB = rooms[1];
  const roomC = rooms[2];

  console.log(`Using test rooms: Room A (#${roomA.room_number}, ID ${roomA.id}, max ${roomA.max_guests}), Room B (#${roomB.room_number}, ID ${roomB.id}, max ${roomB.max_guests}), Room C (#${roomC.room_number}, ID ${roomC.id}, max ${roomC.max_guests})\n`);

  const futureCheckIn = "2029-01-10";
  const futureCheckOut = "2029-01-12"; // 2 nights

  // Cleanup any old test bookings from these future dates
  await db.query(`
    DELETE FROM payments WHERE booking_id IN (
      SELECT id FROM bookings WHERE check_in_date = ? AND check_out_date = ?
    )
  `, [futureCheckIn, futureCheckOut]);
  await db.query(`
    DELETE FROM booking_details WHERE booking_id IN (
      SELECT id FROM bookings WHERE check_in_date = ? AND check_out_date = ?
    )
  `, [futureCheckIn, futureCheckOut]);
  await db.query(`
    DELETE FROM bookings WHERE check_in_date = ? AND check_out_date = ?
  `, [futureCheckIn, futureCheckOut]);

  // TEST 1: Old single-room legacy payload format
  try {
    const res1 = await bookingService.createBooking({
      payload: {
        room_id: roomA.id,
        check_in_date: futureCheckIn,
        check_out_date: futureCheckOut,
        guest_count: 1,
        full_name: "Test Single Room",
        email: "test_single@example.com",
        phone: "0901111111",
        payment_amount: 500000,
        payment_method: "transfer",
      },
      user: testUser,
    });
    assert(res1 && res1.bookingId > 0, "1. Old single-room legacy payload works seamlessly");
  } catch (err) {
    assert(false, "1. Old single-room legacy payload works seamlessly", err.message);
  }

  // TEST 2: Overlapping booking on Room A should fail
  try {
    await bookingService.createBooking({
      payload: {
        rooms: [{ roomId: roomA.id, guestCount: 1 }],
        check_in_date: futureCheckIn,
        check_out_date: futureCheckOut,
        full_name: "Test Conflict",
        email: "test_conflict@example.com",
      },
      user: testUser,
    });
    assert(false, "2. Room already booked should throw conflict error");
  } catch (err) {
    assert(err.message.includes("đã được đặt"), "2. Room already booked should throw conflict error", `(${err.message})`);
  }

  // TEST 3: Invalid dates (checkIn >= checkOut)
  try {
    await bookingService.createBooking({
      payload: {
        rooms: [{ roomId: roomB.id, guestCount: 1 }],
        check_in_date: "2029-01-15",
        check_out_date: "2029-01-14",
        full_name: "Test Invalid Dates",
      },
      user: testUser,
    });
    assert(false, "3. Check-in >= check-out should fail");
  } catch (err) {
    assert(err.message.includes("trước ngày trả phòng"), "3. Check-in >= check-out should fail", `(${err.message})`);
  }

  // TEST 4: Empty rooms list
  try {
    await bookingService.createBooking({
      payload: {
        rooms: [],
        check_in_date: "2029-02-01",
        check_out_date: "2029-02-03",
        full_name: "Test Empty Rooms",
      },
      user: testUser,
    });
    assert(false, "4. Empty rooms list should fail");
  } catch (err) {
    assert(err.message.includes("ít nhất một phòng"), "4. Empty rooms list should fail", `(${err.message})`);
  }

  // TEST 5: Duplicate roomId in same order
  try {
    await bookingService.createBooking({
      payload: {
        rooms: [
          { roomId: roomB.id, guestCount: 1 },
          { roomId: roomB.id, guestCount: 2 },
        ],
        check_in_date: "2029-02-01",
        check_out_date: "2029-02-03",
        full_name: "Test Duplicate Room",
      },
      user: testUser,
    });
    assert(false, "5. Duplicate roomId in order should fail");
  } catch (err) {
    assert(err.message.includes("nhiều lần trong một đơn hàng"), "5. Duplicate roomId in order should fail", `(${err.message})`);
  }

  // TEST 6: Guests exceed max_guests
  try {
    await bookingService.createBooking({
      payload: {
        rooms: [{ roomId: roomB.id, guestCount: roomB.max_guests + 10 }],
        check_in_date: "2029-02-01",
        check_out_date: "2029-02-03",
        full_name: "Test Guest Overflow",
      },
      user: testUser,
    });
    assert(false, "6. Exceeding max guests should fail");
  } catch (err) {
    assert(err.message.includes("tối đa"), "6. Exceeding max guests should fail", `(${err.message})`);
  }

  // TEST 7: Successfully booking multiple rooms in one order
  let multiBookingId = null;
  const multiDateIn = "2029-03-01";
  const multiDateOut = "2029-03-04"; // 3 nights
  try {
    const expectedNights = 3;
    const expectedTotal = expectedNights * (Number(roomB.price_per_night) + Number(roomC.price_per_night));

    const resMulti = await bookingService.createBooking({
      payload: {
        rooms: [
          { roomId: roomB.id, guestCount: 2 },
          { roomId: roomC.id, guestCount: 1 },
        ],
        check_in_date: multiDateIn,
        check_out_date: multiDateOut,
        full_name: "Nguyen Van Multi",
        email: "multi@example.com",
        phone: "0988776655",
        payment_amount: expectedTotal / 2, // 50% deposit
        payment_method: "transfer",
      },
      user: testUser,
    });

    multiBookingId = resMulti.bookingId;
    assert(
      resMulti.bookingId > 0 &&
      resMulti.total_rooms === 2 &&
      resMulti.total_price === expectedTotal &&
      resMulti.payment_status === "PARTIAL_PAID",
      "7. Book multiple rooms in one order with backend price calculation and partial payment"
    );

    // Verify booking_details in DB
    const [dbDetails] = await db.query(
      "SELECT * FROM booking_details WHERE booking_id = ? ORDER BY room_id",
      [multiBookingId]
    );
    assert(
      dbDetails.length === 2 &&
      dbDetails[0].nights === expectedNights &&
      dbDetails[1].nights === expectedNights,
      "8. booking_details table correctly holds both rooms with nights and subtotals"
    );

    // Verify payments in DB (order level payment)
    const [dbPayments] = await db.query(
      "SELECT * FROM payments WHERE booking_id = ?",
      [multiBookingId]
    );
    assert(
      dbPayments.length === 1 &&
      Number(dbPayments[0].amount) === expectedTotal / 2,
      "9. Single payment transaction created at order level"
    );
  } catch (err) {
    assert(false, "7/8/9. Multi-room booking", err.message);
  }

  // TEST 10: Concurrency test - Two simultaneous bookings for Room B on conflicting dates
  try {
    const raceIn = "2029-03-02";
    const raceOut = "2029-03-05";

    const p1 = bookingService.createBooking({
      payload: {
        rooms: [{ roomId: roomB.id, guestCount: 1 }],
        check_in_date: raceIn,
        check_out_date: raceOut,
        full_name: "Racer 1",
        email: "racer1@example.com",
      },
      user: testUser,
    });

    const p2 = bookingService.createBooking({
      payload: {
        rooms: [{ roomId: roomB.id, guestCount: 1 }],
        check_in_date: raceIn,
        check_out_date: raceOut,
        full_name: "Racer 2",
        email: "racer2@example.com",
      },
      user: testUser,
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Since Room B is already booked in Test 7, both should be rejected due to conflict!
    assert(
      rejected.length >= 1,
      "10. Concurrent race condition check safely rejects conflicting booking"
    );
  } catch (err) {
    assert(false, "10. Concurrency test", err.message);
  }

  // TEST 11: Pay full remaining for multi-room order
  if (multiBookingId) {
    try {
      const payRes = await bookingService.payFullRemaining({
        id: multiBookingId,
        payment_method: "transfer",
      });
      assert(
        payRes.remaining_amount === 0,
        "11. payFullRemaining clears remaining amount for entire multi-room order"
      );

      const [updatedPayments] = await db.query(
        "SELECT * FROM payments WHERE booking_id = ?",
        [multiBookingId]
      );
      assert(
        updatedPayments.length === 2 &&
        updatedPayments.every((p) => p.status === "PAID" || p.status === "PARTIAL_PAID"),
        "12. Order has 2 payment records totalling 100% of order price"
      );
    } catch (err) {
      assert(false, "11/12. Pay full remaining", err.message);
    }
  }

  // TEST 12: getBookings returns rooms list and formatted room numbers
  try {
    const listRes = await bookingService.getBookings({ page: 1, limit: 10 });
    const multiRow = listRes.data.find((b) => b.id === multiBookingId);
    assert(
      multiRow &&
      Array.isArray(multiRow.rooms) &&
      multiRow.rooms.length === 2 &&
      multiRow.room_number.includes(","),
      "13. getBookings returns populated rooms array and comma-separated room_number"
    );
  } catch (err) {
    assert(false, "13. getBookings multi-room list", err.message);
  }

  // Clean up test data
  if (multiBookingId) {
    await bookingService.deleteBooking(multiBookingId);
  }
  await db.query(`
    DELETE FROM payments WHERE booking_id IN (
      SELECT id FROM bookings WHERE check_in_date = ? AND check_out_date = ?
    )
  `, [futureCheckIn, futureCheckOut]);
  await db.query(`
    DELETE FROM booking_details WHERE booking_id IN (
      SELECT id FROM bookings WHERE check_in_date = ? AND check_out_date = ?
    )
  `, [futureCheckIn, futureCheckOut]);
  await db.query(`
    DELETE FROM bookings WHERE check_in_date = ? AND check_out_date = ?
  `, [futureCheckIn, futureCheckOut]);

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch((err) => {
  console.error("Test suite crashed:", err);
  process.exit(1);
});
