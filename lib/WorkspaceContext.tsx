'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type WorkspaceId, getWorkspace, type Workspace } from '@/lib/workspaces'

const STORAGE_KEY = 'wj_active_workspace'

interface WorkspaceContextValue {
  wsId: WorkspaceId
  workspace: Workspace
  setWorkspace: (id: WorkspaceId) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  wsId: 'my-business',
  workspace: getWorkspace('my-business'),
  setWorkspace: () => {},
})

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [wsId, setWsId] = useState<WorkspaceId>('my-business')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'petlet') localStorage.setItem(STORAGE_KEY, 'my-business')
    if (stored === 'my-business') setWsId(stored)
  }, [])

  function setWorkspace(id: WorkspaceId) {
    const safeId = id === 'petlet' ? 'my-business' : id
    setWsId(safeId)
    localStorage.setItem(STORAGE_KEY, safeId)
  }

  return (
    <WorkspaceContext.Provider value={{ wsId, workspace: getWorkspace(wsId), setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
