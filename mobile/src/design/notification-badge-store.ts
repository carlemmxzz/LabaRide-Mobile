import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type BadgeState = {
  viewedThrough: Record<string, number>;
  hydrated: boolean;
  finishHydration: () => void;
  view: (scope: string, items: readonly { id: number }[]) => void;
};

// Bell attention is separate from an individual notification's readAt.
export const useNotificationBadgeStore = create<BadgeState>()(persist((set) => ({
  viewedThrough: {},
  hydrated: false,
  finishHydration: () => set({ hydrated: true }),
  view: (scope, items) => set(state => {
    const latest = items.reduce((max, item) => Math.max(max, item.id), 0);
    if (latest <= (state.viewedThrough[scope] || 0)) return state;
    return { viewedThrough: { ...state.viewedThrough, [scope]: latest } };
  }),
}), {
  name: "labaride-notification-badges",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: state => ({ viewedThrough: state.viewedThrough }),
  merge: (saved, current) => {
    const viewedThrough = { ...current.viewedThrough };
    const stored = (saved as Partial<BadgeState> | undefined)?.viewedThrough;
    for (const [scope, id] of Object.entries(stored || {})) {
      if (Number.isSafeInteger(id) && id > 0) viewedThrough[scope] = Math.max(viewedThrough[scope] || 0, id);
    }
    return { ...current, viewedThrough };
  },
  onRehydrateStorage: state => () => state.finishHydration(),
}));
