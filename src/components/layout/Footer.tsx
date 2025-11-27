'use client';

import Link from 'next/link';
import Image from 'next/image';

interface FooterLink {
  name: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export function Footer() {
  const columns: FooterColumn[] = [
    {
      title: 'Product',
      links: [
        { name: 'AI Agent', href: '/agent' },
        { name: 'Swap', href: '/swap' },
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Integration', href: '/integration' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', href: 'https://nolimit.foundation/docs', external: true },
        { name: 'Main Site', href: 'https://nolimit.foundation', external: true }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: 'https://nolimit.foundation', external: true },
        { name: 'Twitter', href: 'https://x.com/nolimitFDN', external: true }
      ]
    }
  ];

  return (
    <footer className="bg-black py-8 md:py-12 px-4 md:px-8 border-t border-white/10 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image 
                src="/logo3.svg" 
                alt="nolimit Logo" 
                width={180} 
                height={180}
                className="object-contain w-[120px] md:w-[150px] lg:w-[180px]"
              />
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Privacy-first decentralized finance.
            </p>
          </div>
          
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-mono text-sm text-white mb-4">
                [{column.title}]
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.name}>
                    {link.external ? (
                      <a 
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/70 hover:text-white hover:text-[#7fff00] transition-colors"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link 
                        href={link.href} 
                        className="text-sm text-white/70 hover:text-white hover:text-[#7fff00] transition-colors"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-white/10 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
          <p className="text-xs md:text-sm text-white/50 font-mono text-center md:text-left">
            © 2025 nolimit foundation. All rights reserved.
          </p>
          <div className="flex gap-4 md:gap-6 text-xs md:text-sm text-white/50 flex-wrap justify-center">
            <a href="https://nolimit.foundation/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-opacity">Privacy Policy</a>
            <a href="https://nolimit.foundation/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-opacity">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
