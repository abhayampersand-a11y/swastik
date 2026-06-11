"use client"

import { Provider } from "react-redux"
import { store } from "@/lib/redux/store"

// No PersistGate: the first client render uses the empty store (matching SSR
// output, so no hydration mismatch), then redux-persist rehydrates from
// localStorage within the same tick and cached data appears immediately.
export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>
}
