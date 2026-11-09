import { useState, type FormEvent } from 'react'
import {
  ApiError,
  createProduct,
  type Product,
  type ProductInput,
} from '../api/products.ts'

// 상품 등록 폼 (US-08 / F-01)
// 수정은 first-feature.md 2절 #2가 '오늘 만들지 않음'이고 API.md에도 항목이 없어 만들지 않는다.

type FieldName = keyof ProductInput

type FormValues = Record<FieldName, string>

const EMPTY_VALUES: FormValues = {
  product_code: '',
  name: '',
  spec: '',
  base_unit: '',
  pack_unit: '',
  conversion_qty: '',
  base_unit_price: '',
}

const FIELDS: {
  name: FieldName
  label: string
  placeholder: string
  numeric?: boolean
  required?: boolean
}[] = [
  {
    name: 'product_code',
    label: '상품 코드',
    placeholder: 'P-0123',
    required: true,
  },
  { name: 'name', label: '상품명', placeholder: '서울우유 1000ml' },
  { name: 'spec', label: '규격', placeholder: '1L' },
  { name: 'base_unit', label: '기준 재고 단위', placeholder: '개' },
  { name: 'pack_unit', label: '포장 단위', placeholder: '박스' },
  {
    name: 'conversion_qty',
    label: '환산값 (포장 1개당 기준 단위 수)',
    placeholder: '10',
    numeric: true,
  },
  {
    name: 'base_unit_price',
    label: '기준 단가 (원)',
    placeholder: '2650',
    numeric: true,
  },
]

type FieldErrors = Partial<Record<FieldName, string>>

// 화면에서 먼저 막는 것: 확정된 필수값(product_code)과 환산값 0 이하 (US-08 실패·거절).
// 나머지 필드가 필수인지는 미정이라 서버 응답에 맡긴다 (DATA-MODEL.md 미정 표).
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.product_code.trim()) {
    errors.product_code = '상품 코드를 입력해 주세요'
  }
  if (values.conversion_qty !== '' && Number(values.conversion_qty) <= 0) {
    errors.conversion_qty = '환산값은 0보다 커야 합니다'
  }
  return errors
}

function toNumberOrNull(value: string): number | null {
  return value === '' ? null : Number(value)
}

function toTextOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function toInput(values: FormValues): ProductInput {
  return {
    product_code: values.product_code.trim(),
    name: toTextOrNull(values.name),
    spec: toTextOrNull(values.spec),
    base_unit: toTextOrNull(values.base_unit),
    pack_unit: toTextOrNull(values.pack_unit),
    conversion_qty: toNumberOrNull(values.conversion_qty),
    base_unit_price: toNumberOrNull(values.base_unit_price),
  }
}

type ProductFormProps = {
  onSubmitStart: () => void
  onCreated: (product: Product) => void
}

function ProductForm({ onSubmitStart, onCreated }: ProductFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(name: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    onSubmitStart()

    const errors = validate(values)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const product = await createProduct(toInput(values))
      setValues(EMPTY_VALUES)
      onCreated(product)
    } catch (error) {
      // 저장되지 않았을 때는 입력값을 그대로 두고 원인을 칸 아래나 폼 위에 보여 준다
      if (
        error instanceof ApiError &&
        error.code === 'DUPLICATE_PRODUCT_CODE'
      ) {
        setFieldErrors({ product_code: error.message })
      } else if (
        error instanceof ApiError &&
        error.code === 'INVALID_CONVERSION_QTY'
      ) {
        setFieldErrors({ conversion_qty: error.message })
      } else {
        setFormError(
          error instanceof Error ? error.message : '저장하지 못했어요',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="banner banner-danger" role="alert">
          {formError}
        </p>
      )}

      <div className="field-grid">
        {FIELDS.map((field) => {
          const id = `product-${field.name}`
          const error = fieldErrors[field.name]
          return (
            <div className="field" key={field.name}>
              <label htmlFor={id}>
                {field.label}
                {field.required && <span className="required"> (필수)</span>}
              </label>
              <input
                id={id}
                name={field.name}
                type={field.numeric ? 'number' : 'text'}
                inputMode={field.numeric ? 'numeric' : undefined}
                step={field.numeric ? 1 : undefined}
                placeholder={field.placeholder}
                value={values[field.name]}
                onChange={(event) =>
                  handleChange(field.name, event.target.value)
                }
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className={error ? 'input-error' : undefined}
              />
              {error && (
                <p id={`${id}-error`} className="field-error">
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <button type="submit" className="button-primary" disabled={submitting}>
        {submitting ? '저장하는 중…' : '저장'}
      </button>
    </form>
  )
}

export default ProductForm
