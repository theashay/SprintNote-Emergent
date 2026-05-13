import { create } from 'zustand';
import { api, setToken } from './api';

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  plan: 'free' | 'pro';
  verified: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  bootstrap: () => Promise<void>;
  setUser: (u: User | null) => void;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  bootstrap: async () => {
    set({ loading: true });
    try {
      const r = await api.me();
      set({ user: r.user as User, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  setUser: (u) => set({ user: u }),
  signIn: async (token, user) => {
    await setToken(token);
    set({ user });
  },
  signOut: async () => {
    try { await api.logout(); } catch {}
    await setToken(null);
    set({ user: null });
  },
}));

type UIState = {
  selectedFolder: string;
  setSelectedFolder: (f: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

export const useUI = create<UIState>((set) => ({
  selectedFolder: 'All Notes',
  setSelectedFolder: (f) => set({ selectedFolder: f }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
