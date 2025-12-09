'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import { motion } from 'motion/react'
import Image from 'next/image'

export function IndustrialAbout() {
  return (
    <section id="about" className="relative py-32 bg-industrial-steel overflow-hidden">
      <div className="absolute inset-0 industrial-grid opacity-50" />

      {/* Accent lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-industrial-red via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="mb-20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-industrial-red" />
            <span className="font-mono text-xs tracking-[0.3em] text-industrial-red">
              {'// ABOUT_US'}
            </span>
          </div>
          <h2 className="font-bebas text-6xl lg:text-8xl text-industrial-white">
            THE <span className="text-industrial-red">SYSTEM</span>
          </h2>
        </ScrollReveal>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Left image */}
          <ScrollReveal direction="left" className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-2 border border-industrial-gray/30" />
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80"
                  alt="Industrial meat processing"
                  fill
                  className="object-cover grayscale"
                />
                <div className="absolute inset-0 bg-industrial-red/10 mix-blend-overlay" />
              </div>
              {/* Data overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-industrial-black/90 backdrop-blur p-4">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-industrial-gray">EST.</span>
                  <span className="text-industrial-white">2010</span>
                </div>
                <div className="flex justify-between font-mono text-xs mt-1">
                  <span className="text-industrial-gray">STATUS</span>
                  <span className="text-green-500">OPERATIONAL</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right content */}
          <div className="lg:col-span-7 space-y-8">
            <ScrollReveal delay={0.2}>
              <p className="font-bebas text-3xl lg:text-4xl text-industrial-white leading-tight">
                BUILT FOR <span className="text-industrial-red">PRECISION</span>.
                <br />
                DESIGNED FOR <span className="text-industrial-red">SCALE</span>.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <p className="font-mono text-sm text-industrial-gray leading-relaxed">
                Jimmy Beef operates a vertically integrated supply chain that ensures
                quality control from source to delivery. Our systems are designed for
                reliability, traceability, and efficiency — the cornerstones of modern
                food service operations.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <p className="font-mono text-sm text-industrial-gray leading-relaxed">
                We work with certified farms, maintain strict cold chain protocols,
                and leverage technology to provide our partners with real-time visibility
                into their orders.
              </p>
            </ScrollReveal>

            {/* Tech specs grid */}
            <StaggerContainer className="grid sm:grid-cols-3 gap-4 pt-8">
              {[
                { label: 'FACILITIES', value: '3', unit: 'LOCATIONS' },
                { label: 'CAPACITY', value: '15K', unit: 'TONS/YEAR' },
                { label: 'UPTIME', value: '99.9', unit: '%' },
              ].map((spec) => (
                <StaggerItem key={spec.label}>
                  <div className="bg-industrial-black/50 border border-industrial-gray/20 p-4">
                    <p className="font-mono text-xs text-industrial-gray">{spec.label}</p>
                    <p className="font-bebas text-4xl text-industrial-white mt-1">
                      {spec.value}
                      <span className="text-industrial-red text-lg ml-1">{spec.unit}</span>
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>

        {/* Mission statement */}
        <ScrollReveal className="mt-24">
          <div className="relative border border-industrial-gray/20 p-8 lg:p-12 bg-industrial-black/30">
            <div className="absolute top-4 left-4 font-mono text-xs text-industrial-gray">
              {'// MISSION_STATEMENT'}
            </div>
            <motion.div
              className="absolute top-0 left-0 w-1 h-full bg-industrial-red"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            />
            <blockquote className="font-bebas text-2xl lg:text-4xl text-industrial-white leading-tight pt-8">
              &quot;DELIVER PREMIUM QUALITY AT INDUSTRIAL SCALE.
              <br />
              NO COMPROMISES. NO EXCEPTIONS.&quot;
            </blockquote>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
