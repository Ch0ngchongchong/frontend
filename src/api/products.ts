// 상품 API 호출 (API.md 항목 1 `POST /products`, 항목 1-2 `GET /products` / US-08 / F-01)
// 필드 이름은 DATA-MODEL.md 상품 모델 그대로 쓴다.

// vite.config.js의 프록시가 /api를 백엔드로 넘긴다.
// 배포용 백엔드 주소 환경변수 이름은 아직 미정이다 (.env.example).
const API_BASE_URL = '/api'

// API.md 공통 규칙 [제안]: 로그인 방식이 정해질 때까지 X-User-Id 헤더에 시드 사용자 ID를 넣는다.
// 1 = DATA-MODEL.md 시드 #1 (가) store_id=1, 사장님
const CURRENT_USER_ID = '1'

export type Product = {
  id: number
  store_id: number
  product_code: string
  name: string | null
  spec: string | null
  base_unit: string | null
  pack_unit: string | null
  conversion_qty: number | null
  base_unit_price: number | null
}

// store_id는 보내지 않는다. 서버가 로그인한 사용자의 매장으로 정한다 (API.md 항목 1).
export type ProductInput = Omit<Product, 'id' | 'store_id'>

// API.md 항목 1 실패 응답 코드. 그 밖의 실패는 UNKNOWN_ERROR로 묶는다.
export type ProductErrorCode =
  | 'DUPLICATE_PRODUCT_CODE'
  | 'REQUIRED_FIELD_MISSING'
  | 'INVALID_CONVERSION_QTY'
  | 'UNKNOWN_ERROR'

export class ApiError extends Error {
  code: ProductErrorCode

  constructor(code: ProductErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': CURRENT_USER_ID,
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('UNKNOWN_ERROR', '서버에 연결할 수 없어요')
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    // API.md 공통 규칙 오류 응답 형식: {"error": {"code", "message"}}
    if (body?.error?.code) {
      throw new ApiError(body.error.code, body.error.message)
    }
    // 502·503·504: 개발 프록시가 백엔드에 닿지 못한 경우
    if (response.status >= 502 && response.status <= 504) {
      throw new ApiError(
        'UNKNOWN_ERROR',
        '서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해 주세요',
      )
    }
    throw new ApiError(
      'UNKNOWN_ERROR',
      `요청을 처리하지 못했어요 (${response.status})`,
    )
  }

  return body as T
}

export function fetchProducts(): Promise<Product[]> {
  return request<Product[]>('/products')
}

export function createProduct(input: ProductInput): Promise<Product> {
  return request<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
