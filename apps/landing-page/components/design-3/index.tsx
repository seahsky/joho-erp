'use client'

import { OrganicHero } from './Hero'
import { OrganicAbout } from './About'
import { OrganicProducts } from './Products'
import { OrganicWhyUs } from './WhyUs'
import { OrganicGlobalReach } from './GlobalReach'
import { OrganicCertifications } from './Certifications'
import { OrganicContact } from './Contact'
import { OrganicFooter } from './Footer'

export function OrganicDesign() {
  return (
    <main className="bg-organic-cream">
      <OrganicHero />
      <OrganicAbout />
      <OrganicProducts />
      <OrganicWhyUs />
      <OrganicGlobalReach />
      <OrganicCertifications />
      <OrganicContact />
      <OrganicFooter />
    </main>
  )
}

export {
  OrganicHero,
  OrganicAbout,
  OrganicProducts,
  OrganicWhyUs,
  OrganicGlobalReach,
  OrganicCertifications,
  OrganicContact,
  OrganicFooter,
}
