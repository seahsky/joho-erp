'use client'

import { ScrollReveal, StaggerContainer, StaggerItem } from '../shared/ScrollReveal'
import Image from 'next/image'

export function OrganicAbout() {
  return (
    <section id="about" className="relative py-32 bg-white overflow-hidden">
      {/* Wave divider */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-organic-cream">
        <svg className="absolute bottom-0 w-full h-16" viewBox="0 0 1440 64" preserveAspectRatio="none">
          <path
            d="M0,32 C480,64 960,0 1440,32 L1440,64 L0,64 Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Background shape */}
      <div className="absolute top-1/2 right-0 w-1/3 h-96 bg-organic-wheat/20 rounded-l-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-16">
        {/* Section header */}
        <ScrollReveal className="text-center mb-20">
          <span className="inline-flex items-center gap-2 font-nunito text-sm text-organic-sage bg-organic-sage/10 px-4 py-2 rounded-full mb-4">
            <span>🌾</span> Our Story
          </span>
          <h2 className="font-fraunces text-4xl lg:text-5xl font-semibold text-organic-earth">
            Rooted in <span className="text-organic-terracotta italic">Tradition</span>
          </h2>
        </ScrollReveal>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Image collage */}
          <ScrollReveal direction="left" className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-[3/4] rounded-3xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&q=80"
                    alt="Farm landscape"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="aspect-square rounded-3xl overflow-hidden bg-organic-sage/20 flex items-center justify-center">
                  <span className="text-6xl">🐄</span>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="aspect-square rounded-3xl overflow-hidden bg-organic-terracotta/20 flex items-center justify-center">
                  <span className="text-6xl">🌿</span>
                </div>
                <div className="aspect-[3/4] rounded-3xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1551028150-64b9f398f678?w=400&q=80"
                    alt="Quality meat preparation"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Text content */}
          <div className="space-y-6">
            <ScrollReveal delay={0.2}>
              <p className="font-fraunces text-2xl lg:text-3xl text-organic-earth leading-relaxed">
                For over fifteen years, we&apos;ve worked hand-in-hand with family farmers
                who share our <span className="text-organic-terracotta">passion for quality</span>.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <p className="font-nunito text-lg text-organic-earth/70 leading-relaxed">
                Joho Foods began with a simple belief: that better-tasting meat comes from
                animals raised with care on open pastures. Today, we partner with over
                50 family farms to bring you premium beef, pork, and chicken that you
                can trust.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <p className="font-nunito text-lg text-organic-earth/70 leading-relaxed">
                Our farmers use traditional methods combined with modern best practices
                to ensure the highest animal welfare standards while protecting the
                land for future generations.
              </p>
            </ScrollReveal>

            {/* Values */}
            <StaggerContainer className="grid sm:grid-cols-3 gap-6 pt-8">
              {[
                { icon: '🌱', title: 'Sustainable', desc: 'Eco-friendly practices' },
                { icon: '❤️', title: 'Humane', desc: 'Highest welfare standards' },
                { icon: '✨', title: 'Premium', desc: 'Uncompromised quality' },
              ].map((value) => (
                <StaggerItem key={value.title}>
                  <div className="text-center p-4 rounded-2xl bg-organic-cream">
                    <span className="text-3xl mb-2 block">{value.icon}</span>
                    <h3 className="font-fraunces text-lg text-organic-earth">{value.title}</h3>
                    <p className="font-nunito text-sm text-organic-earth/60">{value.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>

        {/* Quote */}
        <ScrollReveal className="mt-24 max-w-3xl mx-auto text-center">
          <div className="relative p-8">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-6xl text-organic-wheat">
              &ldquo;
            </span>
            <blockquote className="font-fraunces text-xl lg:text-2xl text-organic-earth italic leading-relaxed">
              We believe that when you care for the land and the animals, the quality
              speaks for itself. That&apos;s the Joho Foods promise.
            </blockquote>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-organic-sage flex items-center justify-center text-white text-xl">
                🌾
              </div>
              <cite className="font-nunito text-sm text-organic-earth/60 not-italic">
                The Joho Foods Family
              </cite>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
