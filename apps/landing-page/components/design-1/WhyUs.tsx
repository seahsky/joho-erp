'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import { motion } from 'framer-motion'

const features = [
  {
    number: '01',
    title: 'Uncompromising Quality',
    description: 'Every product undergoes rigorous quality checks. We source only from certified farms with the highest animal welfare standards.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Cold Chain Excellence',
    description: 'State-of-the-art refrigeration and logistics ensure your products arrive in perfect condition, every time.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Custom Cutting',
    description: 'Our master butchers can prepare cuts to your exact specifications. Tell us what you need, and we deliver.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Reliable Supply',
    description: 'Consistent availability and on-time delivery. Build your menu with confidence knowing we have you covered.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: '05',
    title: 'Competitive Pricing',
    description: 'Direct sourcing and efficient operations mean better prices for you, without compromising on quality.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: '06',
    title: 'Dedicated Support',
    description: 'Your personal account manager ensures seamless communication and handles all your needs with care.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
]

export function EditorialWhyUs() {
  return (
    <section className="relative py-32 bg-white overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-editorial-cream" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="max-w-2xl mb-20">
          <span className="font-dm text-sm tracking-[0.3em] uppercase text-editorial-burgundy">
            Why Choose Us
          </span>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-semibold text-editorial-charcoal mt-4">
            The Jimmy Beef <span className="italic text-editorial-burgundy">Difference</span>
          </h2>
          <p className="font-dm text-lg text-editorial-charcoal/60 mt-6">
            More than a supplier — we&apos;re your partner in culinary excellence.
          </p>
        </ScrollReveal>

        {/* Features grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <StaggerItem key={feature.number}>
              <motion.div
                className="group relative bg-white p-8 border border-editorial-warm hover:border-editorial-burgundy transition-colors duration-300"
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Number */}
                <span className="absolute top-4 right-4 font-cormorant text-5xl text-editorial-gold/20 group-hover:text-editorial-burgundy/20 transition-colors">
                  {feature.number}
                </span>

                {/* Icon */}
                <div className="text-editorial-burgundy mb-6">
                  {feature.icon}
                </div>

                {/* Content */}
                <h3 className="font-cormorant text-2xl font-semibold text-editorial-charcoal mb-3">
                  {feature.title}
                </h3>
                <p className="font-dm text-editorial-charcoal/60 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover accent line */}
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-editorial-burgundy"
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
