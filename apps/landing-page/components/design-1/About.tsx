'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import Image from 'next/image'

export function EditorialAbout() {
  return (
    <section id="about" className="relative py-32 bg-white overflow-hidden">
      {/* Decorative line */}
      <div className="absolute top-0 left-1/2 w-px h-24 bg-editorial-gold/40" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <ScrollReveal className="text-center mb-20">
          <span className="font-dm text-sm tracking-[0.3em] uppercase text-editorial-burgundy">
            Our Story
          </span>
          <h2 className="font-cormorant text-5xl lg:text-6xl font-semibold text-editorial-charcoal mt-4">
            A Legacy of <span className="italic text-editorial-burgundy">Quality</span>
          </h2>
        </ScrollReveal>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* Left image column */}
          <ScrollReveal direction="left" className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 border border-editorial-gold/20" />
              <div className="relative aspect-[3/4] bg-editorial-cream">
                <Image
                  src="https://images.unsplash.com/photo-1551028150-64b9f398f678?w=600&q=80"
                  alt="Butcher craftsmanship"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Caption overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-4">
                <p className="font-cormorant italic text-editorial-charcoal text-lg">
                  Traditional craftsmanship meets modern standards
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Right text column */}
          <div className="lg:col-span-7 space-y-8">
            <ScrollReveal delay={0.2}>
              <p className="font-cormorant text-3xl leading-relaxed text-editorial-charcoal">
                For over fifteen years, <span className="text-editorial-burgundy">Joho Foods</span> has been
                the trusted partner for discerning culinary establishments across the globe.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <p className="font-dm text-lg text-editorial-charcoal/70 leading-relaxed">
                What began as a small family operation has grown into an international
                enterprise, yet our commitment to quality remains unchanged. We source only
                the finest livestock, work with certified farms, and maintain rigorous
                standards at every step of the supply chain.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <p className="font-dm text-lg text-editorial-charcoal/70 leading-relaxed">
                Our team of expert butchers brings generations of knowledge to every cut,
                ensuring that when you partner with Joho Foods, you receive nothing less
                than excellence.
              </p>
            </ScrollReveal>

            {/* Values grid */}
            <StaggerContainer className="grid sm:grid-cols-3 gap-8 pt-8 border-t border-editorial-warm">
              {[
                { title: 'Quality First', desc: 'Premium sourcing from certified farms' },
                { title: 'Global Reach', desc: 'Shipping to 40+ countries worldwide' },
                { title: 'Expert Team', desc: 'Master butchers with decades of experience' },
              ].map((value) => (
                <StaggerItem key={value.title}>
                  <div className="group">
                    <h3 className="font-cormorant text-xl font-semibold text-editorial-charcoal group-hover:text-editorial-burgundy transition-colors">
                      {value.title}
                    </h3>
                    <p className="font-dm text-sm text-editorial-charcoal/60 mt-2">
                      {value.desc}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>

        {/* Pull quote */}
        <ScrollReveal className="mt-24 text-center max-w-3xl mx-auto">
          <div className="relative py-12">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 font-cormorant text-8xl text-editorial-gold/20">
              &ldquo;
            </div>
            <blockquote className="font-cormorant text-2xl lg:text-3xl italic text-editorial-charcoal leading-relaxed relative z-10">
              Our mission is simple: deliver the finest quality meats with the service
              and reliability that modern businesses demand.
            </blockquote>
            <cite className="font-dm text-sm tracking-wider uppercase text-editorial-burgundy mt-6 block not-italic">
              — The Joho Foods Team
            </cite>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
