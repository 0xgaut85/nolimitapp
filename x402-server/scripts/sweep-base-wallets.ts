/**
 * Sweep all USDC and ETH from Base wallets to a single address
 */

import { config } from 'dotenv';
import { createPublicClient, createWalletClient, http, parseAbi, formatEther, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

config();

const DESTINATION = '0xa8C93B2895B38B03f44614473772bD16f5Eb1092';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const BASE_WALLETS = [
  { address: "0xd0dBD16d620f9EeA3ca12F805E86216EbC53B79d", privateKey: "0x0a0ddc208895376175f964a6921a77af33c1ed78f7e767941be5bbe577d5c91e" },
  { address: "0x0F432C45BcD36620958f91B2116baCbF62c609BA", privateKey: "0xc8784204745ad4bba040ae3a4a1f4872d9496556c7b88d34911e536ac9cd5176" },
  { address: "0x77e7bE6Ae6f6ad2b31869850E8A99043C830f696", privateKey: "0xe0906c2ce449d28155413e4786745f40a28c854e21c6ecc33dba7c962d6931cc" },
  { address: "0xad2eBf589C6DCAe70e216158113F394e5b20A82e", privateKey: "0x4f198def10545be91c1a825c2a163c161589939d1ab534be34dfed0ec826a99c" },
  { address: "0xfeB32FBd905FC1558cAB05525aFD198179Bcb97E", privateKey: "0x7fe75412b1056cc4d9fd893730da75cbb3430ba7ec0f22e1ddaf49932df39b86" },
  { address: "0xec22dBbf2BDfC9361145E89958Ac8743Ee5B4884", privateKey: "0x6276fbc35de036a863d804329f3b5327987c29f1e55e79d6cd81653d97264bc9" },
  { address: "0x001bEB4B9afc2A2BE594aD5cDfDCc07F91Adc0EC", privateKey: "0x80f96c10a39c7c500a80e82e4511c891a6ab92f588e4ccaf8c3ca01901188047" },
  { address: "0xFe2352182DB44e97d829939Afc290992d863464A", privateKey: "0x764211c613f35fdc2cc3dacd7557c0e586ec866da39cd92c61e036a700a5ee93" },
  { address: "0xCA4BeD810999bf8AC9b43A232bf1FF31C01AC739", privateKey: "0xfa4caa8143db6841a42b97c62eaf8a511c13673a0221088fa70df0505797185c" },
  { address: "0x2F6a58428186484510776ba8c22dB47EEDe6e601", privateKey: "0xf33747436e9b50309b1de5082b4d3ab1afe16eea2be9496c9dfb6f771637b39a" },
  { address: "0xA21c3b726D3f0501Dd2FfCf58683a701253F49CD", privateKey: "0x2239c12e9c2065dac045d782a3503b6d84c114e42d3a1874a3348bff2b904c22" },
  { address: "0xe8fcF3B81c6A3AD010F5Af684E8854DbCfEfDdeb", privateKey: "0xa968a31092e7a89f39b2b8dc1cb2981105b38aa3464270d6cc9b121be40b1e76" },
  { address: "0x330B9FBC1968d1703Eee035E35E8A9B88dFde74E", privateKey: "0x79e2402be38dcb10b2fb7d47a2ae762cae6016b656a0fcd2f7792f7be3f6e80f" },
  { address: "0xb846E840b45D9B485e03de4319B5ed849FcA0C8F", privateKey: "0x71c7a5200def8144bd010ef5e8d7c0e92f36484360aa9ed9bcb3f08c4ada7a58" },
  { address: "0x035fe4BE0bd903Ee00bcBc43765Cf22Ee2d90387", privateKey: "0x64b0d018129704640d51d1673e50db1b407334975fad1507c05cccaa632e468f" },
  { address: "0x3dFcD3814Fac412014764881A112ccDafD338875", privateKey: "0xb9869c00a1145e993f50f3df3663c01f38e394d0754b3033b7e53efc348aaad7" },
  { address: "0x6B851059A8Fd6DcaB48e23c903c3e20158981c2e", privateKey: "0x2b03730dd07bb70120b9f736d7b69c479e82df671f0e829d0928d9fbf70df821" },
  { address: "0xFdf3C4FDcf587d593f4C357e557E29ed04f8a264", privateKey: "0xa87bb298156fb9ecc01ff81fe0d165b0b87f64d96fc56a20fbccd48ac53ab733" },
  { address: "0x70f3E5c9323c4400272f636A18Fb9d322d86b5bD", privateKey: "0xa0c0e6e8c5063469fd65828aa43d721f4899751d0cf0f5cfd3e14b2a35c03091" },
  { address: "0x49AE292DFC7247CD943a24e2EFF27123520C8eDb", privateKey: "0x066351f8779d156970cb5cbb7f1be520cb09a2eb114849672c7cd0b6574859b8" },
  { address: "0x1c2013AFe4F3D1D1686BbDa804b7C99648FBc91d", privateKey: "0x5ae84e2427fbbdbdd4ff71ed62d2e19f07ceb63ddcfd203ff9913dbb34eee521" },
  { address: "0xeb4F3b809D5Da60e1AdCe9a7a7666C6044A8ef71", privateKey: "0x9b4e9af689bcc3ccc76f661419de7d16f4db4d6f3929e6a222e1412b20754816" },
  { address: "0xE0b9295F19d43659e0f8AEa5d54df85c11E25EE3", privateKey: "0x343f3bf5b708e2e76a05596fe1736abcce24dd7aac832a2ea7d1a5208ad7f059" },
  { address: "0xa7A51bd217BC9FD08D57e10C87e4d0593F81e334", privateKey: "0x9ec0bbb60659c25400aa5af3eabb441362d02739255825779b690dcf739e95c7" },
  { address: "0x6a67cab3783059cA5e0cd1f8F8843316D7E00D4c", privateKey: "0x5f8df5d45fe40ea0fbd1a9cfcc91df688a03bf4f449b6ad041303be1a3d979c1" },
  { address: "0x1Ea10fe8627fe7c29aC29DCB4242B14348c66350", privateKey: "0x591974308f937121580ec7a9bf866cb256f00d477ad6f7b44192e5bc2ffa7021" },
  { address: "0xf1dB543d6F08A952ce48E9297CD5eF4c901105D0", privateKey: "0x13caf8842e122d6d993436b8f04fab114691abe8aa49793429782832a2a55327" },
  { address: "0xA9E4c6c37fb4F1dfE54D23102847f054b73B9070", privateKey: "0x1e60c259b09d02e1def919c2665ccdc1837e3f1ced9c4e7a393805dff8cfe200" },
  { address: "0x7d2545dd8522197225FdA4D93c69d19C2363b1Cd", privateKey: "0xf9c48ff990b6e1e7c5f40608e85bf8f1e6d5a09b5bfb486dc8725f7cc54e5e57" },
  { address: "0x34daa261A855212E112FaD2185D689E13111978B", privateKey: "0x6609a4b500897224290f35622236c0a58cc83e84297b569482685cc6de301948" },
];

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sweepWallet(wallet: { address: string; privateKey: string }, index: number) {
  const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC),
  });

  console.log(`\n[${index + 1}/30] ${wallet.address}`);

  // Check USDC balance
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [wallet.address as `0x${string}`],
  });

  // Check ETH balance
  const ethBalance = await publicClient.getBalance({ address: wallet.address as `0x${string}` });

  console.log(`   USDC: ${formatUnits(usdcBalance, 6)}`);
  console.log(`   ETH: ${formatEther(ethBalance)}`);

  // Transfer USDC if any
  if (usdcBalance > 0n) {
    try {
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [DESTINATION as `0x${string}`, usdcBalance],
      });
      console.log(`   ✅ USDC sent: ${hash}`);
      await sleep(2000); // Wait for tx to be included
    } catch (e) {
      console.log(`   ❌ USDC transfer failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Transfer ETH (leave some for gas - estimate ~0.00005 ETH for the tx)
  const gasBuffer = 100000000000000n; // 0.0001 ETH buffer for gas
  if (ethBalance > gasBuffer) {
    try {
      // Estimate gas for ETH transfer
      const gasPrice = await publicClient.getGasPrice();
      const gasLimit = 21000n;
      const gasCost = gasPrice * gasLimit;
      const ethToSend = ethBalance - gasCost - gasBuffer;
      
      if (ethToSend > 0n) {
        const hash = await walletClient.sendTransaction({
          to: DESTINATION as `0x${string}`,
          value: ethToSend,
        });
        console.log(`   ✅ ETH sent: ${hash}`);
      }
    } catch (e) {
      console.log(`   ❌ ETH transfer failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}

async function main() {
  console.log('🧹 Sweeping all Base wallets to:', DESTINATION);
  console.log('='.repeat(60));

  let totalUsdc = 0n;
  let totalEth = 0n;

  // First, check all balances
  console.log('\n📊 Checking balances...\n');
  for (let i = 0; i < BASE_WALLETS.length; i++) {
    const wallet = BASE_WALLETS[i];
    try {
      const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.address as `0x${string}`],
      });
      const ethBalance = await publicClient.getBalance({ address: wallet.address as `0x${string}` });
      totalUsdc += usdcBalance;
      totalEth += ethBalance;
    } catch (e) {
      // ignore
    }
    await sleep(100); // Rate limit
  }

  console.log(`\n💰 Total to sweep:`);
  console.log(`   USDC: ${formatUnits(totalUsdc, 6)}`);
  console.log(`   ETH: ${formatEther(totalEth)}`);
  console.log(`\n⏳ Starting sweep in 5 seconds... (Ctrl+C to cancel)\n`);
  await sleep(5000);

  // Sweep each wallet
  for (let i = 0; i < BASE_WALLETS.length; i++) {
    try {
      await sweepWallet(BASE_WALLETS[i], i);
      await sleep(500); // Rate limit between wallets
    } catch (e) {
      console.log(`   ❌ Error: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Sweep complete!');
}

main().catch(console.error);


