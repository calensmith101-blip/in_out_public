type FirebaseLookupResponse = {
  users?: Array<{ localId: string; email?: string }>
  error?: { message?: string }
}

export async function verifyFirebaseIdToken(idToken: string) {
  if (!idToken) throw new Error('Missing Firebase ID token')
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY')

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const json = (await res.json()) as FirebaseLookupResponse
  if (!res.ok || !json.users?.[0]?.localId) {
    throw new Error(json.error?.message || 'Could not verify Firebase user')
  }
  return { uid: json.users[0].localId, email: json.users[0].email || '' }
}
