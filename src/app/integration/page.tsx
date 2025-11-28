import { Card } from '@/components/ui/Card';

export default function IntegrationPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12 border-b border-white/10 pb-8">
        <h1 className="text-4xl font-mono text-white glow-text mb-4">
          [INTEGRATION_GUIDE]
        </h1>
        <p className="text-white/60 font-mono max-w-2xl">
          TECHNICAL_DOCUMENTATION // X402_PROTOCOL_V1
        </p>
      </div>

      <div className="space-y-12">
        <Section title="01_INITIALIZATION">
          <p className="text-white/80 font-mono mb-6 leading-relaxed">
            NoLimit provides a high-performance API for integrating payment-gated services directly into your dApp infrastructure.
          </p>
          <CodeBlock label="TERMINAL">
            {`npm install x402-fetch`}
          </CodeBlock>
        </Section>

        <Section title="02_AUTHENTICATION">
          <p className="text-white/80 font-mono mb-6 leading-relaxed">
            Secure your endpoints with API keys. For production environments, contact the NoLimit Foundation.
          </p>
          <CodeBlock label="CONFIG.TS">
            {`const API_KEY = 'your-api-key-here';
const API_URL = 'https://x402.nolimit.foundation';`}
          </CodeBlock>
        </Section>

        <Section title="03_AGENT_INTEGRATION">
          <p className="text-white/80 font-mono mb-6 leading-relaxed">
            Implement the AI Agent interface using standard POST requests. The x402 protocol handles payment verification automatically.
          </p>
          <CodeBlock label="AGENT_SERVICE.TS">
            {`import { x402Fetch } from 'x402-fetch';

async function chatWithAgent(message: string, userAddress: string) {
  // Automatic 402 Payment Handling
  const response = await x402Fetch('https://x402.nolimit.foundation/noLimitLLM', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, userAddress }),
  });
  
  const data = await response.json();
  return data.response;
}`}
          </CodeBlock>
        </Section>

        <Section title="04_FEE_STRUCTURE">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6" glow>
              <h4 className="text-accent-glow font-mono mb-2">[noLimit_LLM]</h4>
              <p className="text-2xl text-white font-mono">0.05 USDC</p>
              <p className="text-xs text-white/40 font-mono mt-2">PER_MESSAGE_REQUEST</p>
            </Card>
            <Card className="p-6">
              <h4 className="text-accent-glow font-mono mb-2">[noLimit_Swap]</h4>
              <p className="text-2xl text-white font-mono">0.10 USDC</p>
              <p className="text-xs text-white/40 font-mono mt-2">PER_TRANSACTION_EXECUTION</p>
            </Card>
          </div>
        </Section>

        <Section title="05_SUPPORT">
          <p className="text-white/80 font-mono">
            For technical assistance, establish a secure connection with: <span className="text-accent-glow">support@nolimit.foundation</span>
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="relative pl-6 border-l border-white/10">
      <div className="absolute -left-[5px] top-0 w-2 h-2 bg-accent-glow/50 rounded-full" />
      <h2 className="text-xl font-mono text-white mb-6 tracking-widest">{title}</h2>
      {children}
    </section>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="relative group">
      {label && (
        <div className="absolute right-4 top-4 text-[10px] font-mono text-white/20 uppercase tracking-widest border border-white/10 px-2 py-1 rounded">
          {label}
        </div>
      )}
      <pre className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-6 overflow-x-auto font-mono text-sm leading-relaxed">
        <code className="text-accent-glow/90">{children}</code>
      </pre>
    </div>
  );
}
