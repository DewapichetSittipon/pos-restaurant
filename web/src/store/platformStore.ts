import { create } from 'zustand';
import type { PlatformAdmin } from '../type/platform';

interface PlatformState {
  admin: PlatformAdmin | null;
  setAdmin: (admin: PlatformAdmin | null) => void;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  admin: null,
  setAdmin: (admin) => set({ admin }),
}));
