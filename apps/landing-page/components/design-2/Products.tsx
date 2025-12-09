'use client'

import { motion } from 'motion/react'
import { ScrollReveal } from '../shared/ScrollReveal'
import Image from 'next/image'
import { useState } from 'react'

const products = [
  {
    id: 'BEEF',
    code: 'BF_001',
    name: 'PREMIUM BEEF',
    status: 'AVAILABLE',
    specs: ['WAGYU A5', 'PRIME RIBEYE', 'TENDERLOIN', 'T-BONE', 'STRIPLOIN'],
    image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=800&q=80',
    description: 'GRASS-FED, GRAIN-FINISHED. SOURCED FROM CERTIFIED FARMS.',
  },
  {
    id: 'PORK',
    code: 'PK_002',
    name: 'HERITAGE PORK',
    status: 'AVAILABLE',
    specs: ['BERKSHIRE', 'BELLY', 'TENDERLOIN', 'RIBS', 'CHOPS'],
    image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&q=80',
    description: 'HERITAGE BREEDS. EXCEPTIONAL MARBLING AND FLAVOR.',
  },
  {
    id: 'CHICKEN',
    code: 'CH_003',
    name: 'FREE RANGE',
    status: 'AVAILABLE',
    specs: ['WHOLE BIRD', 'BREAST', 'THIGHS', 'WINGS', 'DRUMSTICKS'],
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&q=80',
    description: 'ANTIBIOTIC-FREE. RAISED ON FAMILY FARMS.',
  },
]

export function IndustrialProducts() {
  const [activeProduct, setActiveProduct] = useState(0)

  return (
    <section id="products" className="relative py-32 bg-industrial-black overflow-hidden">
      <div className="absolute inset-0 industrial-grid" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-industrial-red" />
            <span className="font-mono text-xs tracking-[0.3em] text-industrial-red">
              {'// PRODUCT_CATALOG'}
            </span>
          </div>
          <h2 className="font-bebas text-6xl lg:text-8xl text-industrial-white">
            THE <span className="text-industrial-red">LINEUP</span>
          </h2>
        </ScrollReveal>

        {/* Product selector tabs */}
        <ScrollReveal delay={0.2} className="mb-12">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {products.map((product, index) => (
              <motion.button
                key={product.id}
                onClick={() => setActiveProduct(index)}
                className={`
                  relative px-6 py-3 font-mono text-sm tracking-wider transition-colors
                  ${activeProduct === index
                    ? 'bg-industrial-red text-industrial-white'
                    : 'bg-industrial-steel text-industrial-gray hover:text-industrial-white'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-xs opacity-60">[{product.code}]</span>
                <span className="ml-2">{product.id}</span>
              </motion.button>
            ))}
          </div>
        </ScrollReveal>

        {/* Active product display */}
        <motion.div
          key={activeProduct}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-2 gap-12"
        >
          {/* Product image */}
          <div className="relative">
            <div className="absolute -inset-2 border border-industrial-gray/30" />
            <div className="relative aspect-[4/3] overflow-hidden bg-industrial-steel">
              <Image
                src={products[activeProduct].image}
                alt={products[activeProduct].name}
                fill
                className="object-cover grayscale hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-industrial-black via-transparent to-transparent" />

              {/* Status overlay */}
              <div className="absolute top-4 left-4 bg-industrial-black/80 px-3 py-1 font-mono text-xs">
                <span className="text-industrial-gray">STATUS: </span>
                <span className="text-green-500">● {products[activeProduct].status}</span>
              </div>

              {/* Product code */}
              <div className="absolute bottom-4 right-4 font-bebas text-6xl text-industrial-white/10">
                {products[activeProduct].code}
              </div>
            </div>
          </div>

          {/* Product info */}
          <div className="space-y-6">
            <div>
              <p className="font-mono text-xs text-industrial-gray">PRODUCT_ID: {products[activeProduct].code}</p>
              <h3 className="font-bebas text-5xl lg:text-6xl text-industrial-white mt-2">
                {products[activeProduct].name}
              </h3>
            </div>

            <p className="font-mono text-sm text-industrial-gray leading-relaxed">
              {products[activeProduct].description}
            </p>

            {/* Specs */}
            <div className="pt-6 border-t border-industrial-gray/20">
              <p className="font-mono text-xs text-industrial-red mb-4">AVAILABLE_CUTS:</p>
              <div className="grid grid-cols-2 gap-2">
                {products[activeProduct].specs.map((spec, i) => (
                  <motion.div
                    key={spec}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 py-2 px-3 bg-industrial-steel/50 border border-industrial-gray/10"
                  >
                    <span className="w-1 h-1 bg-industrial-red" />
                    <span className="font-mono text-xs text-industrial-white">{spec}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-6">
              <a
                href="#contact"
                className="inline-flex items-center gap-3 bg-industrial-steel border border-industrial-gray/30 px-6 py-3 font-mono text-sm text-industrial-white hover:border-industrial-red hover:text-industrial-red transition-colors"
              >
                REQUEST_CATALOG
                <span>→</span>
              </a>
            </div>
          </div>
        </motion.div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 mt-12">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveProduct(index)}
              className={`w-2 h-2 transition-colors ${
                activeProduct === index ? 'bg-industrial-red' : 'bg-industrial-gray/30'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
