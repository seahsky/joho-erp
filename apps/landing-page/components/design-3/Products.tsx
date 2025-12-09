'use client'

import { motion } from 'framer-motion'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import Image from 'next/image'

const products = [
  {
    category: 'Beef',
    emoji: '🥩',
    tagline: 'Grass-Fed Goodness',
    description: 'Our cattle roam freely on lush pastures, resulting in beautifully marbled beef with rich, natural flavor.',
    image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=800&q=80',
    featured: ['Wagyu', 'Ribeye', 'Tenderloin', 'Striploin'],
    color: 'bg-organic-terracotta/10',
  },
  {
    category: 'Pork',
    emoji: '🥓',
    tagline: 'Heritage Excellence',
    description: 'Traditional heritage breeds raised naturally for exceptional marbling and old-fashioned flavor.',
    image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&q=80',
    featured: ['Berkshire', 'Belly', 'Chops', 'Ribs'],
    color: 'bg-organic-sage/10',
  },
  {
    category: 'Chicken',
    emoji: '🍗',
    tagline: 'Free Range Freshness',
    description: 'Happy chickens from family farms, raised outdoors with room to roam and natural feed.',
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&q=80',
    featured: ['Whole Bird', 'Breast', 'Thighs', 'Wings'],
    color: 'bg-organic-wheat/30',
  },
]

export function OrganicProducts() {
  return (
    <section id="products" className="relative py-32 bg-organic-cream overflow-hidden">
      <div className="absolute inset-0 grain" />

      {/* Organic background shapes */}
      <div className="absolute top-1/4 left-0 w-64 h-64 bg-organic-sage/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-organic-terracotta/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="text-center mb-20">
          <span className="inline-flex items-center gap-2 font-nunito text-sm text-organic-sage bg-organic-sage/10 px-4 py-2 rounded-full mb-4">
            <span>🍖</span> Our Products
          </span>
          <h2 className="font-fraunces text-4xl lg:text-5xl font-semibold text-organic-earth">
            Nature&apos;s <span className="text-organic-terracotta italic">Finest</span>
          </h2>
          <p className="font-nunito text-lg text-organic-earth/60 mt-4 max-w-2xl mx-auto">
            Premium cuts from animals raised the way nature intended — with care,
            space, and respect.
          </p>
        </ScrollReveal>

        {/* Products grid */}
        <StaggerContainer className="grid md:grid-cols-3 gap-8">
          {products.map((product) => (
            <StaggerItem key={product.category}>
              <motion.div
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
                whileHover={{ y: -8 }}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.category}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-organic-earth/40 to-transparent" />

                  {/* Category badge */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                    <span className="text-xl">{product.emoji}</span>
                    <span className="font-fraunces text-organic-earth">{product.category}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <span className="font-nunito text-xs text-organic-sage uppercase tracking-wider">
                    {product.tagline}
                  </span>
                  <p className="font-nunito text-organic-earth/70 mt-2 mb-4 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Featured cuts */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {product.featured.map((cut) => (
                      <span
                        key={cut}
                        className={`px-3 py-1 rounded-full font-nunito text-sm text-organic-earth ${product.color}`}
                      >
                        {cut}
                      </span>
                    ))}
                  </div>

                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 font-nunito text-sm text-organic-terracotta hover:text-organic-earth transition-colors"
                  >
                    Learn more
                    <span>→</span>
                  </a>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* CTA */}
        <ScrollReveal className="text-center mt-16">
          <a
            href="#contact"
            className="inline-flex items-center gap-3 bg-organic-earth text-white px-8 py-4 rounded-full font-nunito font-semibold hover:bg-organic-terracotta transition-colors"
          >
            Request Full Catalog
            <span>📋</span>
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
