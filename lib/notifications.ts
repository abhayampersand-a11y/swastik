import { PoolClient } from "pg"
import { pool } from "./db"

export interface NotifyInput {
  type: string
  title: string
  message?: string
  reference_id?: number | string | null
  reference_type?: string | null
}

// Insert a notification row. Pass a transaction `client` to make the
// notification part of an ongoing transaction (e.g. booking confirm);
// otherwise it runs on its own connection from the pool.
export async function notify(input: NotifyInput, client?: PoolClient) {
  const runner = client ?? pool
  await runner.query(
    `INSERT INTO notifications (type, title, message, reference_id, reference_type)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      input.type,
      input.title,
      input.message ?? null,
      input.reference_id ?? null,
      input.reference_type ?? null,
    ]
  )
}
