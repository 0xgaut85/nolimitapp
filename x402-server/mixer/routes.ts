/**
 * Mixer API Routes
 */

import express from 'express';
import { 
  createMixRequest, 
  confirmDeposit, 
  getMixStatus, 
  calculateFee 
} from './engine';
import { walletPool } from './wallets';

const router = express.Router();

// Initialize wallet pool
walletPool.initialize();

/**
 * POST /mixer/create
 * Create a new mix request
 */
router.post('/create', async (req, res) => {
  try {
    const { chain, token, amount, senderAddress, recipientAddress, delayMinutes } = req.body;

    // Validation
    if (!chain || !['base', 'solana'].includes(chain)) {
      return res.status(400).json({ error: 'Invalid chain. Must be "base" or "solana"' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!senderAddress) {
      return res.status(400).json({ error: 'Sender address is required' });
    }

    if (!recipientAddress) {
      return res.status(400).json({ error: 'Recipient address is required' });
    }

    // Create mix request
    const result = await createMixRequest({
      chain,
      token,
      amount,
      senderAddress,
      recipientAddress,
      delayMinutes: delayMinutes || 0,
    });

    // Calculate fee breakdown
    const { fee, netAmount } = calculateFee(amount);

    res.json({
      success: true,
      mixId: result.id,
      depositAddress: result.depositAddress,
      depositAmount: result.depositAmount,
      fee,
      outputAmount: netAmount,
      message: `Send ${amount} ${token} to the deposit address to start mixing`,
    });
  } catch (error) {
    console.error('[Mixer] Create error:', error);
    res.status(500).json({ error: 'Failed to create mix request' });
  }
});

/**
 * POST /mixer/confirm
 * Confirm deposit and start mixing
 */
router.post('/confirm', async (req, res) => {
  try {
    const { mixId, txHash } = req.body;

    if (!mixId) {
      return res.status(400).json({ error: 'Mix ID is required' });
    }

    if (!txHash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    await confirmDeposit(mixId, txHash);

    res.json({
      success: true,
      message: 'Deposit confirmed, mixing started',
    });
  } catch (error) {
    console.error('[Mixer] Confirm error:', error);
    res.status(500).json({ error: 'Failed to confirm deposit' });
  }
});

/**
 * GET /mixer/status/:id
 * Get mix request status
 */
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const status = await getMixStatus(id);

    if (!status) {
      return res.status(404).json({ error: 'Mix request not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('[Mixer] Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * GET /mixer/quote
 * Get fee quote for a mix
 */
router.get('/quote', (req, res) => {
  try {
    const amount = req.query.amount as string;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const { fee, netAmount } = calculateFee(amount);

    res.json({
      inputAmount: amount,
      fee,
      feePercent: 1,
      outputAmount: netAmount,
    });
  } catch (error) {
    console.error('[Mixer] Quote error:', error);
    res.status(500).json({ error: 'Failed to calculate quote' });
  }
});

/**
 * GET /mixer/deposit-address
 * Get deposit address for a chain
 */
router.get('/deposit-address', (req, res) => {
  try {
    const chain = req.query.chain as string;

    if (!chain || !['base', 'solana'].includes(chain)) {
      return res.status(400).json({ error: 'Invalid chain. Must be "base" or "solana"' });
    }

    const { address, walletIndex } = walletPool.getDepositAddress(chain as 'base' | 'solana');

    res.json({
      chain,
      depositAddress: address,
      walletIndex,
    });
  } catch (error) {
    console.error('[Mixer] Deposit address error:', error);
    res.status(500).json({ error: 'Failed to get deposit address' });
  }
});

export default router;





