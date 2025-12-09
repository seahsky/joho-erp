'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import { motion } from 'motion/react'

const certifications = [
  { icon: '🛡️', name: 'HACCP Certified', description: 'International food safety standard' },
  { icon: '📋', name: 'ISO 22000', description: 'Food safety management' },
  { icon: '☪️', name: 'Halal Certified', description: 'Islamic dietary compliance' },
  { icon: '🇺🇸', name: 'USDA Approved', description: 'US export certification' },
  { icon: '🇪🇺', name: 'EU Licensed', description: 'European market access' },
  { icon: '🌱', name: 'Organic Options', description: 'Certified organic products' },
]

export function OrganicCertifications() {
  return (
    <section className="relative py-32 bg-organic-cream overflow-hidden">
      <div className="absolute inset-0 grain" />

      {/* Wave divider */}
      <svg className="absolute top-0 w-full h-16" viewBox="0 0 1440 64" preserveAspectRatio="none">
        <path
          d="M0,64 C480,0 960,64 1440,0 L1440,0 L0,0 Z"
          fill="white"
          className="opacity-50"
        />
      </svg>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <span className="inline-flex items-center gap-2 font-nunito text-sm text-organic-sage bg-organic-sage/10 px-4 py-2 rounded-full mb-4">
            <span>✓</span> Certifications
          </span>
          <h2 className="font-fraunces text-4xl lg:text-5xl font-semibold text-organic-earth">
            Quality You Can <span className="text-organic-terracotta italic">Trust</span>
          </h2>
          <p className="font-nunito text-lg text-organic-earth/60 mt-4 max-w-2xl mx-auto">
            Our commitment to quality is backed by internationally recognized standards.
          </p>
        </ScrollReveal>

        {/* Certifications grid */}
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certifications.map((cert) => (
            <StaggerItem key={cert.name}>
              <motion.div
                className="bg-white rounded-2xl p-6 flex items-start gap-4 hover:shadow-lg transition-shadow"
                whileHover={{ y: -4 }}
              >
                <span className="text-3xl flex-shrink-0">{cert.icon}</span>
                <div>
                  <h3 className="font-fraunces text-lg text-organic-earth">{cert.name}</h3>
                  <p className="font-nunito text-sm text-organic-earth/60">{cert.description}</p>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Trust message */}
        <ScrollReveal className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-sm">
            <span className="text-xl">📜</span>
            <p className="font-nunito text-organic-earth">
              Full documentation available upon request
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
