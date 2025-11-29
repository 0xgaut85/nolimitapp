'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CodeBlock, ApiPlayground, ApiKeyManager } from '@/components/integration';
import { Card } from '@/components/ui/Card';

type TabId = 'overview' | 'auth' | 'reference' | 'examples' | 'playground' | 'keys';

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'auth', label: 'Authentication' },
  { id: 'reference', label: 'API Reference' },
  { id: 'examples', label: 'Code Examples' },
  { id: 'playground', label: 'Playground' },
  { id: 'keys', label: 'API Keys' },
];

export default function IntegrationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-8 border-b border-white/10 pb-8">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-mono text-white mb-4"
        >
          <span className="text-[#b8d1b3]">[</span>INTEGRATION<span className="text-[#b8d1b3]">]</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/60 font-mono max-w-2xl text-lg"
        >
          Integrate noLimit&apos;s uncensored AI into your application. Pay-per-request with crypto or use API keys for enterprise access.
        </motion.p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-mono text-sm rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-[#b8d1b3]/20 text-[#b8d1b3] border border-[#b8d1b3]/30'
                : 'text-white/50 hover:text-white/80 border border-transparent hover:border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && <OverviewSection />}
        {activeTab === 'auth' && <AuthSection />}
        {activeTab === 'reference' && <ReferenceSection />}
        {activeTab === 'examples' && <ExamplesSection />}
        {activeTab === 'playground' && <PlaygroundSection />}
        {activeTab === 'keys' && <KeysSection />}
      </motion.div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div className="space-y-8">
      <Section title="What is noLimit?">
        <p className="text-white/70 font-mono leading-relaxed mb-6">
          noLimit provides an uncensored AI API that answers any question without restrictions. 
          Built on Venice AI, it offers complete privacy with zero data retention.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6" glow>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#b8d1b3]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#b8d1b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-white font-mono font-bold">Zero Censorship</h4>
            </div>
            <p className="text-white/50 font-mono text-sm">No content filters, no refusals, no moral judgments. Get direct answers to any question.</p>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-white font-mono font-bold">Privacy First</h4>
            </div>
            <p className="text-white/50 font-mono text-sm">No data retention. Your conversations are not stored or used for training.</p>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-white font-mono font-bold">Crypto Payments</h4>
            </div>
            <p className="text-white/50 font-mono text-sm">Pay per request with USDC on Base or Solana. No subscriptions, no KYC.</p>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-white font-mono font-bold">Fast & Simple</h4>
            </div>
            <p className="text-white/50 font-mono text-sm">Single POST request. No complex setup. Integrate in minutes.</p>
          </Card>
        </div>
      </Section>

      <Section title="Quick Start">
        <CodeBlock
          language="bash"
          label="TERMINAL"
          code={`# Install the x402 payment client (for crypto payments)
npm install x402-fetch

# Or use API keys for server-to-server calls
curl -X POST https://x402.nolimit.foundation/api/agent \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{"message": "Hello, world!"}'`}
        />
      </Section>

      <Section title="Pricing">
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6" glow>
            <h4 className="text-[#b8d1b3] font-mono mb-2 text-sm uppercase tracking-wider">noLimit LLM</h4>
            <p className="text-3xl text-white font-mono font-bold mb-1">$0.05</p>
            <p className="text-xs text-white/40 font-mono">USDC per request</p>
          </Card>
          <Card className="p-6">
            <h4 className="text-white/60 font-mono mb-2 text-sm uppercase tracking-wider">noLimit Swap</h4>
            <p className="text-3xl text-white font-mono font-bold mb-1">$0.10</p>
            <p className="text-xs text-white/40 font-mono">USDC per transaction</p>
          </Card>
        </div>
      </Section>
    </div>
  );
}

