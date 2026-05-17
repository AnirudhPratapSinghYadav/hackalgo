import { useEffect, useState } from 'react'
import { useScrollFade } from './useScrollFade'

type Props = {
  src: string
  className?: string
  aspectClass?: string
  label?: string
  priority?: boolean
  caption?: string
}

export default function DocumentaryImage({
  src,
  className = '',
  aspectClass = 'aspect-[4/3]',
  label = 'Documentary photograph',
  priority = false,
  caption,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const { ref, visible } = useScrollFade(0.06, priority)

  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [src])

  return (
    <figure className={className}>
      <div
        ref={ref}
        className={`${priority ? '' : `scroll-fade ${visible ? 'scroll-fade-visible' : ''}`} photo-frame relative overflow-hidden bg-humanitarian-ink ${aspectClass}`}
      >
        {!error && (
          <img
            src={src}
            alt={label}
            className={`absolute inset-0 h-full w-full object-cover photo-treatment transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
        {(!loaded || error) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-humanitarian-ink">
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-humanitarian-red">
              {error ? '[IMAGE UNAVAILABLE]' : '[DOCUMENTARY PHOTOGRAPH]'}
            </span>
          </div>
        )}
      </div>
      {caption ? (
        <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-report text-humanitarian-red">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
