'use client'

import { IndustrialHero } from './Hero'
import { IndustrialAbout } from './About'
import { IndustrialProducts } from './Products'
import { IndustrialWhyUs } from './WhyUs'
import { IndustrialGlobalReach } from './GlobalReach'
import { IndustrialCertifications } from './Certifications'
import { IndustrialContact } from './Contact'
import { IndustrialFooter } from './Footer'

export function IndustrialDesign() {
  return (
    <main className="bg-industrial-black">
      <IndustrialHero />
      <IndustrialAbout />
      <IndustrialProducts />
      <IndustrialWhyUs />
      <IndustrialGlobalReach />
      <IndustrialCertifications />
      <IndustrialContact />
      <IndustrialFooter />
    </main>
  )
}

export {
  IndustrialHero,
  IndustrialAbout,
  IndustrialProducts,
  IndustrialWhyUs,
  IndustrialGlobalReach,
  IndustrialCertifications,
  IndustrialContact,
  IndustrialFooter,
}
