import crypto from 'crypto'

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id: string
  token_uri?: string
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON')
  const parsed = JSON.parse(raw) as ServiceAccount
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON')
  parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
  return parsed
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.accessToken

  const sa = getServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${claim}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key)
  const assertion = `${unsigned}.${base64url(signature)}`

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  const json = await res.json() as any
  if (!res.ok || !json.access_token) throw new Error(json.error_description || json.error || 'Could not get Firebase service account token')
  cachedToken = { accessToken: json.access_token, expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000 }
  return cachedToken.accessToken
}

function encodeValue(value: any): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  return { stringValue: String(value) }
}

function decodeValue(value: any): any {
  if (!value) return undefined
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return Boolean(value.booleanValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  return undefined
}

function encodeFields(data: Record<string, any>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]))
}

function decodeFields(fields: Record<string, any> | undefined) {
  if (!fields) return null
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

function documentUrl(path: string) {
  const sa = getServiceAccount()
  const clean = path.split('/').map(encodeURIComponent).join('/')
  return `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/${clean}`
}

export async function setFirestoreDocument(path: string, data: Record<string, any>) {
  const token = await getAccessToken()
  const res = await fetch(documentUrl(path), {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields({ ...data, updatedAt: new Date().toISOString() }) }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message || 'Firestore write failed')
  return json
}

export async function getFirestoreDocument(path: string) {
  const token = await getAccessToken()
  const res = await fetch(documentUrl(path), { headers: { authorization: `Bearer ${token}` } })
  if (res.status === 404) return null
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error?.message || 'Firestore read failed')
  return decodeFields(json.fields)
}
