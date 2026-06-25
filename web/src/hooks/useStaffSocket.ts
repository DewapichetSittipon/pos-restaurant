import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { createStaffSocket } from '../services/socket';

type Handlers = Record<string, (payload: unknown) => void>;

// ต่อ staff socket (cookie) แล้วผูก handler ตาม event; รี-bind เมื่อ handlers เปลี่ยน
export function useStaffSocket(handlers: Handlers): void {
  const handlersRef = useRef<Handlers>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket: Socket = createStaffSocket();
    const entries = Object.keys(handlersRef.current);
    for (const event of entries) {
      socket.on(event, (payload: unknown) => {
        handlersRef.current[event]?.(payload);
      });
    }
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
