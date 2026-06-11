import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface CacheEntry {
  data: unknown
  fetchedAt: number
}

interface ApiCacheState {
  entries: Record<string, CacheEntry>
}

const initialState: ApiCacheState = { entries: {} }

// Fetch a URL and store the JSON response in the cache.
export const refreshUrl = createAsyncThunk(
  "apiCache/refreshUrl",
  async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} → ${res.status}`)
    const data = await res.json()
    return { url, data }
  }
)

const apiCacheSlice = createSlice({
  name: "apiCache",
  initialState,
  reducers: {
    // Remove all cached entries whose URL starts with the given prefix,
    // e.g. invalidate("/api/customers") after adding a customer.
    invalidate(state, action: PayloadAction<string>) {
      for (const key of Object.keys(state.entries)) {
        if (key.startsWith(action.payload)) delete state.entries[key]
      }
    },
    clearCache(state) {
      state.entries = {}
    },
  },
  extraReducers: (builder) => {
    builder.addCase(refreshUrl.fulfilled, (state, action) => {
      state.entries[action.payload.url] = {
        data: action.payload.data,
        fetchedAt: Date.now(),
      }
    })
  },
})

export const { invalidate, clearCache } = apiCacheSlice.actions
export default apiCacheSlice.reducer
