import type { HistoryEntryRaw } from './api/inspections'

// 판독 정확도 (US-07 인수 조건, 03 3-4 측정과 기록).
// 서버가 지표를 따로 보내지 않아서 변경 이력으로 화면에서 계산한다. 이력은 시간순으로 온다.
// - `업로드`(field `document`): 명세서를 올린 시각. 다시 올리면 그 뒤 판독부터 새로 센다
// - `판독`(field `line N`): 판독 줄마다 한 건. 판독 줄 수가 된다
// - `줄 수정`(field `line N 칸이름`): 직원이 줄의 한 칸을 바꿀 때마다 한 건 (이전·새 값)
// - `직원 줄 추가`(field `line N`): 판독에 없어 직원이 추가한 줄. 정확도에서는 빼고 행 누락에 센다.
//   서버에 아직 없어 README의 가정한 계약을 따른다
// - field `status`: `확정`이면 확정 시각, `직원 확인 대기`로 돌아가면(확정 취소·재검수) 확정 전으로 본다
//
// 칸이 맞았는지는 그 칸의 첫 `줄 수정` 이전 값(= 판독이 채운 값)과 마지막 새 값을 비교한다.
// 고쳤다가 되돌린 칸은 맞은 것으로 본다. 직원은 품목·수량·단위만 고칠 수 있어서(PATCH 본문)
// 단가·금액은 판독값이 틀려도 이력에 남지 않으므로 재지 않는다.

export type AccuracyField = 'product_id' | 'quantity' | 'unit'

export const ACCURACY_FIELDS: { key: AccuracyField; label: string }[] = [
  { key: 'product_id', label: '품목' },
  { key: 'quantity', label: '수량' },
  { key: 'unit', label: '단위' },
]

// 직원이 고칠 수 없어 재지 않는 칸
export const UNMEASURED_FIELDS = ['단가', '금액']

// 직원이 고친 줄 비율 목표 (topic-selection 4-4 ③)
export const FIXED_LINE_TARGET = 0.1

const STAFF_REVIEW = '직원 확인 대기'

export type FieldAccuracy = {
  key: AccuracyField
  label: string
  correct: number
  ratio: number
}

export type ReadingAccuracy = {
  readLines: number
  addedLines: number
  fields: FieldAccuracy[]
  fixedLines: number
  fixedRatio: number
  missingRatio: number
  uploadedAt: string | null
  // 마지막 확정 시각. 확정 전이거나 확정이 취소됐으면 null
  confirmedAt: string | null
  elapsedSeconds: number | null
}

function isAccuracyField(key: string): key is AccuracyField {
  return ACCURACY_FIELDS.some((field) => field.key === key)
}

// `line 3` → 3
function lineNoOf(field: string | null) {
  const match = /^line (\d+)$/.exec(field ?? '')
  return match ? Number(match[1]) : null
}

// 판독 원본 기록이 없으면(판독 전이거나 판독에 실패한 건) null
export function computeReadingAccuracy(
  history: HistoryEntryRaw[],
): ReadingAccuracy | null {
  let uploadedAt: string | null = null
  let confirmedAt: string | null = null
  let readLineNos = new Set<number>()
  let addedLineNos = new Set<number>()
  // `${line_no}:${칸}` → 판독이 채운 값과 마지막 값
  let edits = new Map<
    string,
    { lineNo: number; first: string | null; last: string | null }
  >()

  for (const entry of history) {
    if (entry.action === '업로드' && entry.field === 'document') {
      uploadedAt = entry.changed_at
      readLineNos = new Set()
      addedLineNos = new Set()
      edits = new Map()
    } else if (entry.field === 'status') {
      if (entry.action === '확정') confirmedAt = entry.changed_at
      else if (entry.new_value === STAFF_REVIEW) confirmedAt = null
    } else if (entry.action === '판독') {
      const no = lineNoOf(entry.field)
      if (no !== null) readLineNos.add(no)
    } else if (entry.action === '직원 줄 추가') {
      const no = lineNoOf(entry.field)
      if (no !== null) addedLineNos.add(no)
    } else if (entry.action === '줄 수정') {
      const match = /^line (\d+) (\w+)$/.exec(entry.field ?? '')
      if (!match || !isAccuracyField(match[2])) continue
      const lineNo = Number(match[1])
      const key = `${lineNo}:${match[2]}`
      const seen = edits.get(key)
      if (seen) seen.last = entry.new_value
      else
        edits.set(key, {
          lineNo,
          first: entry.old_value,
          last: entry.new_value,
        })
    }
  }

  for (const no of addedLineNos) readLineNos.delete(no)
  const readLines = readLineNos.size
  if (readLines === 0) return null

  const wrong = new Map<AccuracyField, number>()
  const fixedLineNos = new Set<number>()
  for (const [key, edit] of edits) {
    if (!readLineNos.has(edit.lineNo) || edit.first === edit.last) continue
    const field = key.split(':')[1] as AccuracyField
    wrong.set(field, (wrong.get(field) ?? 0) + 1)
    fixedLineNos.add(edit.lineNo)
  }

  const fields = ACCURACY_FIELDS.map(({ key, label }) => {
    const correct = Math.max(0, readLines - (wrong.get(key) ?? 0))
    return { key, label, correct, ratio: correct / readLines }
  })
  const addedLines = addedLineNos.size

  const start = uploadedAt ? new Date(uploadedAt).getTime() : NaN
  const end = confirmedAt ? new Date(confirmedAt).getTime() : NaN
  const elapsed = (end - start) / 1000

  return {
    readLines,
    addedLines,
    fields,
    fixedLines: fixedLineNos.size,
    fixedRatio: fixedLineNos.size / readLines,
    missingRatio: addedLines / (readLines + addedLines),
    uploadedAt,
    confirmedAt,
    elapsedSeconds: Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null,
  }
}
