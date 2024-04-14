import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer, { SignalData } from "simple-peer";
import styled from "styled-components";
import { useParams } from 'react-router-dom';

const Container = styled.div`
    padding: 20px;
    display: flex;
    height: 100vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;

const StyledVideo = styled.video`
    height: 40%;
    width: 50%;
`;

interface VideoProps {
    peer: Peer.Instance;
}

const Video: React.FC<VideoProps> = ({ peer }) => {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (ref.current) {
            peer.on("stream", (stream) => {
                if(ref.current){
                    ref.current.srcObject = stream;
                }
            });
        }
    }, [peer]);

    return <StyledVideo playsInline autoPlay ref={ref} />;
};

const BASEURL = "http://localhost:8000";

const Room: React.FC<any> = () => {
    const [peers, setPeers] = useState<Peer.Instance[]>([]);
    const socketRef = useRef<any>(null);
    const userVideo = useRef<HTMLVideoElement>(null);
    const peersRef = useRef<{ peerID: string; peer: Peer.Instance }[]>([]);
    const { roomID } = useParams<{ roomID: string }>();

    useEffect(() => {
        socketRef.current = io(process.env.REACT_APP_BASE_SERVER_URL ?? BASEURL, {
            reconnection: true,
        });

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            if (userVideo.current) {
                userVideo.current.srcObject = stream;
            }
            socketRef.current.emit("join room", roomID);
            socketRef.current.on("all users", (users: any) => {
                const newPeers: Peer.Instance[] = [];
                users.forEach((userID: string) => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    });
                    newPeers.push(peer);
                });
                setPeers(newPeers);
            });

            socketRef.current.on("user joined", (payload:any) => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                });

                setPeers(prevPeers => [...prevPeers, peer]);
            });

            socketRef.current.on("receiving returned signal", (payload: any) => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                if (item && !item.peer.destroyed) {
                    item.peer.signal(payload.signal);
                }
            });
        });
    }, [roomID]);

    function createPeer(userToSignal: string, callerID: string, stream: MediaStream): Peer.Instance {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
            config: {
                iceServers: [
                    {
                        urls: process.env.REACT_APP_ICE_SERVER_STUN_URL
                    },
                    {
                        urls: process.env.REACT_APP_ICE_SERVER_TURN_URL,
                        credential: process.env.REACT_APP_ICE_SERVER_STUN_CREDENTIAL,
                        username: process.env.REACT_APP_ICE_SERVER_STUN_USERNAME
                    },
                ]
            }
        });

        peer.on("signal", (signal: SignalData) => {
            if (!peer.destroyed) {
                socketRef.current.emit("sending signal", { userToSignal, callerID, signal });
            }
        });

        peer.on('connect', () => {
            console.log('Peer connected');
        });

        peer.on('close', () => {
            console.log('Peer closed');
        });

        peer.on('error', (err) => {
            console.error('Peer connection error:', err);
        });

        return peer;
    }

    function addPeer(incomingSignal: SignalData, callerID: string, stream: MediaStream): Peer.Instance {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
            config: {
                iceServers: [
                    {
                        urls: process.env.REACT_APP_ICE_SERVER_STUN_URL
                    },
                    {
                        urls: process.env.REACT_APP_ICE_SERVER_TURN_URL,
                        credential: process.env.REACT_APP_ICE_SERVER_STUN_CREDENTIAL,
                        username: process.env.REACT_APP_ICE_SERVER_STUN_USERNAME
                    },
                ]
            }
        });

        peer.on("signal", (signal: SignalData) => {
            if (!peer.destroyed) {
                socketRef.current.emit("returning signal", { signal, callerID });
            }
        });

        peer.on('connect', () => {
            console.log('Peer connected');
        });

        peer.on('close', () => {
            console.log('Peer closed');
        });

        peer.on('error', (err) => {
            console.error('Peer connection error:', err);
        });

        peer.signal(incomingSignal);

        return peer;
    }

    return (
        <Container>
            <StyledVideo ref={userVideo} autoPlay />
            {peers.map((peer, index) => {
                return <Video key={index} peer={peer} />;
            })}
        </Container>
    );
};

export default Room;
