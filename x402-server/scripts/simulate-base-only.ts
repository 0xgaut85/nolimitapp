/**
 * LIVE x402 Activity Simulation Script - BASE ONLY
 * 
 * This script makes REAL x402 API calls that require USDC payment.
 * 
 * Distribution:
 * - 80% Chat (noLimitLLM) - $0.05 per transaction
 * - 15% Mixer (noLimitMixer) - $0.075 per transaction
 * - 5% Swap (noLimitSwap) - $0.10 per transaction
 * 
 * Mode: CONTINUOUS - runs until all wallets are out of USDC funds
 * Duration: 4 hours (transactions spread across this time)
 * 
 * USAGE: npx tsx scripts/simulate-base-only.ts ./my-wallets.json
 */

import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { createPaymentHeader, selectPaymentRequirements } from 'x402/client';

config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  durationHours: 2,
  distribution: {
    chat: 0.85,
    mixer: 0.15,
    swap: 0.00,
  },
  fees: {
    chat: 0.05,
    mixer: 0.075,
    swap: 0.10,
  },
  serverUrl: process.env.X402_SERVER_URL || 'https://x402.nolimit.foundation',
};

// ============================================================================
// SAMPLE DATA
// ============================================================================

const CHAT_MESSAGES = [
  "What's the current state of crypto regulation?",
  "Explain how zero-knowledge proofs work",
  "What are the best practices for smart contract security?",
  "How does the Lightning Network work?",
  "Explain MEV and its impact on DeFi",
  "What is account abstraction in Ethereum?",
  "How do rollups scale Ethereum?",
  "What are the risks of yield farming?",
  "How do decentralized oracles work?",
  "Explain impermanent loss in AMMs",
  "What is the future of cross-chain bridges?",
  "How does Solana achieve high throughput?",
  "Explain how DAOs make decisions",
  "What are soulbound tokens?",
  "How do privacy coins work?",
  "Explain the concept of liquid staking",
  "What are inscription protocols?",
  "How does atomic swap work?",
  "What is a flash loan attack?",
  "How do NFT marketplaces work?",
];

const SWAP_PAIRS = [
  { from: 'ETH', to: 'USDC', amount: '10000000000000000' },
  { from: 'USDC', to: 'ETH', amount: '10000000' },
];

const MIXER_CONFIG = { tokens: ['ETH', 'USDC'], amounts: ['0.001', '1'] };

// ============================================================================
// TYPES
// ============================================================================

type TransactionType = 'chat' | 'mixer' | 'swap';

