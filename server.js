require('dotenv').config();
const db = require('./db');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const verifyToken = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomTypeRoutes = require('./routes/roomTypeRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');

const app = express();


const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(cors({
    origin: [FRONTEND_URL],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);


app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/room-types', roomTypeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api', authRoutes);




app.listen(process.env.PORT_Server, () => {
    console.log(`Server đang chạy tại http://localhost:${process.env.PORT_Server}`);
});