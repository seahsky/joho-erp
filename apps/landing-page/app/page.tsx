'use client'

import { DesignProvider, useDesign } from '@/components/shared/DesignContext'
import { DesignSwitcher } from '@/components/shared/DesignSwitcher'
import { EditorialDesign } from '@/components/design-1'
import { IndustrialDesign } from '@/components/design-2'
import { OrganicDesign } from '@/components/design-3'
import { AnimatePresence, motion } from 'framer-motion'

function LandingPageContent() {
  const { theme } = useDesign()

  return (
    <>
      <DesignSwitcher />
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {theme === 'editorial' && <EditorialDesign />}
          {theme === 'industrial' && <IndustrialDesign />}
          {theme === 'organic' && <OrganicDesign />}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export default function LandingPage() {
  return (
    <DesignProvider>
      <LandingPageContent />
    </DesignProvider>
  )
}
