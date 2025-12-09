'use client'

import { motion } from 'motion/react'

export function IndustrialFooter() {
  return (
    <footer className="bg-industrial-steel border-t border-industrial-gray/20 py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-bebas text-4xl text-industrial-white">
              JIMMY<span className="text-industrial-red">BEEF</span>
            </h3>
            <p className="font-mono text-xs text-industrial-gray mt-4 max-w-sm leading-relaxed">
              {'// PREMIUM MEAT SUPPLIER'}
              <br />
              {'// GLOBAL DISTRIBUTION SINCE 2010'}
              <br />
              {'// BEEF • PORK • CHICKEN'}
            </p>
            <div className="flex gap-2 mt-6">
              {['LI', 'IG', 'WC'].map((social) => (
                <motion.a
                  key={social}
                  href="#"
                  className="w-10 h-10 flex items-center justify-center bg-industrial-black/50 border border-industrial-gray/20 text-industrial-gray hover:border-industrial-red hover:text-industrial-red transition-colors font-mono text-xs"
                  whileHover={{ y: -2 }}
                >
                  {social}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-mono text-xs text-industrial-red mb-4">{'// NAVIGATION'}</h4>
            <ul className="space-y-2">
              {['ABOUT', 'PRODUCTS', 'CERTIFICATIONS', 'CONTACT'].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase()}`}
                    className="font-mono text-sm text-industrial-gray hover:text-industrial-white transition-colors"
                  >
                    → {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-mono text-xs text-industrial-red mb-4">{'// PRODUCTS'}</h4>
            <ul className="space-y-2">
              {['PREMIUM_BEEF', 'HERITAGE_PORK', 'FREE_RANGE_CHICKEN', 'SPECIALTY'].map((product) => (
                <li key={product}>
                  <a
                    href="#products"
                    className="font-mono text-sm text-industrial-gray hover:text-industrial-white transition-colors"
                  >
                    → {product}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-industrial-gray/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-xs text-industrial-gray">
            © {new Date().getFullYear()} JIMMY_BEEF {'// ALL_RIGHTS_RESERVED'}
          </p>
          <div className="flex gap-6">
            <a href="#" className="font-mono text-xs text-industrial-gray hover:text-industrial-white transition-colors">
              PRIVACY
            </a>
            <a href="#" className="font-mono text-xs text-industrial-gray hover:text-industrial-white transition-colors">
              TERMS
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
