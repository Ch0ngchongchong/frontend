export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('X-User-Id', '1')
  if (init?.body && !(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json')
  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
  const body =
    response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      body?.error?.message ??
        (typeof body?.detail === 'string'
          ? body.detail
          : `요청을 처리하지 못했어요 (${response.status})`),
    )
  return body as T
}
