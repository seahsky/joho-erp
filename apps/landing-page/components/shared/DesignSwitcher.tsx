'use client'

import { useDesign, DesignTheme } from './DesignContext'
import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'

const designs: { id: DesignTheme; label: string; icon: string }[] = [
  { id: 'editorial', label: 'Editorial', icon: '📰' },
  { id: 'industrial', label: 'Industrial', icon: '⚙️' },
  { id: 'organic', label: 'Organic', icon: '🌿' },
]

export function DesignSwitcher() {
  const { theme, setTheme } = useDesign()
  const [isOpen, setIsOpen] = useState(false)

  const currentDesign = designs.find(d => d.id === theme)

  return (
    <div className="fixed top-6 right-6 z-50">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md
          transition-colors duration-300
          ${theme === 'editorial' ? 'bg-white/90 text-editorial-charcoal border border-editorial-burgundy/20' : ''}
          ${theme === 'industrial' ? 'bg-industrial-steel/90 text-industrial-white border border-industrial-red/30' : ''}
          ${theme === 'organic' ? 'bg-organic-wheat/90 text-organic-earth border border-organic-sage/30' : ''}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>{currentDesign?.icon}</span>
        <span className={`
          text-sm font-medium
          ${theme === 'editorial' ? 'font-dm' : ''}
          ${theme === 'industrial' ? 'font-mono' : ''}
          ${theme === 'organic' ? 'font-nunito' : ''}
        `}>
          {currentDesign?.label}
        </span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`
              absolute top-full right-0 mt-2 p-2 rounded-xl shadow-xl backdrop-blur-md
              ${theme === 'editorial' ? 'bg-white/95 border border-editorial-warm' : ''}
              ${theme === 'industrial' ? 'bg-industrial-steel/95 border border-white/10' : ''}
              ${theme === 'organic' ? 'bg-organic-cream/95 border border-organic-wheat' : ''}
            `}
          >
            <p className={`
              px-3 py-1 text-xs opacity-60 uppercase tracking-wider
              ${theme === 'industrial' ? 'font-mono' : 'font-dm'}
            `}>
              Choose Design
            </p>
            {designs.map((design) => (
              <motion.button
                key={design.id}
                onClick={() => {
                  setTheme(design.id)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                  transition-colors duration-200
                  ${theme === design.id ? 'bg-black/5' : 'hover:bg-black/5'}
                  ${theme === 'industrial' && design.id === theme ? 'bg-white/10' : ''}
                  ${theme === 'industrial' ? 'hover:bg-white/10' : ''}
                `}
                whileHover={{ x: 4 }}
              >
                <span className="text-lg">{design.icon}</span>
                <div>
                  <p className={`
                    text-sm font-medium
                    ${theme === 'industrial' ? 'font-mono' : 'font-dm'}
                  `}>
                    {design.label}
                  </p>
                  <p className={`
                    text-xs opacity-50
                    ${theme === 'industrial' ? 'font-mono' : 'font-dm'}
                  `}>
                    {design.id === 'editorial' && 'Luxury magazine style'}
                    {design.id === 'industrial' && 'Bold & modern'}
                    {design.id === 'organic' && 'Warm & natural'}
                  </p>
                </div>
                {theme === design.id && (
                  <motion.div
                    layoutId="activeIndicator"
                    className={`
                      ml-auto w-2 h-2 rounded-full
                      ${theme === 'editorial' ? 'bg-editorial-burgundy' : ''}
                      ${theme === 'industrial' ? 'bg-industrial-red' : ''}
                      ${theme === 'organic' ? 'bg-organic-sage' : ''}
                    `}
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
