const db = require("./db");

async function runMigration() {
  console.log("Starting migration for multi-room booking...");

  await db.query(`
    CREATE TABLE IF NOT EXISTS booking_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      room_id INT NOT NULL,
      price_per_night DECIMAL(12,2) NOT NULL,
      nights INT NOT NULL,
      subtotal DECIMAL(14,2) NOT NULL,
      guest_count INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_bd_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      CONSTRAINT fk_bd_room FOREIGN KEY (room_id) REFERENCES room(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log("✓ Table booking_details created or already exists.");

  // Check if room_id is already nullable
  const [cols] = await db.query(`
    SELECT IS_NULLABLE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bookings' 
      AND COLUMN_NAME = 'room_id'
  `);
  if (cols.length > 0 && cols[0].IS_NULLABLE === 'NO') {
    await db.query(`ALTER TABLE bookings MODIFY COLUMN room_id INT NULL;`);
    console.log("✓ Modified bookings.room_id to NULLABLE.");
  } else {
    console.log("✓ bookings.room_id is already NULLABLE.");
  }

  // Backfill existing bookings
  const [insertResult] = await db.query(`
    INSERT INTO booking_details (booking_id, room_id, price_per_night, nights, subtotal, guest_count)
    SELECT 
      b.id,
      b.room_id,
      COALESCE(rt.price_per_night, b.total_price),
      GREATEST(1, DATEDIFF(b.check_out_date, b.check_in_date)),
      b.total_price,
      COALESCE(rt.max_guests, 2)
    FROM bookings b
    JOIN room r ON b.room_id = r.id
    LEFT JOIN room_types rt ON r.room_type_id = rt.id
    WHERE b.room_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM booking_details bd WHERE bd.booking_id = b.id
      );
  `);
  console.log(`✓ Backfilled ${insertResult.affectedRows} existing bookings into booking_details.`);

  const [count] = await db.query(`SELECT COUNT(*) as cnt FROM booking_details;`);
  console.log(`✓ Total records in booking_details: ${count[0].cnt}`);

  console.log("Migration completed successfully!");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
