import { useEffect, useRef, useState } from 'react'
import { fetchExceptionPhoto, type ExceptionPhoto } from '../api/inspections'

// 예외 사진 한 장. 원본은 사용자 헤더가 필요해 직접 받아 임시 주소(object URL)로 보여 준다.
// HEIC처럼 브라우저가 그리지 못하는 형식은 미리보기 대신 원본 받기 링크만 둔다.
function PhotoThumb({
  inspectionId,
  photo,
}: {
  inspectionId: number
  photo: ExceptionPhoto
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    let cancelled = false
    let created: string | null = null
    fetchExceptionPhoto(inspectionId, photo.id).then(
      (blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setUrl(created)
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [inspectionId, photo.id])

  return (
    <figure>
      {url && !unsupported ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={`예외 사진: ${photo.filename}`}
            onError={() => setUnsupported(true)}
          />
        </a>
      ) : (
        <div className="photo-placeholder" role={failed ? 'alert' : undefined}>
          {failed
            ? '사진을 불러오지 못했어요'
            : url
              ? '미리보기를 지원하지 않는 형식이에요'
              : '불러오는 중…'}
        </div>
      )}
      <figcaption title={photo.filename}>
        {url && unsupported ? (
          <a href={url} download={photo.filename}>
            {photo.filename} 받기
          </a>
        ) : (
          photo.filename
        )}
      </figcaption>
    </figure>
  )
}

// 검수 건에 연결된 예외 사진을 가로로 넘겨 본다.
export function ExceptionPhotoList({
  inspectionId,
  photos,
}: {
  inspectionId: number
  photos: ExceptionPhoto[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const update = () =>
      setEdges({
        left: element.scrollLeft > 1,
        right:
          element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      })
    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => {
      element.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])
  return (
    <div
      className={`review-scroll-wrap${edges.left ? ' fade-left' : ''}${edges.right ? ' fade-right' : ''}`}
    >
      <div className="table-scroll approval-photo-scroll" ref={scrollRef}>
        <div className="approval-photo-list">
          {photos.map((photo) => (
            <PhotoThumb
              key={photo.id}
              inspectionId={inspectionId}
              photo={photo}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
