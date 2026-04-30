import { useEffect, useRef } from 'react'

export function useScrollReveal(options = { threshold: 0.1 }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'scale-100')
          entry.target.classList.remove('opacity-0', 'scale-95')
          observer.unobserve(entry.target)
        }
      })
    }, options)

    observer.observe(el)
    return () => {
      if (el) observer.unobserve(el)
    }
  }, [options.threshold])

  return ref
}
