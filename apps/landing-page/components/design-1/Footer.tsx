'use client'

import { motion } from 'framer-motion'

export function EditorialFooter() {
  return (
    <footer className="bg-editorial-charcoal text-white py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-cormorant text-3xl font-semibold">Jimmy Beef</h3>
            <p className="font-dm text-white/60 mt-4 max-w-sm">
              Your trusted partner for premium beef, pork, and chicken.
              Delivering quality worldwide since 2010.
            </p>
            <div className="flex gap-4 mt-6">
              {['LinkedIn', 'Instagram', 'WeChat'].map((social) => (
                <motion.a
                  key={social}
                  href="#"
                  className="w-10 h-10 flex items-center justify-center border border-white/20 text-white/60 hover:border-editorial-gold hover:text-editorial-gold transition-colors"
                  whileHover={{ y: -2 }}
                >
                  <span className="text-xs font-dm">{social[0]}</span>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-cormorant text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {['About', 'Products', 'Certifications', 'Contact'].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase()}`}
                    className="font-dm text-sm text-white/60 hover:text-editorial-gold transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-cormorant text-lg mb-4">Products</h4>
            <ul className="space-y-3">
              {['Premium Beef', 'Heritage Pork', 'Free Range Chicken', 'Specialty Items'].map((product) => (
                <li key={product}>
                  <a
                    href="#products"
                    className="font-dm text-sm text-white/60 hover:text-editorial-gold transition-colors"
                  >
                    {product}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-dm text-sm text-white/40">
            © {new Date().getFullYear()} Jimmy Beef. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="font-dm text-xs text-white/40 hover:text-white/60 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="font-dm text-xs text-white/40 hover:text-white/60 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
