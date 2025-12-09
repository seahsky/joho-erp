'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import { motion } from 'motion/react'

const certifications = [
  {
    name: 'HACCP Certified',
    description: 'Hazard Analysis Critical Control Points - International food safety standard',
    icon: '🛡️',
  },
  {
    name: 'ISO 22000',
    description: 'Food Safety Management System certification',
    icon: '✓',
  },
  {
    name: 'Halal Certified',
    description: 'Products prepared according to Islamic dietary guidelines',
    icon: '☪️',
  },
  {
    name: 'USDA Approved',
    description: 'United States Department of Agriculture export certification',
    icon: '🇺🇸',
  },
  {
    name: 'EU Export License',
    description: 'Approved for export to European Union markets',
    icon: '🇪🇺',
  },
  {
    name: 'Organic Options',
    description: 'Certified organic products available upon request',
    icon: '🌱',
  },
]

export function EditorialCertifications() {
  return (
    <section className="relative py-32 bg-editorial-cream overflow-hidden">
      <div className="absolute inset-0 grain" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="text-center mb-20">
          <span className="font-dm text-sm tracking-[0.3em] uppercase text-editorial-burgundy">
            Trust & Quality
          </span>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-semibold text-editorial-charcoal mt-4">
            Certified <span className="italic text-editorial-burgundy">Excellence</span>
          </h2>
          <p className="font-dm text-lg text-editorial-charcoal/60 mt-6 max-w-2xl mx-auto">
            Our commitment to quality is backed by internationally recognized certifications
            and rigorous compliance standards.
          </p>
        </ScrollReveal>

        {/* Certifications grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certifications.map((cert) => (
            <StaggerItem key={cert.name}>
              <motion.div
                className="group bg-white p-8 border border-editorial-warm hover:border-editorial-gold transition-all duration-300"
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{cert.icon}</span>
                  <div>
                    <h3 className="font-cormorant text-xl font-semibold text-editorial-charcoal group-hover:text-editorial-burgundy transition-colors">
                      {cert.name}
                    </h3>
                    <p className="font-dm text-sm text-editorial-charcoal/60 mt-2">
                      {cert.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Trust message */}
        <ScrollReveal className="mt-20 text-center">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-white border border-editorial-gold/30">
            <svg className="w-6 h-6 text-editorial-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="font-dm text-editorial-charcoal">
              Full documentation and certificates available upon request
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
