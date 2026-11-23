// 로그인 구현 전 임시 사용자 ID. 서버는 1을 사장님, 2를 같은 매장 직원으로 둔다.
// 대부분의 요청은 사장님(1)으로 보내고, 서버가 직원만 허용하는 동작(확정 취소·재검수)만 2로 보낸다.
export const OWNER_USER_ID = '1'
export const STAFF_USER_ID = '2'

type RequestOptions = RequestInit & { userId?: string }

async function send(path: string, init?: RequestOptions) {
  const { userId = OWNER_USER_ID, ...rest } = init ?? {}
  const headers = new Headers(rest.headers)
  headers.set('X-User-Id', userId)
  if (rest.body && !(rest.body instanceof FormData))
    headers.set('Content-Type', 'application/json')
  return fetch(`/api${path}`, { ...rest, headers, cache: 'no-store' })
}

async function failure(response: Response) {
  const body = await response.json().catch(() => null)
  return new Error(
    body?.error?.message ??
      (typeof body?.detail === 'string'
        ? body.detail
        : `요청을 처리하지 못했어요 (${response.status})`),
  )
}

export async function request<T>(
  path: string,
  init?: RequestOptions,
): Promise<T> {
  const response = await send(path, init)
  if (!response.ok) throw await failure(response)
  if (response.status === 204) return null as T
  return (await response.json().catch(() => null)) as T
}

// 사진 원본처럼 JSON이 아닌 응답. 사용자 헤더가 필요해 <img src>로 바로 쓸 수 없다.
export async function requestBlob(path: string, init?: RequestOptions) {
  const response = await send(path, init)
  if (!response.ok) throw await failure(response)
  return response.blob()
}
