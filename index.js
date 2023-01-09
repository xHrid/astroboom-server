require("dotenv").config();

const express = require("express");
const PORT = process.env.PORT || 3000;
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const config = require("./src/config/db");
const emitName = require("./emitNames");
const blockStates = require("./blockStates");
const path = require("path");

function generateString() {
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for ( let i = 0; i < 8; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// creating app - which handles all the get/post requests
const app = express();

// socket setup - which handles socket request
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

// configuring database and mongoose

mongoose
    .connect(config.database, { useNewUrlParser: true })
    .then( ()=> {
        console.log("Database is connected");
    })
    .catch(err => {
        console.log({database_error: err});
    });

// --- db config ends here ---

if (process.env.NODE_ENV == 'development') app.use(cors());

app.use(express.static(path.join(process.cwd(), 'public')));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(morgan("dev"));

const userRoutes = require("./src/api/user/route/user");
const { p2Details } = require("./emitNames");
const User = require("./src/api/user/model/User");

app.use("/api/user", userRoutes);

const rooms = {}
const openRooms = []
const activePlayers = {}

// Socket Management
io.on("connection", socket=> {

    let localLobbyCode = null;
    let localPName = null;
    let localPEmail = null;

    const p1Data = [
        {i : 0, j : 0, x: 0, y: 0, w: 0, h: 0, status: blockStates.normal, destroyed: false, adj: [] },
        {i : 0, j : 1, x: 0, y: 0, w: 0, h: 0, status: blockStates.normal, destroyed: false, adj: [] },
        {i : 1, j : 0, x: 0, y: 0, w: 0, h: 0, status: blockStates.normal, destroyed: false, adj: [] },
        {i : 1, j : 1, x: 0, y: 0, w: 0, h: 0, status: blockStates.normal, destroyed: false, adj: [] },
        {i : 2, j : 0, x: 0, y: 0, w: 0, h: 0, status: blockStates.normal, destroyed: false, adj: [] },
        {i : 2, j : 1, x: 0, y: 0, w: 0, h: 0, status: blockStates.normal, destroyed: false, adj: [] },
    ]
    
    socket.on(emitName.handshake, (pName, lobbyCode, mode, pEmail)=>{
        
        localPName = pName;
        localPEmail = pEmail

        if (activePlayers.hasOwnProperty(pEmail)) {
            console.log("Already Connected!");
        } else {
            console.log("New Connection for lobby: ", lobbyCode, "mode : ", mode);
            if (lobbyCode == "") {
                if (openRooms.length == 0) {
                    lobbyCode = generateString();
                    openRooms.push(lobbyCode);
                    rooms[lobbyCode] = [];
                    rooms[lobbyCode].push({socket: socket, name: pName, email:pEmail, p1Data, buildCount: 0});
                    socket.join(lobbyCode);
                    localLobbyCode = lobbyCode;
                    activePlayers[pEmail] = lobbyCode;
                    console.log("p1 connected ", activePlayers, pName);

                } else {
                    setTimeout(()=>{
                        if (openRooms.length == 0) {
                            lobbyCode = generateString();
                            openRooms.push(lobbyCode);
                            rooms[lobbyCode] = [];
                            rooms[lobbyCode].push({socket: socket, name: pName, email:pEmail, p1Data, buildCount: 0});
                            socket.join(lobbyCode);
                            localLobbyCode = lobbyCode
                            activePlayers[pEmail] = lobbyCode;
                        } else {
                            const i = Math.random() * openRooms.length;
                            lobbyCode = openRooms.splice(i, 1)[0];
                            socket.join(lobbyCode);
                            activePlayers[pEmail] = lobbyCode;
                            localLobbyCode = lobbyCode
                            console.log("P2 Connected", activePlayers, pName, localPName);
                            rooms[lobbyCode].push({socket: socket, name: pName, email:pEmail, p1Data, buildCount: 0});

                            const p1Turn = Math.random() < 0.5;

                            const p1Position = Math.floor(Math.random()*6);
                            const p2Position = Math.floor(Math.random()*6);

                            rooms[lobbyCode][0].hasTurn = p1Turn;
                            rooms[lobbyCode][1].hasTurn = !p1Data;

                            rooms[lobbyCode][0].position = {
                                i: Math.floor(p1Position/2),
                                j: p1Position%2
                            };
                            rooms[lobbyCode][1].position = {
                                i: Math.floor(p2Position/2),
                                j: p2Position%2 
                            };

                            rooms[lobbyCode][0].socket.emit(p2Details, {p2: pName, p1Data, p2Data: rooms[lobbyCode][0].p1Data, yourTurn: p1Turn, position: {
                                i: Math.floor(p1Position/2),
                                j: p1Position%2
                            }})
                            socket.emit(p2Details, {p2: rooms[lobbyCode][0].name, p1Data: rooms[lobbyCode][0].p1Data, p2Data: p1Data, yourTurn: !p1Turn, position: {
                                i: Math.floor(p2Position/2),
                                j: p2Position%2 
                            }})
                        }
                    }, 0)
                }
            }else if (mode == 'j'){
                if ( rooms.hasOwnProperty(lobbyCode) && rooms[lobbyCode].length < 2) {
                    socket.join(lobbyCode);
                    activePlayers[pEmail] = lobbyCode;
                    localLobbyCode = lobbyCode
                    console.log("P2 Connected", activePlayers, pName, localPName);
                    rooms[lobbyCode].push({socket: socket, name: pName, email:pEmail, p1Data, buildCount: 0});

                    const p1Turn = Math.random() < 0.5;

                    const p1Position = Math.floor(Math.random()*6);
                    const p2Position = Math.floor(Math.random()*6);

                    rooms[lobbyCode][0].hasTurn = p1Turn;
                    rooms[lobbyCode][1].hasTurn = !p1Data;

                    rooms[lobbyCode][0].position = {
                        i: Math.floor(p1Position/2),
                        j: p1Position%2
                    };
                    rooms[lobbyCode][1].position = {
                        i: Math.floor(p2Position/2),
                        j: p2Position%2 
                    };

                    rooms[lobbyCode][0].socket.emit(p2Details, {p2: pName, p1Data, p2Data: rooms[lobbyCode][0].p1Data, yourTurn: p1Turn, position: {
                        i: Math.floor(p1Position/2),
                        j: p1Position%2
                    }})
                    socket.emit(p2Details, {p2: rooms[lobbyCode][0].name, p1Data: rooms[lobbyCode][0].p1Data, p2Data: p1Data, yourTurn: !p1Turn, position: {
                        i: Math.floor(p2Position/2),
                        j: p2Position%2 
                    }})
                }
                
            } else if (mode == 'c') {
                if(!rooms.hasOwnProperty(lobbyCode)
                && !openRooms.includes(lobbyCode)) {
                    rooms[lobbyCode] = [];
                    rooms[lobbyCode].push({socket: socket, name: pName, email:pEmail, p1Data, buildCount: 0});
                    socket.join(lobbyCode);
                    activePlayers[pEmail] = lobbyCode;
                    localLobbyCode = lobbyCode;
            

                }
            }
            
            localLobbyCode = lobbyCode;
            
            socket.on("disconnect", ()=> {
                io.to(localLobbyCode).emit(emitName.p2Disconnected);
                if (openRooms.includes(localLobbyCode))
                    openRooms.splice(openRooms.indexOf(localLobbyCode, 1));
                if (activePlayers.hasOwnProperty(localPEmail))
                    delete activePlayers[localPEmail];
                if (rooms.hasOwnProperty(localLobbyCode)){
                    delete rooms[localLobbyCode];
                }
                console.log("Disconnected", activePlayers, localPName, "localLobbyCode : ", localLobbyCode);
            } )

            socket.on(emitName.go, (mode, activeCells, newPlayerLocation, oldPlayerLocation)=> {
                const data = rooms[localLobbyCode].find( obj => obj.socket == socket );
                const p2I = rooms[localLobbyCode].indexOf(data) == 0 ? 1 : 0;
                const p2Data = rooms[localLobbyCode][p2I];
                let attackSqare = null;
                let gameEnded = 0;

                if (mode == "build"){
                    data.p1Data[activeCells[0].i*2 + activeCells[0].j].adj.push([activeCells[1].i, activeCells[1].j])
                    data.p1Data[activeCells[1].i*2 + activeCells[1].j].adj.push([activeCells[0].i, activeCells[0].j])
                    data.buildCount++;
                } else if (mode == "attack") {
                    data.buildCount = 0;
                    data.position = {
                        ...newPlayerLocation
                    }
                    
                    attackSqare = activeCells[0].i*2 + activeCells[0].j;
                    if (attackSqare == p2Data.position.i*2 + p2Data.position.j) gameEnded = 1;
                    p2Data.p1Data[activeCells[0].i*2 + activeCells[0].j].destroyed = true;
                    p2Data.p1Data[activeCells[0].i*2 + activeCells[0].j].adj.forEach(cell => {
                        p2Data.p1Data[cell[0]*2 + cell[1]].adj.forEach((con, idx) => {
                            if (con[0] == activeCells[0].i && con[1] == activeCells[0].j )
                            p2Data.p1Data[cell[0]*2 + cell[1]].adj.splice(idx, 1);
                        })
                    })

                    p2Data.p1Data[activeCells[0].i*2 + activeCells[0].j].adj = [];
                    p2Data.socket.emit(emitName.updateP2, oldPlayerLocation);
                }

                data.hasTurn = false;
                p2Data.hasTurn = true;

                socket.emit(emitName.upDateState, data.p1Data, p2Data.p1Data, data.hasTurn, [attackSqare, 0], data.buildCount >= 3, [gameEnded, 1]);
                socket.to(localLobbyCode).emit(emitName.upDateState, p2Data.p1Data , data.p1Data, p2Data.hasTurn, [attackSqare, 1], p2Data.buildCount >= 3, [gameEnded, 0]);

                if (gameEnded) {
                    if (openRooms.includes(localLobbyCode))
                        openRooms.splice(openRooms.indexOf(localLobbyCode, 1));
                    if (activePlayers.hasOwnProperty(localPEmail))
                        delete activePlayers[localPEmail];
                    if (rooms.hasOwnProperty(localLobbyCode)){
                        delete rooms[localLobbyCode];
                    }

                    (async () => {
                        await User.updateOne(
                            {email: localPEmail},
                            {
                                $inc: {
                                    wins: 1,
                                    points: 10,
                                }
                            })
                    })()

                }
                console.log("Disconnected", activePlayers, localPName, "localLobbyCode : ", localLobbyCode);

            })
        }
    })


})

app.use(function(req, res, next) {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
})

// Listen to server
server.listen(PORT, ()=> {
    console.log(`listing to port : ${PORT}`);
})