interface Stats {
  total: number;
  success: number;
  failed: number;
  chat: number;
  mixer: number;
  swap: number;
  chatFailed: number;
  mixerFailed: number;
  swapFailed: number;
  usdcSpent: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomAddress(): string {
  const hex = '0123456789abcdef';
  return '0x' + Array.from({ length: 40 }, () => hex[Math.floor(Math.random() * hex.length)]).join('');
}

// 100 Base wallets hardcoded
const BASE_WALLETS = [
  { address: "0xfC6b9c616FF9dF369319d15dCDAb054e99D6785e", privateKey: "0x0e4a768cec724585be3650e7b818a8a364133854301f090e44070dbb031acdd1" },
  { address: "0x9c14155fB5F9E5c6ADfC86289Aa5C63686b2421F", privateKey: "0xf94bcfc41c7e3dc21057b0c94d58e889b3f884dcb3795495d7df33bb0515895c" },
  { address: "0xBb635E7177c374a46ff8CBbe394eF32328023b9f", privateKey: "0x6ea0d9b0dd5c35073acc06abf89d943661cde7607f58ae22edd271ff667be3ff" },
  { address: "0x84393eAa3D7c74A957Fe2D50E5655ec3096bbf53", privateKey: "0x19324ce9af90ed2fb989c757ac1f4391bab8ceadd0bec9a66f6762043a885c7d" },
  { address: "0x426c6d7958999ae2234e99A9B294A43ae6ADAbd7", privateKey: "0x5692a26bacc9d318130604ae07802b4c9c5e48ebcd4a58c3252d41feaf7fe4d4" },
  { address: "0xa9D9B8a35e83FB980e78ffd08216952511f7918e", privateKey: "0xd3f4a5ed9c569b27b5f3e1fcec1a0273dd818a27c43c630fad1719af055977df" },
  { address: "0x6f1f6214Ca8Bb1060777CE5418bBc0eb01C8Aef1", privateKey: "0x8874e265be5856f6c5823fb3bbfb8fd96eb34ee18bd44dbe602a154db70190d1" },
  { address: "0xaB9B89839C76D89a712b41f9f1783d49E2bE7fE6", privateKey: "0x30b80a41d125f0663013d9cfce640a58a066aaa1cc7880097785119da0e6ff0b" },
  { address: "0x64eEBa867631c7b3967d84CcF45DB2e80a870718", privateKey: "0x8c4f39346c96db7ea502bdac3cc865bf40e869d5cf1af1ea3600762842b8bfc1" },
  { address: "0xD059B6d446B6e009d7566B6275213AA39Fe327dE", privateKey: "0xbfbeb4b990216876336dbbbdba48ca7b901ec59b6bdf21676b4c4edfc74df538" },
  { address: "0xDEe9b13F55203Bd9350E3b7Bb14D682f2Cb51Db9", privateKey: "0xd3b750e99a41fbd351235ddc360d0dbb1d573571343f9b4ecb6324b96409f6ae" },
  { address: "0x17D89a3528bE363748928297F04816cfaf930045", privateKey: "0x338bb01670b3c18bf4103b488f1fee9e520362c0fcd1d4568257cb35207df4e7" },
  { address: "0x9c578e5E2d1722CC701EA364316F38A568CFE601", privateKey: "0xc271f5bf8c61a87068261a26993a767f165d7273e2935966bebd7a85dd0c969f" },
  { address: "0x40Ce50e0DaA4d42501574C9E1020968a2FBfC372", privateKey: "0xf448b073ce4dcd7a57b75b1b096632ef3a8b6a482af070295ee25808af7f0c28" },
  { address: "0xb28243B4Db550a25445794fC99bef98b3515B6d1", privateKey: "0x356f58b23247ccfaaf8169d6e566c1a28d4299f9d32e8f53080971beba682a2c" },
  { address: "0xcCFC4e098704BeC9802De7Ca797066cBc9c550dF", privateKey: "0x4239d4cb7958d1bec026d3a3bccafa00d7626c7936f37ca27b2609c5f2a57764" },
  { address: "0x967191ad52bE38618426302bf9123C80c5928236", privateKey: "0x3f25d3efcc5df14884ddac65fdf65acc0fcce979258f3076b9092ad18d65df3d" },
  { address: "0x0D6A614D562ff0f974D0d8f309d2828870782D7B", privateKey: "0x014e8daf7dff0ac72480f3888085f0e9de38c614fd4cf2e48a5814d3df23ed38" },
  { address: "0x9d9be7056F15086f2dc8a9d00AE18dca03ec3F25", privateKey: "0x4e01c89dbca569c0ea1ae199610568811a9d7bf75cbe1f21a3b85d740bf22060" },
  { address: "0x0b0eEc7049f34e160A2cE44227E2830Aa64d8BFB", privateKey: "0x215abed80a0cca90ddc531734c7c016ac60556b25500dc6152a0163b4c170e09" },
  { address: "0x28d8a7c9773728Efe0F1DC6BB4661c4DA142D7dF", privateKey: "0x56fe0e5da106d234ee65c59762f1773aa10c8ca264b1b1f0d7fdfb958a1937c3" },
  { address: "0xb4d6B12Cf8148133a51df2b86430AbD1d579C005", privateKey: "0x50d60fd384544a8fe5cbc87f81295eb8cea14416eb018cbdff94df6a5833f3ee" },
  { address: "0xb5d636B5C679CB0435Ce235C1984fbe526BC5324", privateKey: "0x578f1a3e7bc9d98518bb39e33ef24832ee70b11f6f45470943ee9649f0636623" },
  { address: "0x0163757143b0e6219d524cb64d7E8b838a2A70d7", privateKey: "0x8736a4783e3fa958036e9b92640e37e5d6a71b154149f4201794e9c83e525066" },
  { address: "0x6fA589FD6f0E7041A918622E92343193A63dF992", privateKey: "0xd970f4a78b7956aab1919a1546201763c920963ae1f824787d603489b471b885" },
  { address: "0x462c9e4ECC06e75E21CBC7f3ce4c401F6aA57F36", privateKey: "0xe1fefde660bd3c1c8464fec5ba6f7bc762a6e578eb582bab25dde81bce10ba38" },
  { address: "0xa3d56f1f6844AB81fACA4eE261f5f0233367Dd71", privateKey: "0x6fcd1f694061bf261659b69092f86d1cf8335b0e2b083935e33c86b371ac8ee3" },
  { address: "0x84f0D7C0BfD4AA66E7B5d289b2442dF721abB069", privateKey: "0x756134e48bca0ccbb39037b4bf41065b02631733a9b386581adfa0492f405e35" },
  { address: "0xc49d753D098ce4Eb433ecacC57Fc5f6087249D90", privateKey: "0xa0f375c0d9c3eaab26875f8c85e8f0fbd04ffb6cf4c9c5c9056a35ab7f3c0de1" },
  { address: "0x1998C191CE60285B86C20f27BB6C8F594995161c", privateKey: "0x048c7c74e5ff36f08579ce50fbb1405b6d82cdd63670bb93e0b545dde5c2b790" },
  { address: "0xC1f0f989CF6Ba0032E234300f6f5A716EA6Ec7A8", privateKey: "0xaab3ea83872c04be305bdae0fc9b4e6488ca63de49de89ce2027222cfc2a3381" },
  { address: "0x8683Dfe38630900588eBCE44bA453eFF734699A4", privateKey: "0x5e838f20e92ef46cbfe5a74af525214d734f8d3966ad1c50da34a11bb43c70ee" },
  { address: "0x9928ac21a4661b4eC63b728380215248df291c38", privateKey: "0xd6afc3aad4c871a2cf72af74602c93722e8b6263df35721787d0a36364237919" },
  { address: "0xAbe71F9cA9D44E7F7515d6Ed7777C160d9602042", privateKey: "0x30e9af3ab36294f31276421260e08bd32381b5c1e6aa1f8976eb6cb7576b1962" },
  { address: "0xC8A83adDC88Cec07cEEe73ed5dAC45427cDB88Bb", privateKey: "0x3ab5820f85665a20a68aa1a9bc3dacbc93ebe03a64f2fe169f6d5fbe69f1b9d5" },
  { address: "0xE92f142fC2f5DCf354DA6703D9c633d359eDe961", privateKey: "0x4b27cce76ce389a3728432c7a15527fd46f9d4c6f6b67b74378131af53937acc" },
  { address: "0x30BAD7E731EB4a6F6a44EFD684831f7c2fD01586", privateKey: "0x1620233e3eaab1e405669f82aa2d7ee1fc9cd84a88893e939cfc718ff701ff59" },
  { address: "0xC04929f3390Acd77B9d2952f3553A28a2BBe3235", privateKey: "0x9b61582f10542aa4e418a701cb9078b0bca68e57374c91a658febc9b21c8ac31" },
  { address: "0x52dd16C077Cca4658bCE1c172867cFc32da7C7a2", privateKey: "0x840a6d73f00e8622c44f5d4012eef6dbb37857923c67b45374f8a43873bb5e5b" },
  { address: "0xD86eB66AaA16265c659e78c9B976bC48205aa2E2", privateKey: "0xea6bf609ba119cbd539ccae8d40592b89350300b1cdd1994b669c850f20d4630" },
  { address: "0xe15A5026f95f3603c9301d02787794AA584635EC", privateKey: "0x6a6a11c600719a9e67d6b139008817d13e84a84bc1e5587e842d9fa048c8c630" },
  { address: "0xE2DD63036d1C77c282c71C76b43568C5E4b89E87", privateKey: "0xba4cc3b945cc6ae1a76a6b4b24c988419247830391ccae753722dd6f761d04b0" },
  { address: "0x193DbA4546ce2af41474dA99E17F4E2261aD5421", privateKey: "0xda4ee6005e9f1b5de6531d07f183adcaefc1cb672aace9248b39d607ee25890a" },
  { address: "0x697dcbdFaB8490205802a54b9b953e462001B825", privateKey: "0x989fb0bea01883f842a9a8bc53568a0257851258767d285b53c2a7835cf4f81a" },
  { address: "0xad3aFF46551b7F8D4075410C1521eD22A54a9CFB", privateKey: "0xfda148388690b98af747569a866c759bd1c0c63f682f531852ab7d354b73bfa4" },
  { address: "0x8f003554E54113Bc6Bf59251289BA3eC99c7725f", privateKey: "0x1ab3c4667ed1191e703b5c4ae2072b2bb79451caad644dc6479dea4da7ccd294" },
  { address: "0x2EFf00F4Eb4ac2FE8e0760f1DaF94CE4b8A24Ad9", privateKey: "0x975cb03850f50a7521ca3ed9965f05536357183cb915d31087d44f0360d224e2" },
  { address: "0xc58c20f3594f080f6bDF34658519927f3fFA4943", privateKey: "0x8223dff7bf68adafdc3dc4e8b2d16005cef33a148801398fd922b48ffe57adb1" },
  { address: "0x8d370831b3e3E590b371023C1bC5fb02616D03F6", privateKey: "0x4ee445fcf6348d79fa64957c734090739439a69974c7f27f8ff24a28e39e057d" },
  { address: "0x80f06ee297F0CEe9a31344982a49B1B0A7515E4D", privateKey: "0x7425f32659cb171cd53da2136e19a4fd6a0918532c1bd29764016600987b7da9" },
  { address: "0x6Ed675a23360418ff80FeA34885D985f587f0b1e", privateKey: "0x39a729f9182b3da02163cdb05f2b50f00a09e5a7581c403275eb9293aa020a80" },
  { address: "0xcc064dc33CB5443B0398B13D3F40A19BcCdf3519", privateKey: "0xa35695e7be492629c04f1dbbfbbaaf2d3eaca715ce53608d85ed61e6fb93f856" },
  { address: "0xF5A8004964760D9c9860d54f61e313ED8876b7d6", privateKey: "0xf6f346304cb79c30acdd89a35168439fac1673d4fa9056e5c6433a2e784dfe17" },
  { address: "0x23f20b9e638B0d03eaBfFeAaB6dDc1515E9f53e8", privateKey: "0x913a4458461c9134973a70ebd0f0288b67581819e07c7824f968c8fb1ef55218" },
  { address: "0x23eEa480aE0b92F0EEcecE3A755De6589821628a", privateKey: "0xf4f1b6f6ccfd1977f77af57d52346f4f682a285df2bc3615615ff1beeca909cd" },
  { address: "0xDB30aD9F4cceBeee3Cf5273BF5d5288D15DF508E", privateKey: "0xcaa3cb21824611a96c11f0a8bc4ee33fa46d6dd9706b26a53aa8c6a263f2d683" },
  { address: "0x95CCe7A8a0b36Cf312CE2c75538223652C4431Ba", privateKey: "0x3e5a3e2f01cc6ff4b851749ca8230f3f729ffc159f0dc77ac20168d390ac5f20" },
  { address: "0xca4C3E84aa8238b26911366F05e329a6e21ecc78", privateKey: "0x1fe8d1edd92b66f2ecdf1164dd753d1508fa4bb8ac5c2ed4adf41efae1c4d218" },
  { address: "0x1874Ad97D5D4534823BacB7Af382Bd00483f5b6b", privateKey: "0x10487507eb1a2fce29cd3bc795bd9abd48436ae53d513bafa454cb6b7e884e01" },
  { address: "0xe75FC0bA45C23BC87064011278748BeEcbD5B6Ef", privateKey: "0x8bbc38f17ccfb361c3ffea5970a7c0160adb70f3e5b4c76c7d3dc38049b6358d" },
  { address: "0xC7516D582C7A0728bb538449a2ae72DcEb0f3A24", privateKey: "0xee3c881da00e855c5156c41e4866323cf3d32ae75b939993c0446e9cd4251ff8" },
  { address: "0x0E18dB21a9eE4a29C8d445E4492Ac700561A1E6D", privateKey: "0x35000d8763f8c2cb3821c6e77e531389151a60495948d59cf26552ff7ea1102b" },
  { address: "0x13958b442429C150D99303D93C6fDE133195b21A", privateKey: "0x95d4ae7b97c04f497c5e3bad5b7ab3180cd31d7e748bb5c4dc0e71a56cb7bfb7" },
  { address: "0x1eb076b60ae7e219dAe2313103f4da3fb943AC62", privateKey: "0x9b07b98714394a1c8e2990402d7e58248ca0bf8ac4efee424e8f36131da6afdc" },
  { address: "0x14E251641f222536337b17a1408e8746F702551b", privateKey: "0xd43a5eaba4ac5d53b44b278fa37bf36aa905ed2373954d34d42af626e389aab5" },
  { address: "0x7773d9fDb8Ea404e1c3D6D56A452B0d40aEB7EF9", privateKey: "0x0df10f8b1cb53c00f75d79fb607e0b59bdb83d1194d69cb20cb76180c59ddd09" },
  { address: "0xF1d8f06aA567fbA1FfDCD09E550D7F38968Efc01", privateKey: "0x87694b2d29ad8421068a10d596a5879de141bd8c4944d54395c7f93b0577a32d" },
  { address: "0xAa16b4aFDed0500c91fFd8863F4Fb1d63E11f448", privateKey: "0x8e07cf076d89be92befe5d1b90e3218802ee06ce2337740ae9f541f17de897ee" },
  { address: "0x088c9683D5A94D0aEd9307affcB0347F4Ec47556", privateKey: "0x1bf519abe8e8b79b5767a25874041ef739249354a6b24c8be6c7abce4d0927dd" },
  { address: "0x8AAF6bA4ca66898fc34898AF917fe1a83A50a63A", privateKey: "0x37a28d7a5ab713fbdd99fe09c39cdbff17bac989b2708d1be910b6f4a29fc4c3" },
  { address: "0xC33d6Ef99836A800C994AD08D052E804164b1A75", privateKey: "0xef0826f8217e5f5799b700f563091d993b30ccc0586490e3419732cb488c2973" },
  { address: "0xd55a465AAec4935D37Fb6081F9D8A2a3dFAa2A1f", privateKey: "0x7fe1dd554759b08c5c9bc468bc99209ffdd6fe39876a24177efa1f700b6603d4" },
  { address: "0x0c54B80ACae1af80579c33b66EB61D75eC9A09B2", privateKey: "0x7f249bd011a924432fd079a23850a3c05673acd2dd34f6df49a75fe077dde186" },
  { address: "0x7c0CE1b06dA0dBee52F01f4Fa26ecC531eb0d42E", privateKey: "0xfc1445394e4fea5f2ff9ad118b23db2887bcdfbfb465ae1d6036466b79725be8" },
  { address: "0x22511210b4f63B0989C21Ec5d6bf6120434eeAb1", privateKey: "0x0e4650710346d092e7195378415b4c64619e06762b101359dc5559c0690e3f2e" },
  { address: "0x8c6a2F5968e1B2468553c80E9F79AD388f5D3fF8", privateKey: "0x61d4b49e1466cfe4e8a8742779b920efcedfc5ee5d81eecacebc579a6b8a2ed7" },
  { address: "0x6ab40bd3bd884E5311EC39ec7095DECC79a0FB4b", privateKey: "0x94fd54b5aa43f506fc6deac91a6d9f09d3d32869f5e44296d80d8bad79328a74" },
  { address: "0x808d4f0e62996aDdefC9438274b806CAb8548b1d", privateKey: "0x4715525643656019d7bc39785d8f31b9e8c50b807234492eb76560050ba570b6" },
  { address: "0x1e725011d92EA52Ad642d432AdFE6B7e8CBC8dDE", privateKey: "0xd6a1c728d9b689f58b099852e6d78985703d3aef31a503e510abc7a8c980522e" },
  { address: "0xd52b3ED8256EfbaB816F1e1c92a107BD371B074E", privateKey: "0x845223ec564217617b578fe5d295295eb14acef4fbc617fe10048568d82a3f16" },
  { address: "0x2F3e490C557879C78ED25c2241ef0E7CBf134943", privateKey: "0x3a897ff51d4b60a37101efb0bd2f833fca4e4673ebba6b58869737f9c846ed60" },
  { address: "0x54F0A9e6B19064701724b72AD4eb43f62EF1bE6e", privateKey: "0xe7b62e5d1bd8a34c316f49df9f134abd66b1cc3e4cda5a20fca4125b4f2c8d69" },
  { address: "0xa02413bEA52bc507D60c25Bc56f5d12722489E13", privateKey: "0x6a826c44883e0c3443616b965c50dee589eb82324b3240c3bba997da6404e867" },
  { address: "0x8447104866eE2B018c21f984677b59C5d493B193", privateKey: "0x2c0b17e7e287fee7a5f7dd80b5747370b01e286c59ad1720c710874e9a56526a" },
  { address: "0x0d5c99B9a9a9aed85D3DBcA2122271E41c7f6B8E", privateKey: "0xf000fbde302320f17ed6f3fb0b057390b981ff12d65a4ad1a7f4537fd6d0e21c" },
  { address: "0xa19aa9CDeF77Cd591B383c5599eD24872d63Eb38", privateKey: "0x40e272b6e6b97600e3209079f7d6f8f9f2e02b93f0e8aef3a2eff9b4b1fe692f" },
  { address: "0xaF8BA5f3A4871323597dFbeB70fb77e3CC3e18d3", privateKey: "0x6cb57a774f1d63a641226b3e482cce242530a0e4353ffc1c862ec9c4952f8edf" },
  { address: "0xD96c962dE70125EB620Ec87d2f9744d2e57363Ca", privateKey: "0x558467a90ed8ef37a2ce46f6b12d31108f21a1858b42ab2c9dfa13b6b62a1c86" },
  { address: "0x5f950924282f110Db5bB6477C7267eAA8d8B3a8f", privateKey: "0xba08e9ba002a7864b15db2128facc2a78e7863b9edaacd6b7f162f3e4c309d98" },
  { address: "0x16bB88815514151e45A196fd06291d741476417A", privateKey: "0x14be62cfeb87b5a0882492befa52e7101ba5d07cb5dc58582a4d3f9a30f1da83" },
  { address: "0xa2D0EE955a697eAd9C6c417f5C4C07CC44403cBd", privateKey: "0x19d7151e47d71098a591a19d515ca1053d35a7aecbc4329e3824aa183a2c7a6b" },
  { address: "0x7779C478a88FCEE0Fc67637dd014f9D2624a7287", privateKey: "0x8f49b2a844aa25240a553c1a2e51aa1a3cc6ee735a8a37f66b712f3a803a2037" },
  { address: "0xab5479552f96398966221Cf577fe3b23c37E7c5b", privateKey: "0x56d1dfb14db748b2bc0b64782e7ff1b97a7577d25db3f9710d75e248b79291c8" },
  { address: "0x30dd355B8280CD69d7cc304dd739b39ef124ce4a", privateKey: "0xc2d700b7a8379d86004f304fa48c4f96401e0af4f2dc41584e08e9e032aff2fb" },
  { address: "0x8fa2C04fbDe7E85ed4FBbFE6Bb9E717e30f8E690", privateKey: "0x640e860cbc70ec2b2d146d597f4cc3e0af6c6d7b3e6049088325ad64ac25d301" },
  { address: "0x94d2B9Ae15131775A36039D9c67906771Ce6246C", privateKey: "0xad5a3cc0e3dd0fbb2cc6c22e6773d59b306b1da555a2fd56065ca4f9afe5b76d" },
  { address: "0x2A1bf80C8302BEc2Fc7c2AA3c1064c61FCaDC00d", privateKey: "0x8eb696aceeb2042ce35846b9017104d4f3e9eeb585ce107b7df704ab58af0e07" },
  { address: "0x780B649c4711D9f6Ef66fba1a2689CF2363C1F17", privateKey: "0xd28771904efba65d7b9f7d10a1540f8d52427e5d4d8fe8b6cf3f808018d8fdb3" },
  { address: "0xAb969C56771D145B5E1Ff86B8aff3e499C4dd5e4", privateKey: "0xefca8be5b475095bfa5fd013a09281c59737d5ac2a9215045776ec3a34ad4691" },
  { address: "0xEc5256C1DDACd3f3FA1626EeD21C5c71Ef224973", privateKey: "0x319c20ea95660ee1a09ac33addffc390e512aa19022ed900ea5e39859277373c" },
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// ============================================================================
// BASE (EVM) x402 CLIENT
// ============================================================================

interface BaseWalletClient {
  account: ReturnType<typeof privateKeyToAccount>;
  address: string;
}

function createBaseWalletClient(privateKey: string): BaseWalletClient {
  const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(pk as `0x${string}`);
  return { account, address: account.address };
}

async function baseX402Fetch(
  wallet: BaseWalletClient,
  url: string,
  options: RequestInit,
  debug: boolean = false
): Promise<Response> {
  const initialResponse = await fetch(url, options);
  
  if (initialResponse.status !== 402) {
    return initialResponse;
  }
  
  const rawResponse = await initialResponse.json();
  const x402Version = rawResponse.x402Version;
  const parsedPaymentRequirements = rawResponse.accepts || [];
  
  if (debug) {
    console.log('🔍 Base 402 Response:', JSON.stringify(rawResponse, null, 2));
  }
  
  const selectedRequirements = selectPaymentRequirements(
    parsedPaymentRequirements,
    'base',
    'exact'
  );
  
  if (!selectedRequirements) {
    throw new Error('No suitable Base payment requirements found');
  }
  
  const paymentHeader = await createPaymentHeader(
    wallet.account,
    x402Version,
    selectedRequirements
  );
  
  const newInit = {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>) || {},
      'X-PAYMENT': paymentHeader,
      'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
    },
  };
  
