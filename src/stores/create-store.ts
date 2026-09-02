import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

export type StoreCreator<T> = StateCreator<T, [], []>;

export function createStore<T extends object>(creator: StoreCreator<T>) {
  return create<T>()(devtools(creator, { enabled: import.meta.env.DEV }));
}
