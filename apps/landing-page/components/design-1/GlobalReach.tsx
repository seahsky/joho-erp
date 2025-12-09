'use client'

import { ScrollReveal } from '../shared/ScrollReveal'
import { motion } from 'motion/react'
import { useCountUp } from '@/hooks/useScrollReveal'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const stats = [
  { value: 40, suffix: '+', label: 'Countries Served' },
  { value: 500, suffix: '+', label: 'Partner Businesses' },
  { value: 15000, suffix: '', label: 'Tons Shipped Annually' },
  { value: 99, suffix: '%', label: 'On-Time Delivery' },
]

const regions = [
  'Asia Pacific',
  'Middle East',
  'Europe',
  'North America',
  'South America',
  'Africa',
]

export function EditorialGlobalReach() {
  const [statsRef, isStatsVisible] = useScrollReveal({ threshold: 0.3 })

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1920&q=80)',
        }}
      >
        <div className="absolute inset-0 bg-editorial-charcoal/85" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="text-center mb-20">
          <span className="font-dm text-sm tracking-[0.3em] uppercase text-editorial-gold">
            Global Presence
          </span>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-semibold text-white mt-4">
            Delivering <span className="italic text-editorial-gold">Worldwide</span>
          </h2>
          <p className="font-dm text-lg text-white/70 mt-6 max-w-2xl mx-auto">
            From our facilities to your kitchen, we&apos;ve built a logistics network
            that spans the globe while maintaining the highest standards.
          </p>
        </ScrollReveal>

        {/* Stats grid */}
        <div ref={statsRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.1}>
              <motion.div
                className="text-center p-8 border border-white/10 bg-white/5 backdrop-blur-sm"
                whileHover={{ borderColor: 'rgba(184, 134, 11, 0.5)' }}
              >
                <StatNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  isVisible={isStatsVisible}
                />
                <p className="font-dm text-sm tracking-wider uppercase text-white/60 mt-2">
                  {stat.label}
                </p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        {/* Regions */}
        <ScrollReveal className="text-center">
          <p className="font-dm text-sm tracking-wider uppercase text-editorial-gold mb-8">
            Regions We Serve
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {regions.map((region, index) => (
              <motion.span
                key={region}
                className="px-6 py-3 border border-white/20 font-cormorant text-xl text-white hover:border-editorial-gold hover:text-editorial-gold transition-colors cursor-default"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                {region}
              </motion.span>
            ))}
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal className="text-center mt-16">
          <p className="font-dm text-white/70 mb-6">
            Don&apos;t see your region? Contact us — we&apos;re always expanding.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-3 bg-editorial-gold text-editorial-charcoal px-8 py-4 font-dm text-sm tracking-wide hover:bg-white transition-colors"
          >
            Get in Touch
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}

function StatNumber({ value, suffix, isVisible }: { value: number; suffix: string; isVisible: boolean }) {
  const count = useCountUp(value, 2000, isVisible)

  return (
    <p className="font-cormorant text-5xl lg:text-6xl font-semibold text-white">
      {count.toLocaleString()}{suffix}
    </p>
  )
}
