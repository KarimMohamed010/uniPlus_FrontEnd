import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = 'http://localhost:3000';

export const useSocket = () => {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (token && !socketRef.current) {
        // Initialize socket only if we have a token and no existing connection
        socketRef.current = io(SOCKET_URL, {
            auth: {
                token: token,
                senderName: user ? `${user.fname} ${user.lname}` : 'Unknown'
            },
        });

        socketRef.current.on('connect', () => {
            console.log('Socket connected:', socketRef.current?.id);
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, user]);

  return socketRef.current;
};
