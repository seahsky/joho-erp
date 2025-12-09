'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type DesignTheme = 'editorial' | 'industrial' | 'organic'

interface DesignContextType {
  theme: DesignTheme
  setTheme: (theme: DesignTheme) => void
}

const DesignContext = createContext<DesignContextType | undefined>(undefined)

export function DesignProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<DesignTheme>('editorial')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('jimmy-beef-design') as DesignTheme | null
    if (saved && ['editorial', 'industrial', 'organic'].includes(saved)) {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('jimmy-beef-design', theme)
    document.body.className = `design-${theme}`
  }, [theme, mounted])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-editorial-cream">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-editorial-charcoal font-cormorant text-2xl">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <DesignContext.Provider value={{ theme, setTheme }}>
      {children}
    </DesignContext.Provider>
  )
}

export function useDesign() {
  const context = useContext(DesignContext)
  if (!context) {
    throw new Error('useDesign must be used within a DesignProvider')
  }
  return context
}
