'use client'

import { ScrollReveal } from '../shared/ScrollReveal'
import { motion } from 'motion/react'
import { useState } from 'react'

export function EditorialContact() {
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
    // Static form - just for display
    alert('Thank you for your inquiry! This is a demo form.')
  }

  return (
    <section id="contact" className="relative py-32 bg-white overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-1/3 h-full bg-editorial-cream" />
      <div className="absolute top-0 left-1/3 w-px h-full bg-editorial-gold/20" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left: Info */}
          <ScrollReveal direction="left">
            <div className="lg:pr-16">
              <span className="font-dm text-sm tracking-[0.3em] uppercase text-editorial-burgundy">
                Get in Touch
              </span>
              <h2 className="font-cormorant text-5xl lg:text-6xl font-semibold text-editorial-charcoal mt-4">
                Let&apos;s <span className="italic text-editorial-burgundy">Partner</span>
              </h2>
              <p className="font-dm text-lg text-editorial-charcoal/70 mt-6 leading-relaxed">
                Whether you&apos;re a restaurant, hotel, retailer, or distributor,
                we&apos;d love to discuss how Jimmy Beef can serve your needs.
              </p>

              {/* Contact info */}
              <div className="mt-12 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center border border-editorial-gold/30 text-editorial-burgundy">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-dm text-sm text-editorial-charcoal/50 uppercase tracking-wider">Email</p>
                    <p className="font-cormorant text-xl text-editorial-charcoal">partners@jimmybeef.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center border border-editorial-gold/30 text-editorial-burgundy">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-dm text-sm text-editorial-charcoal/50 uppercase tracking-wider">Phone</p>
                    <p className="font-cormorant text-xl text-editorial-charcoal">+61 3 9000 0000</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center border border-editorial-gold/30 text-editorial-burgundy">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-dm text-sm text-editorial-charcoal/50 uppercase tracking-wider">Location</p>
                    <p className="font-cormorant text-xl text-editorial-charcoal">Melbourne, Australia</p>
                  </div>
                </div>
              </div>

              {/* Business hours */}
              <div className="mt-12 p-6 bg-editorial-cream border-l-4 border-editorial-burgundy">
                <p className="font-dm text-sm text-editorial-charcoal/50 uppercase tracking-wider mb-2">Business Hours</p>
                <p className="font-cormorant text-lg text-editorial-charcoal">
                  Monday — Friday: 8:00 AM — 6:00 PM AEST
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Form */}
          <ScrollReveal direction="right" delay={0.2}>
            <form onSubmit={handleSubmit} className="bg-editorial-cream p-8 lg:p-12">
              <h3 className="font-cormorant text-2xl font-semibold text-editorial-charcoal mb-8">
                Request Information
              </h3>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="font-dm text-sm text-editorial-charcoal/70 block mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-editorial-warm focus:border-editorial-burgundy outline-none transition-colors font-dm"
                  />
                </div>

                <div>
                  <label className="font-dm text-sm text-editorial-charcoal/70 block mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-editorial-warm focus:border-editorial-burgundy outline-none transition-colors font-dm"
                  />
                </div>

                <div>
                  <label className="font-dm text-sm text-editorial-charcoal/70 block mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-editorial-warm focus:border-editorial-burgundy outline-none transition-colors font-dm"
                  />
                </div>

                <div>
                  <label className="font-dm text-sm text-editorial-charcoal/70 block mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-editorial-warm focus:border-editorial-burgundy outline-none transition-colors font-dm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-dm text-sm text-editorial-charcoal/70 block mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-editorial-warm focus:border-editorial-burgundy outline-none transition-colors font-dm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-dm text-sm text-editorial-charcoal/70 block mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your business and requirements..."
                    className="w-full px-4 py-3 bg-white border border-editorial-warm focus:border-editorial-burgundy outline-none transition-colors font-dm resize-none"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                className="mt-8 w-full bg-editorial-burgundy text-white py-4 font-dm text-sm tracking-wide hover:bg-editorial-charcoal transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Send Inquiry
              </motion.button>

              <p className="font-dm text-xs text-editorial-charcoal/50 mt-4 text-center">
                We typically respond within 24 business hours.
              </p>
            </form>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
