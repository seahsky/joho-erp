'use client'

import { motion } from 'motion/react'
import Image from 'next/image'

export function OrganicHero() {
  return (
    <section className="relative min-h-screen bg-organic-cream overflow-hidden">
      {/* Subtle grain texture */}
      <div className="absolute inset-0 grain" />

      {/* Organic background shapes */}
      <motion.div
        className="absolute top-20 right-0 w-96 h-96 bg-organic-sage/10 organic-wave"
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 5, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-20 left-0 w-80 h-80 bg-organic-terracotta/10 rounded-[60%_40%_30%_70%/60%_30%_70%_40%]"
        animate={{
          scale: [1, 1.08, 1],
          rotate: [0, -5, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[80vh]">
          {/* Left: Warm Typography */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 font-nunito text-sm tracking-wide text-organic-sage bg-organic-sage/10 px-4 py-2 rounded-full">
                <span className="text-lg">🌿</span>
                Naturally Raised, Responsibly Sourced
              </span>
            </motion.div>

            <motion.h1
              className="font-fraunces text-5xl lg:text-7xl font-semibold leading-tight text-organic-earth"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              From Our Farms
              <br />
              <span className="text-organic-terracotta italic">To Your Table</span>
            </motion.h1>

            <motion.p
              className="font-nunito text-lg text-organic-earth/70 max-w-md leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Premium beef, pork, and chicken from family farms that share our
              commitment to quality, sustainability, and animal welfare.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-4 pt-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <a
                href="#contact"
                className="group inline-flex items-center gap-3 bg-organic-terracotta text-white px-8 py-4 rounded-full font-nunito font-semibold hover:bg-organic-earth transition-colors"
              >
                Become a Partner
                <motion.span
                  className="group-hover:translate-x-1 transition-transform"
                >
                  →
                </motion.span>
              </a>
              <a
                href="#products"
                className="inline-flex items-center gap-2 font-nunito text-organic-earth hover:text-organic-terracotta transition-colors"
              >
                <span className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-organic-wheat">
                  ▶
                </span>
                Explore Products
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              className="flex gap-6 pt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              {['Grass-Fed', 'Hormone-Free', 'Family Farms'].map((badge) => (
                <div key={badge} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-organic-sage rounded-full" />
                  <span className="font-nunito text-sm text-organic-earth/60">{badge}</span>
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
            {/* Organic frame shape */}
            <div className="absolute -inset-8 bg-organic-wheat/30 rounded-[60%_40%_55%_45%/45%_55%_45%_55%]" />

            <div className="relative aspect-[4/5] rounded-[40%_60%_50%_50%/50%_50%_60%_40%] overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800&q=80"
                alt="Fresh cuts of meat"
                fill
                className="object-cover"
                priority
              />
              {/* Warm overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-organic-earth/20 to-transparent" />
            </div>

            {/* Floating card */}
            <motion.div
              className="absolute -bottom-4 -left-8 bg-white p-5 rounded-2xl shadow-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🥩</span>
                <div>
                  <p className="font-nunito text-xs text-organic-earth/50">Featured This Season</p>
                  <p className="font-fraunces text-lg text-organic-earth">Wagyu Selection</p>
                </div>
              </div>
            </motion.div>

            {/* Stats badge */}
            <motion.div
              className="absolute -top-4 -right-4 bg-organic-sage text-white p-4 rounded-full text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <p className="font-fraunces text-2xl font-bold">15+</p>
              <p className="font-nunito text-xs">Years</p>
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
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-organic-sage"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
