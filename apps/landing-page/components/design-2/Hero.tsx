'use client'

import { motion } from 'motion/react'
import Image from 'next/image'

export function IndustrialHero() {
  return (
    <section className="relative min-h-screen bg-industrial-black overflow-hidden">
      {/* Grid overlay */}
      <div className="absolute inset-0 industrial-grid" />

      {/* Animated accent lines */}
      <motion.div
        className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-industrial-red via-industrial-red/50 to-transparent"
        initial={{ scaleY: 0, originY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />
      <motion.div
        className="absolute top-0 right-1/3 w-px h-2/3 bg-gradient-to-b from-industrial-gray/30 to-transparent"
        initial={{ scaleY: 0, originY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[80vh]">
          {/* Left: Bold Typography */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-mono text-xs tracking-[0.5em] uppercase text-industrial-red">
                [ PREMIUM_SUPPLIER ]
              </span>
            </motion.div>

            <motion.h1
              className="font-bebas text-7xl lg:text-[10rem] leading-[0.85] text-industrial-white"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              JIMMY
              <br />
              <span className="text-industrial-red">BEEF</span>
            </motion.h1>

            <motion.p
              className="font-mono text-sm text-industrial-gray max-w-md leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {'// PRECISION CUTS FOR PRECISION KITCHENS'}
              <br />
              {'// BEEF • PORK • CHICKEN'}
              <br />
              {'// GLOBAL DISTRIBUTION SINCE 2010'}
            </motion.p>

            <motion.div
              className="flex items-center gap-6 pt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <a
                href="#contact"
                className="group relative inline-flex items-center gap-3 bg-industrial-red text-industrial-white px-8 py-4 font-mono text-sm tracking-wider overflow-hidden"
              >
                <span className="relative z-10">START_PARTNERSHIP</span>
                <motion.span
                  className="relative z-10"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
                <motion.div
                  className="absolute inset-0 bg-industrial-white"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
                <span className="absolute inset-0 flex items-center justify-center gap-3 text-industrial-black opacity-0 group-hover:opacity-100 transition-opacity font-mono text-sm tracking-wider z-20">
                  START_PARTNERSHIP →
                </span>
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              className="flex gap-12 pt-12 border-t border-industrial-gray/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              {[
                { value: '15+', label: 'YEARS' },
                { value: '40+', label: 'COUNTRIES' },
                { value: '500+', label: 'PARTNERS' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-bebas text-5xl text-industrial-white">{stat.value}</p>
                  <p className="font-mono text-xs tracking-wider text-industrial-gray mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Hero Image */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            {/* Frame elements */}
            <div className="absolute -top-4 -left-4 w-24 h-24 border-l-2 border-t-2 border-industrial-red" />
            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-r-2 border-b-2 border-industrial-red" />

            <div className="relative aspect-square bg-industrial-steel overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80"
                alt="Premium steak"
                fill
                className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                priority
              />
              {/* Overlay with data */}
              <div className="absolute inset-0 bg-gradient-to-t from-industrial-black via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-mono text-xs text-industrial-gray">QUALITY_INDEX</p>
                    <p className="font-bebas text-4xl text-industrial-red">A+++</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-industrial-gray">STATUS</p>
                    <p className="font-mono text-sm text-green-500">● AVAILABLE</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data overlay card */}
            <motion.div
              className="absolute -bottom-8 -left-8 bg-industrial-steel border border-industrial-gray/20 p-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <p className="font-mono text-xs text-industrial-gray">FEATURED_PRODUCT</p>
              <p className="font-bebas text-2xl text-industrial-white">WAGYU_A5</p>
              <p className="font-mono text-xs text-industrial-red">NOW_IN_STOCK</p>
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
          <span className="font-mono text-xs text-industrial-gray">SCROLL_DOWN</span>
          <motion.div
            className="w-4 h-8 border border-industrial-gray/50 rounded-full flex justify-center pt-2"
            animate={{ borderColor: ['rgba(107,114,128,0.5)', 'rgba(220,38,38,0.8)', 'rgba(107,114,128,0.5)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1 h-2 bg-industrial-red rounded-full"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
