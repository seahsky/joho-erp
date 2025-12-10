'use client'

import { ScrollReveal } from '../shared/ScrollReveal'
import { motion } from 'motion/react'
import { useState } from 'react'

export function OrganicContact() {
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
    alert('Thank you for reaching out! This is a demo form.')
  }

  return (
    <section id="contact" className="relative py-32 bg-white overflow-hidden">
      {/* Background shapes */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-organic-sage/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-organic-wheat/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left: Info */}
          <ScrollReveal direction="left">
            <span className="inline-flex items-center gap-2 font-nunito text-sm text-organic-sage bg-organic-sage/10 px-4 py-2 rounded-full mb-4">
              <span>💬</span> Get in Touch
            </span>
            <h2 className="font-fraunces text-4xl lg:text-5xl font-semibold text-organic-earth mb-6">
              Let&apos;s <span className="text-organic-terracotta italic">Connect</span>
            </h2>
            <p className="font-nunito text-lg text-organic-earth/70 leading-relaxed mb-8">
              Whether you&apos;re a restaurant, hotel, retailer, or distributor,
              we&apos;d love to hear from you. Let&apos;s explore how we can work together.
            </p>

            {/* Contact info */}
            <div className="space-y-6">
              {[
                { icon: '📧', label: 'Email', value: 'partners@johofoods.com' },
                { icon: '📞', label: 'Phone', value: '+61 3 9000 0000' },
                { icon: '📍', label: 'Location', value: 'Melbourne, Australia' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-organic-cream flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-nunito text-sm text-organic-earth/50">{item.label}</p>
                    <p className="font-fraunces text-lg text-organic-earth">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hours */}
            <div className="mt-8 p-6 bg-organic-cream rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🕐</span>
                <p className="font-nunito text-sm text-organic-earth/60">Business Hours</p>
              </div>
              <p className="font-fraunces text-lg text-organic-earth">
                Monday — Friday: 8:00 AM — 6:00 PM AEST
              </p>
            </div>
          </ScrollReveal>

          {/* Right: Form */}
          <ScrollReveal direction="right" delay={0.2}>
            <div className="bg-organic-cream rounded-3xl p-8 lg:p-10">
              <h3 className="font-fraunces text-2xl text-organic-earth mb-6">
                Send Us a Message
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-nunito text-sm text-organic-earth/70 block mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border-2 border-transparent focus:border-organic-sage outline-none transition-colors font-nunito"
                    />
                  </div>

                  <div>
                    <label className="font-nunito text-sm text-organic-earth/70 block mb-2">
                      Company *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border-2 border-transparent focus:border-organic-sage outline-none transition-colors font-nunito"
                    />
                  </div>

                  <div>
                    <label className="font-nunito text-sm text-organic-earth/70 block mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border-2 border-transparent focus:border-organic-sage outline-none transition-colors font-nunito"
                    />
                  </div>

                  <div>
                    <label className="font-nunito text-sm text-organic-earth/70 block mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border-2 border-transparent focus:border-organic-sage outline-none transition-colors font-nunito"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-nunito text-sm text-organic-earth/70 block mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 bg-white rounded-xl border-2 border-transparent focus:border-organic-sage outline-none transition-colors font-nunito"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-nunito text-sm text-organic-earth/70 block mb-2">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your business and how we can help..."
                      className="w-full px-4 py-3 bg-white rounded-xl border-2 border-transparent focus:border-organic-sage outline-none transition-colors font-nunito resize-none"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="w-full bg-organic-terracotta text-white py-4 rounded-xl font-nunito font-semibold hover:bg-organic-earth transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Send Message 💌
                </motion.button>

                <p className="font-nunito text-sm text-organic-earth/50 text-center">
                  We typically respond within 24 hours.
                </p>
              </form>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
