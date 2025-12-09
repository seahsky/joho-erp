'use client'

import { ScrollReveal } from '../shared/ScrollReveal'
import { motion } from 'framer-motion'
import { useCountUp, useScrollReveal } from '@/hooks/useScrollReveal'

const stats = [
  { value: 40, suffix: '+', label: 'COUNTRIES' },
  { value: 500, suffix: '+', label: 'PARTNERS' },
  { value: 15000, suffix: '', label: 'TONS/YEAR' },
  { value: 99, suffix: '%', label: 'DELIVERY_RATE' },
]

const regions = [
  { name: 'ASIA_PACIFIC', code: 'APAC', status: 'ACTIVE' },
  { name: 'MIDDLE_EAST', code: 'MENA', status: 'ACTIVE' },
  { name: 'EUROPE', code: 'EU', status: 'ACTIVE' },
  { name: 'NORTH_AMERICA', code: 'NA', status: 'ACTIVE' },
  { name: 'SOUTH_AMERICA', code: 'LATAM', status: 'ACTIVE' },
  { name: 'AFRICA', code: 'AFR', status: 'EXPANDING' },
]

export function IndustrialGlobalReach() {
  const [statsRef, isStatsVisible] = useScrollReveal({ threshold: 0.3 })

  return (
    <section className="relative py-32 bg-industrial-black overflow-hidden">
      <div className="absolute inset-0 industrial-grid" />

      {/* Animated scan line */}
      <motion.div
        className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-industrial-red to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-industrial-red" />
            <span className="font-mono text-xs tracking-[0.3em] text-industrial-red">
              {'// GLOBAL_NETWORK'}
            </span>
          </div>
          <h2 className="font-bebas text-6xl lg:text-8xl text-industrial-white">
            WORLD<span className="text-industrial-red">WIDE</span>
          </h2>
        </ScrollReveal>

        {/* Stats grid */}
        <div ref={statsRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.1}>
              <motion.div
                className="bg-industrial-steel/30 border border-industrial-gray/20 p-6 text-center"
                whileHover={{ borderColor: 'rgba(220, 38, 38, 0.5)' }}
              >
                <StatNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  isVisible={isStatsVisible}
                />
                <p className="font-mono text-xs text-industrial-gray mt-2">
                  {stat.label}
                </p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        {/* Regions grid */}
        <ScrollReveal className="mb-16">
          <p className="font-mono text-xs text-industrial-red mb-6">{'// ACTIVE_REGIONS:'}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {regions.map((region, index) => (
              <motion.div
                key={region.code}
                className="flex items-center justify-between bg-industrial-steel/20 border border-industrial-gray/10 px-4 py-3"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ borderColor: 'rgba(220, 38, 38, 0.3)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-industrial-gray">[{region.code}]</span>
                  <span className="font-bebas text-lg text-industrial-white">{region.name}</span>
                </div>
                <span className={`font-mono text-xs ${
                  region.status === 'ACTIVE' ? 'text-green-500' : 'text-yellow-500'
                }`}>
                  ● {region.status}
                </span>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>

        {/* Terminal-style output */}
        <ScrollReveal>
          <div className="bg-industrial-steel/30 border border-industrial-gray/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-industrial-red" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-mono text-xs text-industrial-gray ml-2">SYSTEM_STATUS</span>
            </div>
            <div className="font-mono text-sm text-industrial-gray space-y-1">
              <p><span className="text-green-500">✓</span> LOGISTICS_NETWORK: OPERATIONAL</p>
              <p><span className="text-green-500">✓</span> COLD_CHAIN: VERIFIED</p>
              <p><span className="text-green-500">✓</span> CUSTOMS_CLEARANCE: PRE-APPROVED</p>
              <p><span className="text-green-500">✓</span> PARTNER_API: CONNECTED</p>
              <p className="pt-2 text-industrial-white">
                <span className="text-industrial-red">&gt;</span> READY_FOR_NEW_PARTNERS_
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  █
                </motion.span>
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function StatNumber({ value, suffix, isVisible }: { value: number; suffix: string; isVisible: boolean }) {
  const count = useCountUp(value, 2000, isVisible)

  return (
    <p className="font-bebas text-5xl lg:text-6xl text-industrial-white">
      {count.toLocaleString()}<span className="text-industrial-red">{suffix}</span>
    </p>
  )
}