  return await fetch(url, newInit);
}

// ============================================================================
// TRANSACTION EXECUTORS
// ============================================================================

async function executeChat(wallet: BaseWalletClient, debug: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await baseX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitLLM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: randomItem(CHAT_MESSAGES), userAddress: wallet.address }),
    }, debug);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error: any) {
    const errMsg = error?.message || error?.error || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return { success: false, error: errMsg };
  }
}

async function executeMixer(wallet: BaseWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await baseX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitMixer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: randomItem(MIXER_CONFIG.tokens),
        amount: randomItem(MIXER_CONFIG.amounts),
        recipientAddress: generateRandomAddress(),
        userAddress: wallet.address,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error: any) {
    const errMsg = error?.message || error?.error || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return { success: false, error: errMsg };
  }
}

async function executeSwap(wallet: BaseWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const pair = randomItem(SWAP_PAIRS);
    const response = await baseX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitSwap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: 'base',
        fromToken: pair.from,
        toToken: pair.to,
        amount: pair.amount,
        userAddress: wallet.address,
        slippage: 1,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error: any) {
    const errMsg = error?.message || error?.error || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return { success: false, error: errMsg };
  }
}

// ============================================================================
// MAIN SIMULATION
// ============================================================================

function isOutOfFundsError(error: string): boolean {
  // Only mark as out of funds for CLEAR balance errors, not generic failures
  const outOfFundsPatterns = [
    'insufficient balance',
    'insufficient funds',
    'insufficient_balance',
    'transfer amount exceeds balance',
    'exceeds balance',
  ];
  const lowerError = error.toLowerCase();
  return outOfFundsPatterns.some(p => lowerError.includes(p));
}

