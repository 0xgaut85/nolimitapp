export default function IntegrationPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-mono text-white glow-text mb-8">
        [Integration Guide]
      </h1>

      <div className="space-y-8">
        <Section title="Getting Started">
          <p className="text-white/80 font-mono mb-4">
            NoLimit provides a simple API to integrate x402 payment-gated services into your dApp.
          </p>
          <CodeBlock>
            {`npm install x402-fetch`}
          </CodeBlock>
        </Section>

        <Section title="API Key">
          <p className="text-white/80 font-mono mb-4">
            Contact us to get your API key for production use. For development, you can use the public endpoint.
          </p>
          <CodeBlock>
            {`const API_KEY = 'your-api-key-here';
const API_URL = 'https://x402.nolimit.foundation';`}
          </CodeBlock>
        </Section>

        <Section title="Integrating AI Agent">
          <p className="text-white/80 font-mono mb-4">
            Use the AI Agent API to add intelligent chat functionality to your dApp.
          </p>
          <CodeBlock>
            {`import { x402Fetch } from 'x402-fetch';

async function chatWithAgent(message: string, userAddress: string) {
  const response = await x402Fetch('https://x402.nolimit.foundation/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, userAddress }),
  });
  
  const data = await response.json();
  return data.response;
}`}
          </CodeBlock>
        </Section>

        <Section title="Fee Structure">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <ul className="space-y-2 font-mono text-white/80">
              <li>• AI Agent: 0.05 USDC per message</li>
              <li>• Swap: 0.10 USDC per transaction</li>
              <li>• Payments processed via x402 on Base and Solana</li>
            </ul>
          </div>
        </Section>

        <Section title="Support">
          <p className="text-white/80 font-mono">
            For technical support and integration questions, visit our documentation or contact us at support@nolimit.foundation
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-mono text-white mb-4 bracket-text">{title}</h2>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-4 overflow-x-auto">
      <code className="text-sm text-accent-glow font-mono">{children}</code>
    </pre>
  );
}

