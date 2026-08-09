const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.io server and setup handshake middleware + event listeners.
 * @param {import('http').Server} server - Node.js HTTP server instance
 * @param {object} [options] - Custom Socket.io server options
 * @returns {Server} Socket.io instance
 */
function initSocket(server, options = {}) {
    const corsOptions = options.cors || {
        origin: '*',
        methods: ['GET', 'POST']
    };

    io = new Server(server, {
        cors: corsOptions,
        ...options
    });

    // Handshake Authentication Middleware
    io.use((socket, next) => {
        let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        if (typeof token === 'string' && token.startsWith('Bearer ')) {
            token = token.slice(7).trim();
        }

        try {
            const secret = process.env.ACCESS_TOKEN_SECRET;
            if (!secret) {
                return next(new Error('ACCESS_TOKEN_SECRET is not configured on server'));
            }
            const payload = jwt.verify(token, secret);
            socket.user = payload; // Attach decoded JWT payload (sub, email, roles)
            next();
        } catch (err) {
            return next(new Error('Invalid or expired token'));
        }
    });

    // Connection Handler
    io.on('connection', (socket) => {
        const userId = socket.user?.sub || socket.user?.id;
        if (userId) {
            const userRoom = `user_${userId}`;
            socket.join(userRoom);
            console.log(`[Socket.io] User ${userId} connected and joined room ${userRoom}`);
        }

        // Event: Join specific job/request room for real-time tracking and chat
        socket.on('join_job_room', (requestId) => {
            if (requestId) {
                const jobRoom = `request_${requestId}`;
                socket.join(jobRoom);
                console.log(`[Socket.io] User ${userId} joined job room ${jobRoom}`);
            }
        });

        // Event: Leave specific job/request room
        socket.on('leave_job_room', (requestId) => {
            if (requestId) {
                const jobRoom = `request_${requestId}`;
                socket.leave(jobRoom);
                console.log(`[Socket.io] User ${userId} left job room ${jobRoom}`);
            }
        });

        // Event: Real-time chat message within job room
        socket.on('chat:send_message', (data) => {
            const { requestId, text } = data || {};
            if (requestId && text) {
                const jobRoom = `request_${requestId}`;
                const messagePayload = {
                    request_id: requestId,
                    sender_id: userId,
                    text,
                    timestamp: new Date().toISOString()
                };
                io.to(jobRoom).emit('chat:message_received', messagePayload);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Socket.io] User ${userId} disconnected: ${reason}`);
        });
    });

    return io;
}

/**
 * Get initialized Socket.io instance
 * @returns {Server}
 */
function getIO() {
    if (!io) {
        throw new Error('Socket.io has not been initialized. Call initSocket(server) first.');
    }
    return io;
}

/**
 * Send a notification/event to a specific user by account ID
 * @param {string} userId - User's account ID
 * @param {string} event - Event name (e.g., 'notification:new_bid')
 * @param {object} payload - Event payload data
 */
function sendNotification(userId, event, payload) {
    if (!userId || !event) return;
    const room = `user_${userId}`;
    const instance = getIO();
    instance.to(room).emit(event, payload);
}

/**
 * Emit an event to a specific room
 * @param {string} room - Room name (e.g., 'request_123' or 'user_456')
 * @param {string} event - Event name
 * @param {object} payload - Event payload data
 */
function emitToRoom(room, event, payload) {
    if (!room || !event) return;
    const instance = getIO();
    instance.to(room).emit(event, payload);
}

/**
 * Emit an event to a specific job/request room
 * @param {string} requestId - Request UUID
 * @param {string} event - Event name (e.g., 'job:status_updated')
 * @param {object} payload - Event payload data
 */
function emitToJobRoom(requestId, event, payload) {
    if (!requestId || !event) return;
    const room = `request_${requestId}`;
    emitToRoom(room, event, payload);
}

module.exports = {
    initSocket,
    getIO,
    sendNotification,
    emitToUser: sendNotification,
    emitToRoom,
    emitToJobRoom
};
