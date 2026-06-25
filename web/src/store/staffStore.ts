import { create } from 'zustand';
import type { Staff } from '../type/staff';

interface StaffState {
  staff: Staff | null;
  setStaff: (staff: Staff | null) => void;
}

export const useStaffStore = create<StaffState>((set) => ({
  staff: null,
  setStaff: (staff) => set({ staff }),
}));
