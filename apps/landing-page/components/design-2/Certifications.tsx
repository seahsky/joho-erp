'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import { motion } from 'framer-motion'

const certifications = [
  { code: 'HACCP', name: 'HACCP_CERTIFIED', status: 'VERIFIED', description: 'HAZARD ANALYSIS CRITICAL CONTROL POINTS' },
  { code: 'ISO22K', name: 'ISO_22000', status: 'VERIFIED', description: 'FOOD SAFETY MANAGEMENT SYSTEM' },
  { code: 'HALAL', name: 'HALAL_CERTIFIED', status: 'VERIFIED', description: 'ISLAMIC DIETARY COMPLIANCE' },
  { code: 'USDA', name: 'USDA_APPROVED', status: 'VERIFIED', description: 'US DEPT OF AGRICULTURE EXPORT' },
  { code: 'EU', name: 'EU_EXPORT', status: 'VERIFIED', description: 'EUROPEAN UNION MARKET ACCESS' },
  { code: 'ORG', name: 'ORGANIC_OPTS', status: 'AVAILABLE', description: 'CERTIFIED ORGANIC PRODUCTS' },
]

export function IndustrialCertifications() {
  return (
    <section className="relative py-32 bg-industrial-steel overflow-hidden">
      <div className="absolute inset-0 industrial-grid opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-industrial-red" />
            <span className="font-mono text-xs tracking-[0.3em] text-industrial-red">
              {'// COMPLIANCE'}
            </span>
          </div>
          <h2 className="font-bebas text-6xl lg:text-8xl text-industrial-white">
            CERTI<span className="text-industrial-red">FIED</span>
          </h2>
          <p className="font-mono text-sm text-industrial-gray mt-4 max-w-xl">
            FULL REGULATORY COMPLIANCE. EVERY CERTIFICATION YOU NEED.
          </p>
        </ScrollReveal>

        {/* Certifications grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {certifications.map((cert) => (
            <StaggerItem key={cert.code}>
              <motion.div
                className="group bg-industrial-black/50 border border-industrial-gray/20 p-4 hover:border-industrial-red transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-industrial-red/10 border border-industrial-red/30 px-2 py-1">
                    <span className="font-mono text-xs text-industrial-red">{cert.code}</span>
                  </div>
                  <span className={`font-mono text-xs ${
                    cert.status === 'VERIFIED' ? 'text-green-500' : 'text-yellow-500'
                  }`}>
                    ● {cert.status}
                  </span>
                </div>
                <h3 className="font-bebas text-xl text-industrial-white mb-1">
                  {cert.name}
                </h3>
                <p className="font-mono text-xs text-industrial-gray">
                  {cert.description}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Verification notice */}
        <ScrollReveal className="mt-12">
          <div className="flex items-center justify-center gap-4 py-4 border-t border-b border-industrial-gray/20">
            <motion.div
              className="w-2 h-2 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <p className="font-mono text-sm text-industrial-gray">
              ALL_CERTIFICATES_AVAILABLE_ON_REQUEST | AUDIT_REPORTS_INCLUDED
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
