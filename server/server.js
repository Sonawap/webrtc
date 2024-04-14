"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = require("dotenv");
dotenv.config();
var express = require("express");
var http = require("http");
var socket_io_1 = require("socket.io");
var app = express();
var server = http.createServer(app);
var io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['POST', 'GET']
    }
});
var users = {};
var socketToRoom = {};
io.on('connection', function (socket) {
    socket.on("join room", function (roomID) {
        if (users[roomID]) {
            var length_1 = users[roomID].length;
            if (length_1 === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        }
        else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        var usersInThisRoom = users[roomID].filter(function (id) { return id !== socket.id; });
        console.log(usersInThisRoom);
        socket.emit("all users", usersInThisRoom);
    });
    socket.on("sending signal", function (payload) {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });
    socket.on("returning signal", function (payload) {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });
    socket.on('disconnect', function () {
        var roomID = socketToRoom[socket.id];
        var room = users[roomID];
        if (room) {
            var updatedRoom = room.filter(function (id) { return id !== socket.id; });
            users[roomID] = updatedRoom;
        }
    });
});
server.listen(process.env.PORT || 8000, function () { return console.log('server is running on port 8000'); });