function AuthSection() {
  return (
    <div className="space-y-8">
      <Section title="Authentication Methods">
        <p className="text-white/70 font-mono mb-6">
          noLimit supports two authentication methods. Choose based on your use case.
        </p>
      </Section>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6" glow>
          <h3 className="text-[#b8d1b3] font-mono text-lg mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#b8d1b3]/20 flex items-center justify-center text-sm">1</span>
            x402 Payment Protocol
          </h3>
          <p className="text-white/60 font-mono text-sm mb-4">
            Best for client-side apps where users pay directly with their crypto wallet. 
            Uses the HTTP 402 Payment Required flow.
          </p>
          <ul className="space-y-2 text-sm font-mono text-white/50">
            <li className="flex items-center gap-2">
              <span className="text-[#b8d1b3]">+</span> Users pay per request
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#b8d1b3]">+</span> No API keys needed
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#b8d1b3]">+</span> Supports Base & Solana
            </li>
            <li className="flex items-center gap-2">
              <span className="text-white/30">-</span> Requires wallet connection
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="text-white font-mono text-lg mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">2</span>
            API Keys
          </h3>
          <p className="text-white/60 font-mono text-sm mb-4">
            Best for server-to-server integrations and enterprise apps. 
            Uses standard API key authentication.
          </p>
          <ul className="space-y-2 text-sm font-mono text-white/50">
            <li className="flex items-center gap-2">
              <span className="text-[#b8d1b3]">+</span> Simple integration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#b8d1b3]">+</span> No wallet required
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#b8d1b3]">+</span> Rate-limited access
            </li>
            <li className="flex items-center gap-2">
              <span className="text-white/30">-</span> Limited to 1000 req/day
            </li>
          </ul>
        </Card>
      </div>

      <Section title="x402 Payment Flow">
        <CodeBlock
          language="typescript"
          label="x402-client.ts"
          code={`import { wrapFetchWithPayment } from 'x402-fetch';

// Wrap fetch with payment handler (requires wallet signer)
const x402Fetch = wrapFetchWithPayment(walletClient, userAddress);

// Make request - payment is handled automatically
const response = await x402Fetch('https://x402.nolimit.foundation/noLimitLLM', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Your question here',
    userAddress: '0x...'
  })
});

const data = await response.json();
console.log(data.response);`}
        />
      </Section>

      <Section title="API Key Authentication">
        <CodeBlock
          language="typescript"
          label="apikey-client.ts"
          code={`// Simple fetch with API key header
const response = await fetch('https://x402.nolimit.foundation/api/agent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'nl_your_api_key_here'
  },
  body: JSON.stringify({
    message: 'Your question here'
  })
});

const data = await response.json();
console.log(data.response);`}
        />
      </Section>
    </div>
  );
}

