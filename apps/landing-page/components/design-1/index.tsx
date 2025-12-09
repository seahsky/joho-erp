'use client'

import { EditorialHero } from './Hero'
import { EditorialAbout } from './About'
import { EditorialProducts } from './Products'
import { EditorialWhyUs } from './WhyUs'
import { EditorialGlobalReach } from './GlobalReach'
import { EditorialCertifications } from './Certifications'
import { EditorialContact } from './Contact'
import { EditorialFooter } from './Footer'

export function EditorialDesign() {
  return (
    <main className="bg-editorial-cream">
      <EditorialHero />
      <EditorialAbout />
      <EditorialProducts />
      <EditorialWhyUs />
      <EditorialGlobalReach />
      <EditorialCertifications />
      <EditorialContact />
      <EditorialFooter />
    </main>
  )
}

export {
  EditorialHero,
  EditorialAbout,
  EditorialProducts,
  EditorialWhyUs,
  EditorialGlobalReach,
  EditorialCertifications,
  EditorialContact,
  EditorialFooter,
}
