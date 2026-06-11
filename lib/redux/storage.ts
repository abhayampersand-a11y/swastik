import createWebStorage from "redux-persist/lib/storage/createWebStorage"

// redux-persist needs a storage engine; on the server there is no localStorage,
// so fall back to a no-op engine during SSR.
const createNoopStorage = () => ({
  getItem: async () => null,
  setItem: async (_key: string, value: string) => value,
  removeItem: async () => {},
})

const storage =
  typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage()

export default storage
