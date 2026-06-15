// ── Workspace definitions ──────────────────────────────────────────────────────
// Two permanent workspaces. IDs must match Firestore path segments.

export const WORKSPACES = {
  'my-business': {
    id: 'my-business',
    label: 'My Business',
    sublabel: 'That Property Maintenance Guy',
    color: 'from-red-600 to-amber-500',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-400/30',
    bgColor: 'bg-amber-400/10',
    invoicePrefix: 'INV',
    quotePrefix: 'Q',
    gst: true,
  },
  'petlet': {
    id: 'petlet',
    label: 'PetLet Subcontracting',
    sublabel: 'Pet Let Holiday Homes',
    color: 'from-blue-600 to-cyan-500',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-400/30',
    bgColor: 'bg-cyan-400/10',
    invoicePrefix: 'PL',
    quotePrefix: 'PLQ',
    gst: false,
    billTo: 'Pet Let Holiday Homes',
    billToEmail: 'accounts@petlet.net.au',
  },
} as const

export type WorkspaceId = keyof typeof WORKSPACES
export type Workspace = (typeof WORKSPACES)[WorkspaceId]

export function getWorkspace(id: string): Workspace {
  return WORKSPACES[id as WorkspaceId] ?? WORKSPACES['my-business']
}

export function isValidWorkspace(id: string): id is WorkspaceId {
  return id in WORKSPACES
}

/** users/{uid}/workspaces/{wsId}/jobs/{jobId} */
export function wsJobPath(uid: string, wsId: string, jobId: string) {
  return `users/${uid}/workspaces/${wsId}/jobs/${jobId}`
}

/** users/{uid}/workspaces/{wsId}/jobs/{jobId}/{sub} */
export function wsJobSubPath(uid: string, wsId: string, jobId: string, sub: string) {
  return `users/${uid}/workspaces/${wsId}/jobs/${jobId}/${sub}`
}

/** users/{uid}/workspaces/{wsId}/{collection} */
export function wsCollectionPath(uid: string, wsId: string, col: string) {
  return `users/${uid}/workspaces/${wsId}/${col}`
}
