import { currentUserId } from '../session'

// 로그인한 사용자 ID를 `X-User-Id`로 보낸다. 서버가 그 사용자의 매장·역할로 권한을 판단한다
// (사장님만: 발주 승인·전달·취소, 검수 승인·반려·종료, 변경 이력 / 직원만: 확정 취소, 재검수).
async function send(path: string, init?: RequestInit) {
  const userId = currentUserId()
  if (!userId) throw new Error('로그인이 필요해요')
  const headers = new Headers(init?.headers)
  headers.set('X-User-Id', userId)
  if (init?.body && !(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json')
  return fetch(`/api${path}`, { ...init, headers, cache: 'no-store' })
}

// 오류 응답 형식 {"error": {"code", "message"}}의 code를 함께 넘겨 화면이 원인별로 처리하게 한다.
export class RequestError extends Error {
  status: number
  code: string | undefined
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'RequestError'
    this.status = status
    this.code = code
  }
}

async function failure(response: Response) {
  const body = await response.json().catch(() => null)
  return new RequestError(
    body?.error?.message ??
      (typeof body?.detail === 'string'
        ? body.detail
        : `요청을 처리하지 못했어요 (${response.status})`),
    response.status,
    typeof body?.error?.code === 'string' ? body.error.code : undefined,
  )
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init)
  if (!response.ok) throw await failure(response)
  if (response.status === 204) return null as T
  return (await response.json().catch(() => null)) as T
}

// 사진 원본처럼 JSON이 아닌 응답. 사용자 헤더가 필요해 <img src>로 바로 쓸 수 없다.
export async function requestBlob(path: string, init?: RequestInit) {
  const response = await send(path, init)
  if (!response.ok) throw await failure(response)
  return response.blob()
}
