import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { riderJobKey } from "../design/rider-job-updates";

type State = {
  seenByRider: Record<string, Record<string, boolean>>;
  announcedByRider: Record<string, Record<string, boolean>>;
  hydrated: boolean;
  setHydrated: () => void;
  markAnnounced: (riderId: number, jobs: { id: number; stage: string }[]) => void;
  markSeen: (riderId: number, job: { id: number; stage: string }) => void;
};
// Read state belongs to a rider and survives dashboard navigation and app reloads.
export const useRiderJobSeenStore = create<State>()(persist((set) => ({
  seenByRider: {},
  announcedByRider: {},
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
  markAnnounced: (riderId, jobs) => set(state => ({ announcedByRider: {
    ...state.announcedByRider,
    [riderId]: { ...state.announcedByRider[riderId], ...Object.fromEntries(jobs.map(job => [riderJobKey(job), true])) },
  } })),
  markSeen: (riderId, job) => set(state => {
    const seen = state.seenByRider[riderId] || {};
    const key = riderJobKey(job);
    if (seen[key]) return state;
    return { seenByRider: { ...state.seenByRider, [riderId]: { ...seen, [key]: true } } };
  }),
}), { name: "labaride-rider-seen-jobs", storage: createJSONStorage(() => AsyncStorage),
  partialize: state => ({ seenByRider: state.seenByRider, announcedByRider: state.announcedByRider }),
  onRehydrateStorage: state => () => state.setHydrated(),
}));
