'use client'

import { ScrollReveal } from '../shared/ScrollReveal'
import { motion } from 'motion/react'
import { useState } from 'react'

export function IndustrialContact() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    country: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('INQUIRY_SUBMITTED // This is a demo form.')
  }

  return (
    <section id="contact" className="relative py-32 bg-industrial-black overflow-hidden">
      <div className="absolute inset-0 industrial-grid" />

      {/* Accent lines */}
      <motion.div
        className="absolute top-1/4 left-0 w-1/3 h-px bg-gradient-to-r from-industrial-red to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left: Info */}
          <ScrollReveal direction="left">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-px bg-industrial-red" />
              <span className="font-mono text-xs tracking-[0.3em] text-industrial-red">
                {'// CONTACT'}
              </span>
            </div>
            <h2 className="font-bebas text-6xl lg:text-7xl text-industrial-white mb-6">
              INIT<span className="text-industrial-red">IATE</span>
            </h2>
            <p className="font-mono text-sm text-industrial-gray leading-relaxed mb-12">
              READY TO OPTIMIZE YOUR SUPPLY CHAIN?
              <br />
              SUBMIT YOUR INQUIRY. WE RESPOND WITHIN 24H.
            </p>

            {/* Contact data */}
            <div className="space-y-6">
              {[
                { label: 'EMAIL', value: 'partners@johofoods.com', icon: '@' },
                { label: 'PHONE', value: '+61 3 9000 0000', icon: '#' },
                { label: 'LOCATION', value: 'MELBOURNE, AUSTRALIA', icon: '◉' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 py-4 border-b border-industrial-gray/20">
                  <div className="w-10 h-10 flex items-center justify-center bg-industrial-red/10 border border-industrial-red/30 font-mono text-industrial-red">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-mono text-xs text-industrial-gray">{item.label}</p>
                    <p className="font-bebas text-xl text-industrial-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hours */}
            <div className="mt-8 p-4 bg-industrial-steel/30 border-l-2 border-industrial-red">
              <p className="font-mono text-xs text-industrial-gray">OPERATIONAL_HOURS</p>
              <p className="font-bebas text-lg text-industrial-white mt-1">
                MON-FRI: 08:00-18:00 AEST
              </p>
            </div>
          </ScrollReveal>

          {/* Right: Form */}
          <ScrollReveal direction="right" delay={0.2}>
            <div className="bg-industrial-steel/30 border border-industrial-gray/20 p-8">
              {/* Form header */}
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-industrial-gray/20">
                <div className="w-2 h-2 rounded-full bg-industrial-red" />
                <span className="font-mono text-xs text-industrial-gray">NEW_INQUIRY_FORM</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs text-industrial-gray block mb-2">
                      NAME_*
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-industrial-black/50 border border-industrial-gray/30 text-industrial-white font-mono text-sm focus:border-industrial-red outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs text-industrial-gray block mb-2">
                      COMPANY_*
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 bg-industrial-black/50 border border-industrial-gray/30 text-industrial-white font-mono text-sm focus:border-industrial-red outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs text-industrial-gray block mb-2">
                      EMAIL_*
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-industrial-black/50 border border-industrial-gray/30 text-industrial-white font-mono text-sm focus:border-industrial-red outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs text-industrial-gray block mb-2">
                      PHONE_
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-industrial-black/50 border border-industrial-gray/30 text-industrial-white font-mono text-sm focus:border-industrial-red outline-none transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-mono text-xs text-industrial-gray block mb-2">
                      COUNTRY_*
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 bg-industrial-black/50 border border-industrial-gray/30 text-industrial-white font-mono text-sm focus:border-industrial-red outline-none transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-mono text-xs text-industrial-gray block mb-2">
                      MESSAGE_
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="// DESCRIBE YOUR REQUIREMENTS..."
                      className="w-full px-4 py-3 bg-industrial-black/50 border border-industrial-gray/30 text-industrial-white font-mono text-sm focus:border-industrial-red outline-none transition-colors resize-none placeholder:text-industrial-gray/50"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="w-full bg-industrial-red text-industrial-white py-4 font-mono text-sm tracking-wider hover:bg-industrial-white hover:text-industrial-black transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  SUBMIT_INQUIRY →
                </motion.button>

                <p className="font-mono text-xs text-industrial-gray text-center">
                  RESPONSE_TIME: &lt;24_HOURS
                </p>
              </form>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
