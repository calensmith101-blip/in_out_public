/**
 * Look up jobs by job number and return enough client/site details to autofill
 * quotes, invoices, materials, labour, vehicle and expense records.
 *
 * Supports both current storage shapes used by the app:
 * - users/{uid}/workspaces/{workspaceId}/jobs
 * - users/{uid}/jobs  (older/general jobs)
 */
import { db } from '@/lib/firebase/client'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { userCollectionPath } from '@/lib/firebase/client'
import { wsCollectionPath } from '@/lib/workspaces'

export interface JobSummary {
  id: string
  jobNumber?: string
  jobTitle?: string
  title?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  siteAddress?: string
  address?: string
  jobDescription?: string
  description?: string
  petletProperty?: string
  workspaceId?: string
  sourcePath?: 'workspace' | 'flat'
}

function cleanJobNumber(value: string) {
  return value.trim().toUpperCase()
}

function normalizeJob(id: string, data: any, sourcePath: 'workspace' | 'flat', wsId?: string): JobSummary {
  return {
    id,
    ...data,
    workspaceId: data.workspaceId || wsId || 'my-business',
    sourcePath,
    jobTitle: data.jobTitle || data.title || '',
    customerName: data.customerName || data.clientName || '',
    customerPhone: data.customerPhone || data.clientPhone || data.phone || '',
    customerEmail: data.customerEmail || data.clientEmail || data.email || '',
    siteAddress: data.siteAddress || data.address || '',
    jobDescription: data.jobDescription || data.description || '',
  }
}

async function findInPath(path: string, jobNumber: string, sourcePath: 'workspace' | 'flat', wsId?: string) {
  const ref = collection(db, path)
  const exact = await getDocs(query(ref, where('jobNumber', '==', jobNumber)))
  if (!exact.empty) {
    const d = exact.docs[0]
    return normalizeJob(d.id, d.data(), sourcePath, wsId)
  }

  // Compatibility for existing lowercase/manual numbers.
  const loose = await getDocs(ref)
  const found = loose.docs.find(d => cleanJobNumber(String(d.data().jobNumber || '')) === jobNumber)
  return found ? normalizeJob(found.id, found.data(), sourcePath, wsId) : null
}

export async function findJobByNumber(
  uid: string,
  wsId: string,
  jobNumber: string
): Promise<JobSummary | null> {
  const needle = cleanJobNumber(jobNumber)
  if (!needle) return null

  const workspaceMatch = await findInPath(wsCollectionPath(uid, wsId, 'jobs'), needle, 'workspace', wsId).catch(() => null)
  if (workspaceMatch) return workspaceMatch

  const flatMatch = await findInPath(userCollectionPath(uid, 'jobs'), needle, 'flat', wsId).catch(() => null)
  if (flatMatch) return flatMatch

  return null
}

/** Search jobs for dropdowns. Merges workspace + older flat jobs without duplicates. */
export async function listJobs(uid: string, wsId: string): Promise<JobSummary[]> {
  const rows: JobSummary[] = []

  try {
    const snap = await getDocs(collection(db, wsCollectionPath(uid, wsId, 'jobs')))
    rows.push(...snap.docs.map(d => normalizeJob(d.id, d.data(), 'workspace', wsId)))
  } catch {}

  try {
    const snap = await getDocs(collection(db, userCollectionPath(uid, 'jobs')))
    rows.push(...snap.docs.map(d => normalizeJob(d.id, d.data(), 'flat', d.data().workspaceId || wsId)))
  } catch {}

  const seen = new Set<string>()
  return rows.filter(j => {
    const key = `${j.workspaceId || wsId}:${cleanJobNumber(j.jobNumber || '') || j.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => String(b.jobNumber || '').localeCompare(String(a.jobNumber || '')))
}
