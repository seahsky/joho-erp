'use client'

import { motion } from 'motion/react'

export function OrganicFooter() {
  return (
    <footer className="bg-organic-earth text-white py-16">
      {/* Wave top */}
      <svg className="w-full h-12 -mt-16 mb-8" viewBox="0 0 1440 48" preserveAspectRatio="none">
        <path
          d="M0,48 C360,0 720,48 1080,24 C1260,12 1380,36 1440,24 L1440,48 L0,48 Z"
          fill="currentColor"
          className="text-organic-earth"
        />
      </svg>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🥩</span>
              <h3 className="font-fraunces text-2xl">Joho Foods</h3>
            </div>
            <p className="font-nunito text-white/70 max-w-sm leading-relaxed">
              Premium beef, pork, and chicken from family farms.
              Naturally raised, responsibly sourced since 2010.
            </p>
            <div className="flex gap-3 mt-6">
              {[
                { name: 'LinkedIn', emoji: '💼' },
                { name: 'Instagram', emoji: '📸' },
                { name: 'WeChat', emoji: '💬' },
              ].map((social) => (
                <motion.a
                  key={social.name}
                  href="#"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-organic-terracotta transition-colors"
                  whileHover={{ y: -2 }}
                  title={social.name}
                >
                  <span>{social.emoji}</span>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-fraunces text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {['About', 'Products', 'Certifications', 'Contact'].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase()}`}
                    className="font-nunito text-white/70 hover:text-organic-wheat transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-fraunces text-lg mb-4">Products</h4>
            <ul className="space-y-3">
              {['Premium Beef', 'Heritage Pork', 'Free Range Chicken', 'Specialty Items'].map((product) => (
                <li key={product}>
                  <a
                    href="#products"
                    className="font-nunito text-white/70 hover:text-organic-wheat transition-colors"
                  >
                    {product}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-nunito text-sm text-white/50">
            © {new Date().getFullYear()} Joho Foods. All rights reserved.
          </p>
          <div className="flex items-center gap-2 font-nunito text-sm text-white/50">
            <span>Made with</span>
            <span className="text-red-400">❤️</span>
            <span>for quality</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
