import { configureStore } from "@reduxjs/toolkit"
import {
  persistReducer, persistStore,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from "redux-persist"
import storage from "./storage"
import apiCacheReducer from "./api-cache-slice"

const persistedApiCache = persistReducer(
  { key: "swastik-api-cache", storage },
  apiCacheReducer
)

export const store = configureStore({
  reducer: {
    apiCache: persistedApiCache,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches non-serializable actions by design
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
