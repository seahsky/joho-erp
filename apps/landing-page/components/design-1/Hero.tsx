'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export function EditorialHero() {
  return (
    <section className="relative min-h-screen bg-editorial-cream overflow-hidden">
      {/* Subtle grain texture */}
      <div className="absolute inset-0 grain" />

      {/* Background decorative elements */}
      <motion.div
        className="absolute top-20 right-20 w-96 h-96 rounded-full bg-editorial-gold/5 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[80vh]">
          {/* Left: Editorial Text */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="font-dm text-sm tracking-[0.3em] uppercase text-editorial-burgundy">
                Est. 2010 — Premium Quality
              </span>
            </motion.div>

            <motion.h1
              className="font-cormorant text-6xl lg:text-8xl font-semibold leading-[0.9] text-editorial-charcoal"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              The Art of
              <br />
              <span className="text-editorial-burgundy italic">Fine</span> Meat
            </motion.h1>

            <motion.p
              className="font-dm text-lg text-editorial-charcoal/70 max-w-md leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Supplying the world&apos;s finest restaurants, hotels, and culinary establishments
              with premium beef, pork, and chicken since 2010.
            </motion.p>

            <motion.div
              className="flex items-center gap-6 pt-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <a
                href="#contact"
                className="group inline-flex items-center gap-3 bg-editorial-burgundy text-white px-8 py-4 font-dm text-sm tracking-wide hover:bg-editorial-charcoal transition-colors duration-300"
              >
                Partner With Us
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#products"
                className="font-dm text-sm text-editorial-charcoal border-b-2 border-editorial-gold hover:border-editorial-burgundy transition-colors"
              >
                View Our Selection
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="flex gap-12 pt-12 border-t border-editorial-warm mt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              {[
                { value: '15+', label: 'Years Experience' },
                { value: '40+', label: 'Countries Served' },
                { value: '500+', label: 'Partner Businesses' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-cormorant text-4xl font-semibold text-editorial-burgundy">{stat.value}</p>
                  <p className="font-dm text-xs tracking-wider uppercase text-editorial-charcoal/50 mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Hero Image */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            {/* Decorative frame */}
            <div className="absolute -inset-4 border border-editorial-gold/30" />
            <div className="absolute -inset-8 border border-editorial-warm" />

            <div className="relative aspect-[4/5] bg-editorial-warm overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&q=80"
                alt="Premium cuts of beef"
                fill
                className="object-cover"
                priority
              />
              {/* Editorial overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-editorial-charcoal/20 to-transparent" />

              {/* Magazine-style caption */}
              <div className="absolute bottom-6 left-6 right-6">
                <p className="font-cormorant italic text-white text-xl">
                  &ldquo;Excellence in every cut&rdquo;
                </p>
              </div>
            </div>

            {/* Floating accent card */}
            <motion.div
              className="absolute -bottom-8 -left-8 bg-white p-6 shadow-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <p className="font-dm text-xs tracking-wider uppercase text-editorial-gold mb-2">Featured</p>
              <p className="font-cormorant text-2xl text-editorial-charcoal">Wagyu Collection</p>
              <p className="font-dm text-sm text-editorial-charcoal/60 mt-1">Now Available</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <span className="font-dm text-xs tracking-widest uppercase text-editorial-charcoal/40">Scroll</span>
          <motion.div
            className="w-px h-12 bg-editorial-burgundy/30"
            animate={{ scaleY: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </section>
  )
}
