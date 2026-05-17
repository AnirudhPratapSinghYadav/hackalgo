import type { ElementType, ReactNode } from 'react'
import { useScrollFade } from './useScrollFade'

export default function FadeSection({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  const { ref, visible } = useScrollFade(0.08)
  return (
    <Tag
      ref={ref}
      className={`scroll-fade ${visible ? 'scroll-fade-visible' : ''} ${className}`}
    >
      {children}
    </Tag>
  )
}
