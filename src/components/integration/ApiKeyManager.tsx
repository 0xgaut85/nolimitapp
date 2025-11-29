'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { config } from '@/config';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  rateLimit: number;
  usageCount: number;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export function ApiKeyManager() {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  
  const connectedAddress = evmAddress || solanaAccount.address;
  const isConnected = evmConnected || solanaAccount.isConnected;

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!connectedAddress) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${config.x402ServerUrl}/api/keys?userAddress=${connectedAddress}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch API keys');
      }

      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch keys');
    } finally {
      setLoading(false);
    }
  }, [connectedAddress]);

  useEffect(() => {
    if (isConnected && connectedAddress) {
      fetchKeys();
    }
  }, [isConnected, connectedAddress, fetchKeys]);

  const createKey = async () => {
    if (!connectedAddress || !newKeyName.trim()) return;

    setCreating(true);
    setError(null);
    setNewlyCreatedKey(null);

    try {
      const res = await fetch(`${config.x402ServerUrl}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: connectedAddress,
          name: newKeyName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create API key');
      }

      // Show the full key (only shown once)
      setNewlyCreatedKey(data.key);
      setNewKeyName('');
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!connectedAddress) return;

    try {
      const res = await fetch(`${config.x402ServerUrl}/api/keys/${id}?userAddress=${connectedAddress}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete API key');
      }

      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key');
    }
  };

  const toggleKey = async (id: string, active: boolean) => {
    if (!connectedAddress) return;

    try {
      const res = await fetch(`${config.x402ServerUrl}/api/keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: connectedAddress,
          active: !active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update API key');
      }

      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update key');
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h3 className="text-lg font-mono text-white mb-2">Connect Your Wallet</h3>
        <p className="text-sm text-white/50 font-mono">
          Connect your wallet to create and manage API keys
        </p>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <h3 className="font-mono text-white text-sm uppercase tracking-wider mb-4">Your API Keys</h3>
        
        {/* Create new key form */}
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production App)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#b8d1b3]/50"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="px-4 py-2 bg-[#b8d1b3] text-black font-mono text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#a8c1a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Key'}
          </motion.button>
        </div>
      </div>

      {/* Newly created key alert */}
      <AnimatePresence>
        {newlyCreatedKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[#b8d1b3]/30 bg-[#b8d1b3]/10 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-mono text-[#b8d1b3] mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  API Key Created - Copy it now, you won&apos;t see it again!
                </p>
                <code className="block bg-black/40 rounded-lg px-3 py-2 font-mono text-sm text-white break-all">
                  {newlyCreatedKey}
                </code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newlyCreatedKey);
                }}
                className="px-3 py-1 bg-[#b8d1b3] text-black font-mono text-xs font-bold rounded hover:bg-[#a8c1a3] transition-colors"
              >
                Copy
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 p-4">
          <p className="text-red-400 font-mono text-sm">{error}</p>
        </div>
      )}

      {/* Keys list */}
      <div className="divide-y divide-white/5">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-[#b8d1b3] rounded-full animate-spin mx-auto" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-white/50 font-mono text-sm">No API keys yet. Create one above.</p>
          </div>
        ) : (
          keys.map((key) => (
            <div key={key.id} className="p-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${key.active ? 'bg-[#b8d1b3]' : 'bg-white/20'}`} />
                  <span className="font-mono text-white text-sm">{key.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleKey(key.id, key.active)}
                    className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                      key.active
                        ? 'border-[#b8d1b3]/30 text-[#b8d1b3] hover:bg-[#b8d1b3]/10'
                        : 'border-white/10 text-white/50 hover:text-white/80'
                    }`}
                  >
                    {key.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteKey(key.id)}
                    className="px-2 py-1 text-xs font-mono rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-white/40">
                <span className="bg-white/5 px-2 py-0.5 rounded">{key.key}</span>
                <span>{key.usageCount} / {key.rateLimit} requests today</span>
                <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

