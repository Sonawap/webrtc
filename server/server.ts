import * as dotenv from 'dotenv';
dotenv.config();

import * as express from "express";
import * as http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['POST', 'GET']
    }
});

interface UserMap {
    [roomID: string]: string[];
}

const users: UserMap = {};

interface SocketRoomMap {
    [socketID: string]: string;
}

const socketToRoom: SocketRoomMap = {};

io.on('connection', (socket: Socket) => {
    socket.on("join room", (roomID: string) => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);
        console.log(usersInThisRoom)

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", (payload: { userToSignal: string, signal: any, callerID: string }) => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", (payload: { callerID: string, signal: any }) => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        const room = users[roomID];
        if (room) {
            const updatedRoom = room.filter(id => id !== socket.id);
            users[roomID] = updatedRoom;
        }
    });
    
});

server.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'));
