import { hashKey, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import {
  doc, onSnapshot, type DocumentReference, type Query, type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'

export interface WithId<T> {
  id: string
  /** id of the parent doc, e.g. the listId of a claim read through a collection group */
  parentId?: string
  data: T
}

const subscriptions = new Map<string, Unsubscribe>()
const watched = new WeakSet<QueryClient>()

/** Unsubscribe when React Query drops a live query from its cache (gc or queryClient.clear()). */
const cleanupOnRemoval = (qc: QueryClient) => {
  if (watched.has(qc)) return
  watched.add(qc)
  qc.getQueryCache().subscribe((event) => {
    if (event.type !== 'removed') return
    subscriptions.get(event.query.queryHash)?.()
    subscriptions.delete(event.query.queryHash)
  })
}

/**
 * Realtime Firestore read as a React Query query.
 * The queryFn resolves with the first snapshot; later snapshots are pushed with setQueryData.
 */
export function useLive<T>(key: QueryKey, source: (() => Query | DocumentReference) | null, map: (snap: never) => T) {
  const qc = useQueryClient()
  cleanupOnRemoval(qc)
  return useQuery<T>({
    queryKey: key,
    enabled: !!source,
    staleTime: Infinity,
    gcTime: 60_000,
    retry: false,
    queryFn: ({ queryKey, client }) => new Promise<T>((resolve, reject) => {
      const hash = hashKey(queryKey)
      subscriptions.get(hash)?.()
      let first = true
      const unsub = onSnapshot(
        source!() as Query,
        (snap) => {
          const value = map(snap as never)
          if (first) {
            first = false
            resolve(value)
          } else {
            client.setQueryData(queryKey, value)
          }
        },
        (err) => {
          if (first) {
            first = false
            reject(err)
          }
        },
      )
      subscriptions.set(hash, unsub)
    }),
  })
}

type DataOpts = { serverTimestamps: 'estimate' }
type QuerySnap = { docs: { id: string; ref: { parent: { parent: { id: string } | null } }; data: (o: DataOpts) => unknown }[] }
type DocSnap = { exists: () => boolean; data: (o: DataOpts) => unknown }

// Pending serverTimestamp() writes read as null by default, which would e.g. make a just-saved
// ageConfirmedAt look missing to the route guard. Estimate them from the local clock instead.
const opts: DataOpts = { serverTimestamps: 'estimate' }

export const mapDocs = <T,>(snap: QuerySnap): WithId<T>[] =>
  snap.docs.map((d) => ({ id: d.id, parentId: d.ref.parent.parent?.id, data: d.data(opts) as T }))

export const mapDoc = <T,>(snap: DocSnap): T | null => (snap.exists() ? (snap.data(opts) as T) : null)

export function useLiveDocs<T>(key: QueryKey, source: (() => Query) | null) {
  return useLive<WithId<T>[]>(key, source, mapDocs as never)
}

export function useLiveDoc<T>(key: QueryKey, path: string | null) {
  return useLive<T | null>(key, path ? () => doc(db, path) : null, mapDoc as never)
}
