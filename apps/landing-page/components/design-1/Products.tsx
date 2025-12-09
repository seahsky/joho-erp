'use client'

import { motion } from 'framer-motion'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import Image from 'next/image'

const products = [
  {
    category: 'Beef',
    tagline: 'Premium Cuts',
    description: 'From prime ribeye to tenderloin, our beef selection represents the finest quality available. Sourced from grass-fed cattle raised on pristine pastures.',
    image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=800&q=80',
    featured: ['Wagyu A5', 'Prime Ribeye', 'Tenderloin', 'T-Bone'],
  },
  {
    category: 'Pork',
    tagline: 'Heritage Breeds',
    description: 'Our heritage pork comes from traditional breeds known for exceptional marbling and flavor. Perfect for discerning kitchens.',
    image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&q=80',
    featured: ['Berkshire Chops', 'Belly', 'Tenderloin', 'Ribs'],
  },
  {
    category: 'Chicken',
    tagline: 'Free Range',
    description: 'Our free-range chickens are raised without antibiotics on family farms, delivering superior taste and texture.',
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&q=80',
    featured: ['Whole Bird', 'Breast', 'Thighs', 'Wings'],
  },
]

export function EditorialProducts() {
  return (
    <section id="products" className="relative py-32 bg-editorial-cream overflow-hidden">
      <div className="absolute inset-0 grain" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="text-center mb-20">
          <span className="font-dm text-sm tracking-[0.3em] uppercase text-editorial-burgundy">
            Our Selection
          </span>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-semibold text-editorial-charcoal mt-4">
            Premium <span className="italic text-editorial-burgundy">Meats</span>
          </h2>
          <p className="font-dm text-lg text-editorial-charcoal/60 mt-6 max-w-2xl mx-auto">
            Curated with care, delivered with precision. Explore our range of exceptional
            beef, pork, and chicken products.
          </p>
        </ScrollReveal>

        {/* Products showcase */}
        <div className="space-y-32">
          {products.map((product, index) => (
            <motion.div
              key={product.category}
              className={`grid lg:grid-cols-2 gap-16 items-center ${
                index % 2 === 1 ? 'lg:grid-flow-dense' : ''
              }`}
            >
              {/* Image */}
              <ScrollReveal
                direction={index % 2 === 0 ? 'left' : 'right'}
                className={index % 2 === 1 ? 'lg:col-start-2' : ''}
              >
                <div className="relative group">
                  {/* Decorative frame */}
                  <motion.div
                    className="absolute -inset-4 border border-editorial-gold/30"
                    whileHover={{ inset: -8 }}
                    transition={{ duration: 0.3 }}
                  />

                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.category}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-editorial-charcoal/40 to-transparent" />

                    {/* Category badge */}
                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2">
                      <span className="font-cormorant text-2xl text-editorial-burgundy">
                        {product.category}
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Content */}
              <ScrollReveal
                direction={index % 2 === 0 ? 'right' : 'left'}
                delay={0.2}
                className={index % 2 === 1 ? 'lg:col-start-1' : ''}
              >
                <div className="space-y-6">
                  <div>
                    <span className="font-dm text-sm tracking-[0.2em] uppercase text-editorial-gold">
                      {product.tagline}
                    </span>
                    <h3 className="font-cormorant text-4xl lg:text-5xl font-semibold text-editorial-charcoal mt-2">
                      {product.category}
                    </h3>
                  </div>

                  <p className="font-dm text-lg text-editorial-charcoal/70 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Featured items */}
                  <div className="pt-6 border-t border-editorial-warm">
                    <p className="font-dm text-xs tracking-wider uppercase text-editorial-burgundy mb-4">
                      Featured Cuts
                    </p>
                    <StaggerContainer className="flex flex-wrap gap-3">
                      {product.featured.map((item) => (
                        <StaggerItem key={item}>
                          <span className="inline-block px-4 py-2 bg-white border border-editorial-warm font-dm text-sm text-editorial-charcoal hover:border-editorial-burgundy hover:text-editorial-burgundy transition-colors cursor-default">
                            {item}
                          </span>
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  </div>

                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 font-dm text-sm text-editorial-burgundy border-b border-editorial-burgundy hover:border-editorial-gold hover:text-editorial-gold transition-colors"
                  >
                    Request Catalog
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                </div>
              </ScrollReveal>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
