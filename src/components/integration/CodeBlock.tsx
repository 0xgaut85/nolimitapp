'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface CodeBlockProps {
  code: string;
  language?: string;
  label?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = 'typescript', label, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="relative group">
      {label && (
        <div className="absolute right-14 top-3 text-[10px] font-mono text-white/30 uppercase tracking-widest border border-white/10 px-2 py-1 rounded bg-black/40">
          {label}
        </div>
      )}
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleCopy}
        className="absolute right-3 top-3 p-2 text-white/40 hover:text-white/80 transition-colors bg-white/5 rounded border border-white/10 hover:border-white/20"
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-[#b8d1b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </motion.button>

      <pre className="bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 p-5 overflow-x-auto font-mono text-sm leading-relaxed">
        <code className="text-[#b8d1b3]/90">
          {showLineNumbers ? (
            lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-white/20 w-8 select-none text-right pr-4">{i + 1}</span>
                <span>{highlightSyntax(line, language)}</span>
              </div>
            ))
          ) : (
            highlightSyntax(code, language)
          )}
        </code>
      </pre>
    </div>
  );
}

// Simple syntax highlighting
function highlightSyntax(code: string, language: string): React.ReactNode {
  if (language === 'bash' || language === 'shell') {
    return code.split('\n').map((line, i) => (
      <span key={i}>
        {line.startsWith('$') || line.startsWith('#') ? (
          <>
            <span className="text-white/40">{line.charAt(0)} </span>
            <span className="text-[#b8d1b3]">{line.slice(2)}</span>
          </>
        ) : (
          <span className="text-white/70">{line}</span>
        )}
        {i < code.split('\n').length - 1 && '\n'}
      </span>
    ));
  }

  // Basic TypeScript/JavaScript highlighting
  const keywords = ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'import', 'from', 'export', 'if', 'else', 'try', 'catch', 'throw', 'new', 'class', 'interface', 'type'];
  const types = ['string', 'number', 'boolean', 'void', 'any', 'Promise', 'Response', 'Error'];
  
  let result = code;
  
  // Highlight strings
  result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-amber-400/80">$&</span>');
  
  // Highlight keywords
  keywords.forEach(kw => {
    result = result.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span class="text-purple-400/90">${kw}</span>`);
  });
  
  // Highlight types
  types.forEach(t => {
    result = result.replace(new RegExp(`\\b${t}\\b`, 'g'), `<span class="text-cyan-400/80">${t}</span>`);
  });
  
  // Highlight comments
  result = result.replace(/(\/\/.*$)/gm, '<span class="text-white/30">$1</span>');
  
  return <span dangerouslySetInnerHTML={{ __html: result }} />;
}

