'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { config } from '@/config';

type AuthMethod = 'x402' | 'apikey';

export function ApiPlayground() {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  
  const [authMethod, setAuthMethod] = useState<AuthMethod>('apikey');
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('What is the capital of France?');
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connectedAddress = evmAddress || solanaAccount.address;
  const isConnected = evmConnected || solanaAccount.isConnected;

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      if (authMethod === 'apikey') {
        if (!apiKey.trim()) {
          throw new Error('Please enter your API key');
        }

        const res = await fetch(`${config.x402ServerUrl}/api/agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey.trim(),
          },
          body: JSON.stringify({ message }),
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Request failed');
        }

        setResponse(JSON.stringify(data, null, 2));
      } else {
        // x402 payment flow - would need wallet integration
        if (!isConnected) {
          throw new Error('Please connect your wallet to use x402 payment');
        }
        throw new Error('x402 playground requires wallet integration. Use the Agent Chat page for full x402 experience.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      <div className="border-b border-white/10 p-4 flex items-center justify-between">
        <h3 className="font-mono text-white text-sm uppercase tracking-wider">API Playground</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setAuthMethod('apikey')}
            className={`px-3 py-1 text-xs font-mono rounded-lg border transition-all ${
              authMethod === 'apikey'
                ? 'bg-[#b8d1b3]/20 border-[#b8d1b3]/40 text-[#b8d1b3]'
                : 'border-white/10 text-white/50 hover:text-white/80'
            }`}
          >
            API Key
          </button>
          <button
            onClick={() => setAuthMethod('x402')}
            className={`px-3 py-1 text-xs font-mono rounded-lg border transition-all ${
              authMethod === 'x402'
                ? 'bg-[#b8d1b3]/20 border-[#b8d1b3]/40 text-[#b8d1b3]'
                : 'border-white/10 text-white/50 hover:text-white/80'
            }`}
          >
            x402 Payment
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {authMethod === 'apikey' && (
          <div>
            <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="nl_xxxxxxxxxxxxxxxx"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#b8d1b3]/50"
            />
          </div>
        )}

        {authMethod === 'x402' && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-sm text-white/60 font-mono">
              {isConnected ? (
                <>Connected: <span className="text-[#b8d1b3]">{connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}</span></>
              ) : (
                'Connect your wallet to test x402 payment flow'
              )}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-mono text-white/50 uppercase tracking-wider mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#b8d1b3]/50 resize-none"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSend}
          disabled={loading}
          className="w-full bg-[#b8d1b3] text-black py-3 font-mono text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#a8c1a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            'Send Request'
          )}
        </motion.button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {response && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Response
              </label>
              <button
                onClick={() => navigator.clipboard.writeText(response)}
                className="text-xs font-mono text-white/40 hover:text-white/80 transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="bg-black/60 border border-white/10 rounded-lg p-4 overflow-x-auto font-mono text-sm text-[#b8d1b3]/90 max-h-64 overflow-y-auto">
              {response}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

