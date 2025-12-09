'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import { motion } from 'motion/react'

const features = [
  {
    code: 'QC_001',
    title: 'QUALITY CONTROL',
    description: 'Multi-stage inspection protocol. Zero tolerance for defects.',
    metric: '99.8%',
    metricLabel: 'PASS RATE',
  },
  {
    code: 'CC_002',
    title: 'COLD CHAIN',
    description: 'End-to-end temperature monitoring. Real-time tracking.',
    metric: '-18°C',
    metricLabel: 'MAINTAINED',
  },
  {
    code: 'CC_003',
    title: 'CUSTOM CUTS',
    description: 'Precision cutting to exact specifications. Any requirement.',
    metric: '100+',
    metricLabel: 'CUT TYPES',
  },
  {
    code: 'DL_004',
    title: 'DELIVERY',
    description: 'Global logistics network. On-time guarantee.',
    metric: '99%',
    metricLabel: 'ON TIME',
  },
  {
    code: 'PR_005',
    title: 'PRICING',
    description: 'Direct sourcing. Competitive wholesale rates.',
    metric: '15%',
    metricLabel: 'AVG SAVINGS',
  },
  {
    code: 'SP_006',
    title: 'SUPPORT',
    description: 'Dedicated account managers. 24/7 availability.',
    metric: '<2H',
    metricLabel: 'RESPONSE',
  },
]

export function IndustrialWhyUs() {
  return (
    <section className="relative py-32 bg-industrial-steel overflow-hidden">
      <div className="absolute inset-0 industrial-grid opacity-50" />

      {/* Accent line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-industrial-red via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-industrial-red" />
            <span className="font-mono text-xs tracking-[0.3em] text-industrial-red">
              {'// CAPABILITIES'}
            </span>
          </div>
          <h2 className="font-bebas text-6xl lg:text-8xl text-industrial-white">
            THE <span className="text-industrial-red">EDGE</span>
          </h2>
          <p className="font-mono text-sm text-industrial-gray mt-4 max-w-xl">
            ENGINEERED FOR EXCELLENCE. EVERY METRIC OPTIMIZED FOR YOUR SUCCESS.
          </p>
        </ScrollReveal>

        {/* Features grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <StaggerItem key={feature.code}>
              <motion.div
                className="group relative bg-industrial-black/50 border border-industrial-gray/20 p-6 hover:border-industrial-red transition-colors duration-300"
                whileHover={{ y: -4 }}
              >
                {/* Code badge */}
                <div className="absolute top-4 right-4 font-mono text-xs text-industrial-gray/50">
                  [{feature.code}]
                </div>

                {/* Metric */}
                <div className="mb-6">
                  <p className="font-bebas text-5xl text-industrial-red">{feature.metric}</p>
                  <p className="font-mono text-xs text-industrial-gray">{feature.metricLabel}</p>
                </div>

                {/* Content */}
                <h3 className="font-bebas text-2xl text-industrial-white mb-2">
                  {feature.title}
                </h3>
                <p className="font-mono text-xs text-industrial-gray leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover indicator */}
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-industrial-red"
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bottom CTA */}
        <ScrollReveal className="mt-16 text-center">
          <a
            href="#contact"
            className="inline-flex items-center gap-3 bg-industrial-red text-industrial-white px-8 py-4 font-mono text-sm tracking-wider hover:bg-industrial-white hover:text-industrial-black transition-colors"
          >
            ACTIVATE_PARTNERSHIP
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
