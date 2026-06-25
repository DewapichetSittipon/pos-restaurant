import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { setQrToken } from '../services/api';
import { fetchSession } from '../services/customerApi';
import { createCustomerSocket, SOCKET_EVENTS } from '../services/socket';
import { useSessionStore } from '../store/sessionStore';
import type { OrderItem } from '../type/domain';
import type { OrderCreatedEvent } from '../type/api';

// ผูก qr_token + โหลด session + ต่อ socket + ฟัง real-time events
export function useCustomerSession(tableId: number, token: string): void {
  const init = useSessionStore((s) => s.init);
  const setSession = useSessionStore((s) => s.setSession);
  const setStatus = useSessionStore((s) => s.setStatus);
  const applyOrderCreated = useSessionStore((s) => s.applyOrderCreated);
  const applyItemStatus = useSessionStore((s) => s.applyItemStatus);
  const markClosed = useSessionStore((s) => s.markClosed);

  useEffect(() => {
    setQrToken(token);
    init(tableId, token);

    let socket: Socket | null = null;

    fetchSession()
      .then((session) => {
        setSession(session);

        socket = createCustomerSocket(token);
        socket.on(SOCKET_EVENTS.orderCreated, (e: OrderCreatedEvent) => {
          applyOrderCreated(e.items);
        });
        socket.on(SOCKET_EVENTS.orderItemStatusChanged, (item: OrderItem) => {
          applyItemStatus(item);
        });
        socket.on(SOCKET_EVENTS.billClosed, () => {
          markClosed();
        });
      })
      .catch(() => {
        // 401 = บิลปิด/ token ไม่ถูกต้อง
        setStatus('invalid');
      });

    return () => {
      socket?.disconnect();
      setQrToken(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, token]);
}
