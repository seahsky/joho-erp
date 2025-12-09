'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import Image from 'next/image'
import { useRef } from 'react'

interface ParallaxImageProps {
  src: string
  alt: string
  className?: string
  speed?: number
  overlay?: boolean
  overlayColor?: string
}

export function ParallaxImage({
  src,
  alt,
  className = '',
  speed = 0.3,
  overlay = false,
  overlayColor = 'rgba(0,0,0,0.3)',
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}%`, `${speed * 100}%`])

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{ y }}
        className="absolute inset-0 w-full h-[130%] -top-[15%]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="100vw"
        />
      </motion.div>
      {overlay && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: overlayColor }}
        />
      )}
    </div>
  )
}

export function ParallaxSection({
  children,
  className = '',
  bgImage,
  bgColor,
  overlay = true,
}: {
  children: React.ReactNode
  className?: string
  bgImage?: string
  bgColor?: string
  overlay?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.6])

  return (
    <section ref={ref} className={`relative overflow-hidden ${className}`}>
      {bgImage && (
        <motion.div
          style={{ y }}
          className="absolute inset-0 w-full h-[120%] -top-[10%]"
        >
          <Image
            src={bgImage}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          {overlay && (
            <div className="absolute inset-0 bg-black/40" />
          )}
        </motion.div>
      )}
      {bgColor && (
        <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
      )}
      <motion.div style={{ opacity }} className="relative z-10">
        {children}
      </motion.div>
    </section>
  )
}
