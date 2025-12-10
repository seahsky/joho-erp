'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import { motion } from 'motion/react'

const features = [
  {
    icon: '✨',
    title: 'Premium Quality',
    description: 'Hand-selected cuts from the finest animals, raised with care on family farms.',
  },
  {
    icon: '❄️',
    title: 'Fresh Delivery',
    description: 'Temperature-controlled logistics ensure your products arrive in perfect condition.',
  },
  {
    icon: '✂️',
    title: 'Custom Cuts',
    description: 'Tell us your specifications and our skilled butchers will prepare exactly what you need.',
  },
  {
    icon: '🌍',
    title: 'Global Reach',
    description: 'Reliable shipping to over 40 countries with full documentation and traceability.',
  },
  {
    icon: '💰',
    title: 'Fair Pricing',
    description: 'Direct partnerships with farmers mean better quality at competitive prices.',
  },
  {
    icon: '🤝',
    title: 'Personal Service',
    description: 'A dedicated account manager who understands your business and anticipates your needs.',
  },
]

export function OrganicWhyUs() {
  return (
    <section className="relative py-32 bg-white overflow-hidden">
      {/* Wave divider top */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-organic-cream">
        <svg className="absolute bottom-0 w-full h-16" viewBox="0 0 1440 64" preserveAspectRatio="none">
          <path
            d="M0,32 C360,0 720,64 1080,32 C1260,16 1380,48 1440,32 L1440,64 L0,64 Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Background accent */}
      <div className="absolute top-1/2 left-0 w-1/4 h-96 bg-organic-wheat/20 rounded-r-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-8">
        {/* Section header */}
        <ScrollReveal className="text-center mb-20">
          <span className="inline-flex items-center gap-2 font-nunito text-sm text-organic-sage bg-organic-sage/10 px-4 py-2 rounded-full mb-4">
            <span>💚</span> Why Choose Us
          </span>
          <h2 className="font-fraunces text-4xl lg:text-5xl font-semibold text-organic-earth">
            The Joho Foods <span className="text-organic-terracotta italic">Difference</span>
          </h2>
          <p className="font-nunito text-lg text-organic-earth/60 mt-4 max-w-2xl mx-auto">
            More than just a supplier — we&apos;re your partner in quality.
          </p>
        </ScrollReveal>

        {/* Features grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <motion.div
                className="group p-8 rounded-3xl bg-organic-cream hover:bg-white hover:shadow-xl transition-all duration-300"
                whileHover={{ y: -4 }}
              >
                <span className="text-4xl mb-4 block">{feature.icon}</span>
                <h3 className="font-fraunces text-xl text-organic-earth mb-2 group-hover:text-organic-terracotta transition-colors">
                  {feature.title}
                </h3>
                <p className="font-nunito text-organic-earth/60 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Testimonial */}
        <ScrollReveal className="mt-20">
          <div className="bg-organic-sage/10 rounded-3xl p-8 lg:p-12 text-center">
            <p className="font-fraunces text-xl lg:text-2xl text-organic-earth italic leading-relaxed max-w-3xl mx-auto">
              &ldquo;Working with Joho Foods has transformed our menu. The quality is
              exceptional, and their team truly cares about our success.&rdquo;
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-organic-sage text-white flex items-center justify-center text-xl">
                👨‍🍳
              </div>
              <div className="text-left">
                <p className="font-nunito font-semibold text-organic-earth">Executive Chef</p>
                <p className="font-nunito text-sm text-organic-earth/60">Fine Dining Restaurant</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
