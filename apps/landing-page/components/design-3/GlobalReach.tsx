'use client'

import { ScrollReveal } from '../shared/ScrollReveal'
import { motion } from 'motion/react'
import { useCountUp, useScrollReveal } from '@/hooks/useScrollReveal'

const stats = [
  { value: 40, suffix: '+', label: 'Countries', icon: '🌍' },
  { value: 500, suffix: '+', label: 'Partners', icon: '🤝' },
  { value: 15000, suffix: '', label: 'Tons Annually', icon: '📦' },
  { value: 99, suffix: '%', label: 'On-Time Delivery', icon: '⏰' },
]

const regions = [
  { name: 'Asia Pacific', flag: '🌏' },
  { name: 'Middle East', flag: '🕌' },
  { name: 'Europe', flag: '🇪🇺' },
  { name: 'North America', flag: '🌎' },
  { name: 'South America', flag: '🌎' },
  { name: 'Africa', flag: '🌍' },
]

export function OrganicGlobalReach() {
  const [statsRef, isStatsVisible] = useScrollReveal({ threshold: 0.3 })

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background with nature image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1920&q=80)',
        }}
      >
        <div className="absolute inset-0 bg-organic-earth/80" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <span className="inline-flex items-center gap-2 font-nunito text-sm text-organic-wheat bg-white/10 px-4 py-2 rounded-full mb-4">
            <span>🌐</span> Global Reach
          </span>
          <h2 className="font-fraunces text-4xl lg:text-5xl font-semibold text-white">
            Connecting Farms to <span className="text-organic-wheat italic">Kitchens</span>
          </h2>
          <p className="font-nunito text-lg text-white/70 mt-4 max-w-2xl mx-auto">
            From our facilities to your kitchen, anywhere in the world.
          </p>
        </ScrollReveal>

        {/* Stats grid */}
        <div ref={statsRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.1}>
              <motion.div
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center"
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <span className="text-3xl mb-2 block">{stat.icon}</span>
                <StatNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  isVisible={isStatsVisible}
                />
                <p className="font-nunito text-sm text-white/70 mt-1">
                  {stat.label}
                </p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        {/* Regions */}
        <ScrollReveal className="text-center">
          <p className="font-nunito text-sm text-organic-wheat mb-6">
            Proudly serving partners in
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {regions.map((region, index) => (
              <motion.span
                key={region.name}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-full font-nunito text-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <span>{region.flag}</span>
                {region.name}
              </motion.span>
            ))}
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal className="text-center mt-12">
          <p className="font-nunito text-white/70 mb-4">
            Don&apos;t see your region? Let&apos;s talk!
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-3 bg-organic-wheat text-organic-earth px-8 py-4 rounded-full font-nunito font-semibold hover:bg-white transition-colors"
          >
            Contact Us
            <span>💬</span>
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}

function StatNumber({ value, suffix, isVisible }: { value: number; suffix: string; isVisible: boolean }) {
  const count = useCountUp(value, 2000, isVisible)

  return (
    <p className="font-fraunces text-4xl lg:text-5xl text-white font-semibold">
      {count.toLocaleString()}{suffix}
    </p>
  )
}