async function runSimulation() {
  const TOTAL_DURATION_MS = CONFIG.durationHours * 60 * 60 * 1000;
  
  console.log('\n' + '='.repeat(70));
  console.log('🚀 LIVE x402 ACTIVITY SIMULATION - BASE ONLY');
  console.log('='.repeat(70));
  console.log(`\n📊 Configuration:`);
  console.log(`   Server URL: ${CONFIG.serverUrl}`);
  console.log(`   Base wallets: ${BASE_WALLETS.length}`);
  console.log(`   Mode: CONTINUOUS (until out of funds)`);
  console.log(`   Duration: ${CONFIG.durationHours} hours`);
  
  console.log('\n🔐 Initializing wallet clients...');
  
  const clients: BaseWalletClient[] = [];
  const activeWallets = new Set<number>();
  
  for (let i = 0; i < BASE_WALLETS.length; i++) {
    try {
      clients.push(createBaseWalletClient(BASE_WALLETS[i].privateKey));
      activeWallets.add(i);
    } catch (e) {
      console.error(`❌ Wallet init failed: ${BASE_WALLETS[i].address?.slice(0, 10)}`);
    }
  }
  console.log(`   ✅ Wallets ready: ${clients.length}/${BASE_WALLETS.length}`);
  
  const stats: Stats = {
    total: 0, success: 0, failed: 0,
    chat: 0, mixer: 0, swap: 0,
    chatFailed: 0, mixerFailed: 0, swapFailed: 0,
    usdcSpent: 0,
  };
  
  const startTime = Date.now();
  const endTime = startTime + TOTAL_DURATION_MS;
  
  const estimatedTotalTx = activeWallets.size * 25;
  let intervalMs = TOTAL_DURATION_MS / estimatedTotalTx;
  
  console.log(`\n📅 Estimated ~${estimatedTotalTx} transactions`);
  console.log(`   Interval: ${(intervalMs / 1000).toFixed(2)} seconds`);
  console.log(`🚀 Starting at ${new Date(startTime).toISOString()}`);
  console.log(`   End time: ${new Date(endTime).toISOString()}`);
  console.log(`\n⏳ Running until all wallets are empty or time runs out...\n`);
  
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 20;
  
  while (Date.now() < endTime && activeWallets.size > 0) {
    const activeArray = Array.from(activeWallets);
    const walletIndex = activeArray[Math.floor(Math.random() * activeArray.length)];
    
    const rand = Math.random();
    const type: TransactionType = rand < CONFIG.distribution.chat ? 'chat' 
      : rand < CONFIG.distribution.chat + CONFIG.distribution.mixer ? 'mixer' : 'swap';
    
    let result: { success: boolean; error?: string };
    const isDebug = stats.total < 3;
    
    try {
      if (type === 'chat') {
        result = await executeChat(clients[walletIndex], isDebug);
        if (result.success) { stats.chat++; stats.usdcSpent += CONFIG.fees.chat; }
        else stats.chatFailed++;
      } else if (type === 'mixer') {
        result = await executeMixer(clients[walletIndex]);
        if (result.success) { stats.mixer++; stats.usdcSpent += CONFIG.fees.mixer; }
        else stats.mixerFailed++;
      } else {
        result = await executeSwap(clients[walletIndex]);
        if (result.success) { stats.swap++; stats.usdcSpent += CONFIG.fees.swap; }
        else stats.swapFailed++;
      }
      
      if (!result.success && result.error && isOutOfFundsError(result.error)) {
        activeWallets.delete(walletIndex);
        console.log(`💸 Wallet ${walletIndex} out of funds (${activeWallets.size} remaining)`);
      }
      
      if (result.success) {
        stats.success++;
        consecutiveFailures = 0;
      } else {
        stats.failed++;
        consecutiveFailures++;
      }
      stats.total++;
      
      if (stats.total <= 10 || stats.total % 25 === 0) {
        const elapsed = Date.now() - startTime;
        const remaining = endTime - Date.now();
        const pct = ((elapsed / TOTAL_DURATION_MS) * 100).toFixed(1);
        if (!result.success) {
          console.log(`❌ Tx ${stats.total} failed (${type}): ${result.error}`);
        }
        console.log(`📊 [${pct}% time] Tx: ${stats.total} | ✅ ${stats.success} ❌ ${stats.failed} | Active: ${activeWallets.size} | ETA: ${formatTime(remaining)}`);
      }
      
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log(`\n⚠️  ${MAX_CONSECUTIVE_FAILURES} consecutive failures - stopping.`);
        break;
      }
      
    } catch (error) {
      stats.failed++;
      stats.total++;
      consecutiveFailures++;
      console.error(`❌ Tx ${stats.total} exception:`, error instanceof Error ? error.message : error);
    }
    
    const jitter = intervalMs * (0.5 + Math.random());
    await sleep(jitter);
    
    const newTotalActive = activeWallets.size;
    if (newTotalActive > 0 && newTotalActive < clients.length * 0.8) {
      const remainingTime = endTime - Date.now();
      const estimatedRemainingTx = newTotalActive * 25;
      intervalMs = remainingTime / estimatedRemainingTx;
    }
  }
  
  const totalDuration = Date.now() - startTime;
  console.log('\n' + '='.repeat(70));
  console.log('✅ SIMULATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`Duration: ${formatTime(totalDuration)}`);
  console.log(`Total: ${stats.total} | Success: ${stats.success} | Failed: ${stats.failed}`);
  console.log(`Chat: ${stats.chat}/${stats.chat + stats.chatFailed}`);
  console.log(`Mixer: ${stats.mixer}/${stats.mixer + stats.mixerFailed}`);
  console.log(`Swap: ${stats.swap}/${stats.swap + stats.swapFailed}`);
  console.log(`💰 USDC Spent: $${stats.usdcSpent.toFixed(2)}`);
  console.log(`\nRemaining active wallets: ${activeWallets.size}`);
  
  if (activeWallets.size === 0) {
    console.log('\n🏁 All wallets exhausted!');
  } else if (Date.now() >= endTime) {
    console.log('\n⏰ Time limit reached');
  }
}

async function main() {
  console.log('\n🎯 NoLimit LIVE x402 Simulator - BASE ONLY\n');
  console.log(`✅ Using ${BASE_WALLETS.length} hardcoded Base wallets`);
  
  console.log('\n⚠️  WARNING: Real x402 calls - costs USDC!');
  console.log('   Starting in 5 seconds... (Ctrl+C to cancel)\n');
  await sleep(5000);
  
  await runSimulation();
}

main().catch(console.error);