function ReferenceSection() {
  return (
    <div className="space-y-8">
      <Section title="Endpoints">
        <div className="space-y-4">
          <EndpointCard
            method="POST"
            path="/api/agent"
            description="Send a message to noLimit LLM using API key authentication"
            auth="API Key"
          />
          <EndpointCard
            method="POST"
            path="/noLimitLLM"
            description="Send a message to noLimit LLM using x402 payment (Base)"
            auth="x402 (Base)"
          />
          <EndpointCard
            method="POST"
            path="/noLimitLLM/solana"
            description="Send a message to noLimit LLM using x402 payment (Solana)"
            auth="x402 (Solana)"
          />
        </div>
      </Section>

      <Section title="Request Body">
        <CodeBlock
          language="typescript"
          label="types.ts"
          code={`interface AgentRequest {
  // Required: The message to send to the AI
  message: string;
  
  // Optional: Previous conversation for context (max 10 messages)
  conversationHistory?: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  
  // Required for x402 routes, optional for API key routes
  userAddress?: string;
}`}
        />
      </Section>

      <Section title="Response">
        <CodeBlock
          language="typescript"
          label="types.ts"
          code={`// Success Response (200)
interface AgentResponse {
  response: string;  // The AI's response
}

// Error Response (4xx/5xx)
interface ErrorResponse {
  error: string;     // Error message
  hint?: string;     // Helpful suggestion
}`}
        />
      </Section>

      <Section title="Error Codes">
        <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="p-4 text-white/50">Code</th>
                <th className="p-4 text-white/50">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="p-4 text-[#b8d1b3]">200</td>
                <td className="p-4 text-white/70">Success</td>
              </tr>
              <tr>
                <td className="p-4 text-amber-400">400</td>
                <td className="p-4 text-white/70">Bad Request - Missing required fields</td>
              </tr>
              <tr>
                <td className="p-4 text-amber-400">401</td>
                <td className="p-4 text-white/70">Unauthorized - Invalid or missing API key</td>
              </tr>
              <tr>
                <td className="p-4 text-amber-400">402</td>
                <td className="p-4 text-white/70">Payment Required - x402 payment needed</td>
              </tr>
              <tr>
                <td className="p-4 text-amber-400">429</td>
                <td className="p-4 text-white/70">Rate Limit - Daily limit exceeded</td>
              </tr>
              <tr>
                <td className="p-4 text-red-400">500</td>
                <td className="p-4 text-white/70">Server Error - Something went wrong</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function ExamplesSection() {
  const [activeExample, setActiveExample] = useState<'curl' | 'fetch' | 'react' | 'node'>('curl');

  const examples = {
    curl: {
      label: 'cURL',
      code: `# Using API Key
curl -X POST https://x402.nolimit.foundation/api/agent \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: nl_your_api_key" \\
  -d '{
    "message": "Explain quantum computing in simple terms"
  }'

# Response
{
  "response": "Quantum computing uses quantum bits (qubits) that can exist in multiple states simultaneously..."
}`,
    },
    fetch: {
      label: 'JavaScript',
      code: `// Simple fetch with API key
async function askNoLimit(message: string) {
  const response = await fetch('https://x402.nolimit.foundation/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NOLIMIT_API_KEY!,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(\`Request failed: \${response.status}\`);
  }

  const data = await response.json();
  return data.response;
}

// Usage
const answer = await askNoLimit('What is the meaning of life?');
console.log(answer);`,
    },
    react: {
      label: 'React Hook',
      code: `import { useState, useCallback } from 'react';

interface UseNoLimitOptions {
  apiKey: string;
}

export function useNoLimit({ apiKey }: UseNoLimitOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (message: string, history?: Array<{role: string; content: string}>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://x402.nolimit.foundation/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ message, conversationHistory: history }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Request failed');
      }

      const data = await response.json();
      return data.response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  return { ask, loading, error };
}

// Usage in component
function ChatComponent() {
  const { ask, loading, error } = useNoLimit({ apiKey: 'nl_xxx' });
  
  const handleSubmit = async (message: string) => {
    const response = await ask(message);
    console.log(response);
  };
  
  return (/* your UI */);
}`,
    },
    node: {
      label: 'Node.js',
      code: `// server.js - Express middleware example
import express from 'express';

const app = express();
app.use(express.json());

const NOLIMIT_API_KEY = process.env.NOLIMIT_API_KEY;

// Proxy endpoint to hide your API key from clients
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    const response = await fetch('https://x402.nolimit.foundation/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': NOLIMIT_API_KEY,
      },
      body: JSON.stringify({
        message,
        conversationHistory: history,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('NoLimit API error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));`,
    },
  };

  return (
    <div className="space-y-8">
      <Section title="Code Examples">
        <p className="text-white/70 font-mono mb-6">
          Ready-to-use code snippets for common use cases. Copy and paste into your project.
        </p>

        <div className="flex gap-2 mb-4">
          {(Object.keys(examples) as Array<keyof typeof examples>).map((key) => (
            <button
              key={key}
              onClick={() => setActiveExample(key)}
              className={`px-3 py-1 font-mono text-sm rounded-lg border transition-all ${
                activeExample === key
                  ? 'bg-[#b8d1b3]/20 border-[#b8d1b3]/30 text-[#b8d1b3]'
                  : 'border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              {examples[key].label}
            </button>
          ))}
        </div>

        <CodeBlock
          language={activeExample === 'curl' ? 'bash' : 'typescript'}
          code={examples[activeExample].code}
          showLineNumbers
        />
      </Section>

      <Section title="TypeScript Types">
        <p className="text-white/70 font-mono mb-4">
          Copy these types into your project for full type safety.
        </p>
        <CodeBlock
          language="typescript"
          label="nolimit-types.ts"
          code={`// noLimit API Types
export interface NoLimitRequest {
  message: string;
  conversationHistory?: ConversationMessage[];
  userAddress?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface NoLimitResponse {
  response: string;
}

export interface NoLimitError {
  error: string;
  hint?: string;
}

// Helper type guard
export function isNoLimitError(data: unknown): data is NoLimitError {
  return typeof data === 'object' && data !== null && 'error' in data;
}`}
        />
      </Section>
    </div>
  );
}

function PlaygroundSection() {
  return (
    <div className="space-y-8">
      <Section title="API Playground">
        <p className="text-white/70 font-mono mb-6">
          Test the API directly in your browser. Enter your API key and send a request.
        </p>
      </Section>
      
      <ApiPlayground />

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-white/50 font-mono text-sm">
          <span className="text-[#b8d1b3]">Tip:</span> Don&apos;t have an API key? Go to the &quot;API Keys&quot; tab and create one.
          Or use the Agent Chat page to test with x402 wallet payments.
        </p>
      </div>
    </div>
  );
}

function KeysSection() {
  return (
    <div className="space-y-8">
      <Section title="API Key Management">
        <p className="text-white/70 font-mono mb-6">
          Create and manage your API keys. Each key has a rate limit of 1,000 requests per day.
        </p>
      </Section>

      <ApiKeyManager />

      <Section title="Best Practices">
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h4 className="text-white font-mono text-sm mb-2">Keep Keys Secure</h4>
            <p className="text-white/50 font-mono text-xs">
              Never expose API keys in client-side code. Use environment variables and server-side proxies.
            </p>
          </Card>
          <Card className="p-5">
            <h4 className="text-white font-mono text-sm mb-2">Rotate Regularly</h4>
            <p className="text-white/50 font-mono text-xs">
              Create new keys periodically and delete old ones to maintain security.
            </p>
          </Card>
          <Card className="p-5">
            <h4 className="text-white font-mono text-sm mb-2">Use Descriptive Names</h4>
            <p className="text-white/50 font-mono text-xs">
              Name keys by environment or purpose (e.g., &quot;Production API&quot;, &quot;Dev Testing&quot;).
            </p>
          </Card>
          <Card className="p-5">
            <h4 className="text-white font-mono text-sm mb-2">Monitor Usage</h4>
            <p className="text-white/50 font-mono text-xs">
              Track your daily usage to ensure you stay within rate limits.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}

// Helper Components

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="relative pl-6 border-l border-white/10">
      <div className="absolute -left-[5px] top-1 w-2 h-2 bg-[#b8d1b3]/50 rounded-full" />
      <h2 className="text-xl font-mono text-white mb-4 tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function EndpointCard({ method, path, description, auth }: { 
  method: string; 
  path: string; 
  description: string;
  auth: string;
}) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-start gap-4">
      <span className={`px-2 py-1 text-xs font-mono font-bold rounded ${
        method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
        method === 'POST' ? 'bg-green-500/20 text-green-400' :
        'bg-amber-500/20 text-amber-400'
      }`}>
        {method}
      </span>
      <div className="flex-1">
        <code className="text-[#b8d1b3] font-mono text-sm">{path}</code>
        <p className="text-white/50 font-mono text-xs mt-1">{description}</p>
      </div>
      <span className="px-2 py-1 text-xs font-mono text-white/40 border border-white/10 rounded">
        {auth}
      </span>
    </div>
  );
}
