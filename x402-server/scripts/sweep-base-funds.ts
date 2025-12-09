/**
 * Sweep all remaining USDC and ETH from Base simulation wallets
 * Target: 0xa8C93B2895B38B03f44614473772bD16f5Eb1092
 */

import { createPublicClient, createWalletClient, http, parseAbi, formatUnits, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const TARGET_ADDRESS = '0xa8C93B2895B38B03f44614473772bD16f5Eb1092' as const;
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const BASE_RPC_URL = 'https://mainnet.base.org';

const BASE_WALLETS = [
  { address: "0xa387bd4471bAD86EDB729B7D023146Aa4372efee", privateKey: "0x07b468838adcc298bff4f88e91856142318f613244e2d6028de715e621d1c7f0" },
  { address: "0x8dEe5a9e32eD4D064b72D077595ad26B813DC77a", privateKey: "0xc392307df6e684c0132440af3c2df42c8e349ca06eab123dc62a6a531e6d4c4b" },
  { address: "0xd07F3145fe84C05bf5Ad36b7321A0FCD29fe6526", privateKey: "0x43ee94dab66cade3448dc8ee8e58eb0d24b08939bf6df0e15d0bf8f9da1457bb" },
  { address: "0xF889380F9A51003444fD44bb63570C1EEE6e84F8", privateKey: "0x32b87b773c160e0e0ac5ed7e784b596b39cd246e2f380a1784f54dd83cb1370a" },
  { address: "0x6b530De8B6C5fc0ecd636C26A1c481b854f9680E", privateKey: "0xeb3c8bd0db66443f1c9e05b4e23751fc3cb3b637441ccb6c1cbdc111b0ffe94f" },
  { address: "0xFA5fF3B623ED87Ec38b91B1Cd07d1Da4b7973A0F", privateKey: "0xb2bbd803d0d6653ec591d6527477e126aebb34152b6287101f2f20f6239d4f97" },
  { address: "0x88b619006D939516F1F17bD84124672D650d8aA9", privateKey: "0xa5f59afd0ad3cd837fb2aff74c6185891e1652905b8b391b22b5b9b2dce6b6e1" },
  { address: "0x358803F606Ee1e48e8b3b58F21359b814Bc7e0Ad", privateKey: "0xfcc39cc64f61190302adea90f5fd37992520bf77712d6c1b2947fa5f079eea49" },
  { address: "0x866534bAae0e89F3F616Cfe1914468A609bF64CB", privateKey: "0x8b362818d7ba84a91110beec43491ec5725bf61c55ccf1ba01b6645bae95c4c5" },
  { address: "0xC1D7710C8Ac0e32CC477d79371bE159a7e9aDAf4", privateKey: "0xe4a2f3d0a7d27094673af487d0ff2bdd7b00f919e62a9845b85b7cde647eb548" },
  { address: "0x3D7D4F6A9E00eA2c03e714Ede5B08E2C6B7b3Dd7", privateKey: "0xd7f5355c8a057675df19fb9eb4e01fdfa1e3eb20e3ec5826aa0e7ce6f76f3684" },
  { address: "0x6Aec52b537dfB3154F54313a7279C70219F5631C", privateKey: "0xe7734cb97546132eb25a3ddd1834e73e7ee724b3f4f7754c0fbb9f304eb30450" },
  { address: "0xE9e6fa9168327baE7E2bD0BD00582f2BcC5fe533", privateKey: "0x8f061a2695491eae53e120baad895cad6c96700e2768643dde293dd44a3f6025" },
  { address: "0xff74728a73D12bE7c9C6b200873679b663e818fF", privateKey: "0x343d9f1ec1f39db1e9900a65ebf24f38d35e92b841173f6e2bba7d55a232cd21" },
  { address: "0x9915A1EEcF984D23f006cEC071999F92F278E666", privateKey: "0xf6dae2296760b53ba7937bbd28fe198a6e0b1d062c1cb684848fa051f67d4fb1" },
  { address: "0xB393256ABA98B72ecb46484fD64E76C99F43b5Ad", privateKey: "0x2caa1fbb7610800cb27a23380305a3acf0192a163deb92ad5e703bfe7b35b27e" },
  { address: "0x7a63c4f31E98D613fa99b28D4e52C32F0868A52a", privateKey: "0x8edfb245121ce3013416d26ce54c744d22c66b26a0df722b9fe3bcf7188a829a" },
  { address: "0x43dDF285988A200c5A19950182EA0E047a6e7985", privateKey: "0x65a4fc6a8c4e63124961cd085dcaca6acfe17a709a6f66fc8ec485856710e9cf" },
  { address: "0x6192E13B2c8FFD0d26b1Ab17Ee741b4fAD6220d0", privateKey: "0x02d146af80334a511ad97273cec4ee30d82c0be90e0f0af0e53981401fcf8539" },
  { address: "0xF55B43fdb5b00ce17166b6358a5F33d09aBDAb56", privateKey: "0xa2ad1cd216fefd4966e09a91f76a7e43fda24b4d51e268416210b21238968568" },
  { address: "0xB74E44Ea6Ca683df688F01850e41C39Cc64f3806", privateKey: "0xcf247f478560009522d2a08c278a285e175165c37337a2a6b5bd641067ce0ca2" },
  { address: "0x4dF38566E5FAfEfca73cf2d0Db0BfF6aE73F692F", privateKey: "0x70ec7cf7d518ffbff767581ac0b8628959496a4d32e39be15e0db8b4fddbe70a" },
  { address: "0x48E1e07326fc421Df60315CCC004098Be2EA6EAE", privateKey: "0x55340d7548a6f5d9248390e59e509f8381375c4b6ed0856dffa1c520f328766b" },
  { address: "0xc8281d2c9e02E3e4F698119D97a4067099Fc5F68", privateKey: "0x45b1b2d5f3b6f5ac0167a1dcfa8b17157d34a03c58e8c8772456b56c10d9ae83" },
  { address: "0x88E442c7C12e97CB446013faE0a70d7EE5d840B1", privateKey: "0x90e2def5cc50c5993303e586a47f7103f7e144c114c9bc17bee1c11d25f50442" },
  { address: "0x3eA6Ef446b84C0550065807505486088459a8886", privateKey: "0x81929f114888e401c689894a43aa1b00739c55314e711df23950c84fc3318c04" },
  { address: "0xa07e9ea02cB726d64e9b07b3C7534933673d89bC", privateKey: "0x6a4659025607fbd1a26b982a1090f36ffc28ecba91787ab3ba3b9b8d56dbf516" },
  { address: "0x628871e98943DB879961192d3c37E4c8590FAFd3", privateKey: "0xb48d16a2dd167c08c2af6fd1d429c9a536915bd41d359b1397f1f84d54d017d5" },
  { address: "0x6e1B7B48080189b1bD56aaFDE95AA3D3190dde19", privateKey: "0xd5ded727848ff2c549a92c0add141e27daf6fb2a47ca29bc8414b5affd587e62" },
  { address: "0xa2FAC04cd1cb20dE56ee278D1da0B5019513810d", privateKey: "0x9e6c2bed5dac5c751095365f0f60492b0ad99c32a4581a92586905a8f63c2801" },
  { address: "0x1fcf7af705f1c535c32DA0886aC1dcE320c11EF1", privateKey: "0x705eb74dab08d620b2e80ea5f8562a86ba12e2aa182d6effac6fbbf141386ba2" },
  { address: "0x9E4150Da2F0a997682D250aF8255b09F6bbC62e4", privateKey: "0xd04c2594c96f7630810ddd18708ed85ae8548f13696cafa537ab54502423ddf7" },
  { address: "0x4D4353C74F47f389b1191ac773fc82833f421dfC", privateKey: "0x300562f4d1a7b7f6230dad6f2fdaee0a47ed8038f519e28d5158d50491bd981c" },
  { address: "0xDB9bf93FC45C46ff77818A46bba3E3b80BcA2561", privateKey: "0xf91a773e045027e3e87d207620076b552b91dd40a05039c444029ec80c175b3b" },
  { address: "0xaD387a3D749438228203830BAa7e41f07b8Ce324", privateKey: "0x675373c40c8ececa36f66f12846365d287370b7e0742e0d6f9d0d521fe0b058e" },
  { address: "0xc458d9d5EAd37A0865aE63F0b06b06Fa24425C72", privateKey: "0x2f1e4e4a045c23be79eb0763af0464ff7b905247354797ca0a1d11697194b6b4" },
  { address: "0x700ED5Ce8C640108Ab487FA496df1e929bdE869c", privateKey: "0x95a1c5b4fc366cacadd57f7ff3a228f54b7efaf9a9b9a1b4501c66d3ce7ebad2" },
  { address: "0xCde992FA2b479Cafc24581b4549DD0Dc4d1C55f7", privateKey: "0x453b7159c6b7a29707840b4dcf5ea606f8b201e8bc506fd86523f02a32c868c6" },
  { address: "0xfD2a1A5cC7800860d507A819Ac4A6357Ab2651D7", privateKey: "0x27f50b4534f946c0b58d50ce4b0be2751f6d4340c424131ae4c134b33298a010" },
  { address: "0x90ACE93136282E2184Cef66113A852D94C0A7146", privateKey: "0xfad527951ef365f675716fd765c1287ca8153f195cb95486e01bc6842c329398" },
  { address: "0x12124d025f22E899b616ce38305E31899CCfbB35", privateKey: "0xbd13e016e46456412c45ece3beec83880654d08c1c48ef4d4b932fbcfd173640" },
  { address: "0xbDbb297E1D57FEF44581cCc20DC106CDBdAa4584", privateKey: "0x3f25ea188b44f4a2152c4746e015e297e0980990d95a99387534c66eb9df558b" },
  { address: "0x34fdF847ECf89E719Eff44928EFcFba63221f983", privateKey: "0x02eca066effa3367aefc70fd7ee3e6f10df0195f058be60a64303740cdcdd0b6" },
  { address: "0x975Df420Cc04ba7c3ACFcb6064E28E2A9e35B1d6", privateKey: "0xaf565e020a2fc1ac23c9f0c4e32108dd63d6d00e3a9d67b8aa7967675e7d0bb0" },
  { address: "0x89e861095faCA2455CABd2a05598B55b3485cee0", privateKey: "0xffbb37eeb5a4f783bb6805aa8da25c3c592c17e16ab51819f2ed272bbf7ffc3f" },
  { address: "0xB34FB36e9113524CAB7a331210B985ED8640E732", privateKey: "0xc53eb55e7e22becbf41257ab6f726e2d5f0d0f51876105701030cd31f942c68b" },
  { address: "0xac9373c17e2B45863cC17203c91F475d07c6AddC", privateKey: "0xf16c0dc453e09f3b210784ae4f9b69d18a454499ad15c41507224c69bce1f55f" },
  { address: "0xB646056fe71a650b4D9e61591C75033028024c28", privateKey: "0xb5f2b6297332288b8bbb225fc5d2bca18b6a2346c41b329e57051b2e5447a27d" },
  { address: "0x8C0B73D6Fa04FFE617B67a931b62373480EE9edC", privateKey: "0x6a22752fd83d6e07964b9894e29d7d96f332d8cbc7db89470c6cd0aad26caca2" },
  { address: "0x1C1bdA46d79A78cD0130dd8C42d2e52cbDeD5014", privateKey: "0xad83a26a687872d7719cbb301346d40b6ee1e8125964608fe6c958e568cdbe38" },
  { address: "0xa43b9F2032292077004CeBFECF54064DB2348711", privateKey: "0xd1a9d8bce04dff125524238c8fc668310dfbff8c5ec544a92a95255e6f9f4d5e" },
  { address: "0xc13dA9264e8A5998800114e68297196c90039729", privateKey: "0xb7e5c9f2f4e8e48d2214a1fe9e72decd8e3ad7aa0f5e6990606a8373be878563" },
  { address: "0xfc435ba9850f8a037Ca2D72497e50B90Bc252417", privateKey: "0xd896755425e6398833052a81a4cd8d8c4f826f7eae0eb4a6ddbb84782490c1b8" },
  { address: "0x825aBEdEED13F5F0C7e47CAC4D09Ba90f07644ba", privateKey: "0x171ec5f3b606692237c0463bf3a8ef3a2285ea7c3e2202623dcd15f43fbaac5f" },
  { address: "0x4581DBdf28F64df4F59279a9a45bd877138842fd", privateKey: "0xf9560276a9683432ab9b327ff841377798b4657f3e397e684331f6db0bd1c958" },
  { address: "0x93cFc106b01A067CB69561C34475Ae8e527bD4A6", privateKey: "0x9cc5105bfcd1f6af3d7cf11fc6f97700595af16527b280002aa8f8c2dcd44a00" },
  { address: "0x9c0e0E8Df019cF149fBFB9D89FAE67e1626d7837", privateKey: "0x9f0d56becb591e0a52535335f58fc4c704b0df2a7758b602aedc7b6e98c5ca42" },
  { address: "0x2c456Ed2AC7800e84AaEe492EFa28BD31CE979A2", privateKey: "0xa526e06b69289838a1b7bba9913cd881d8a18fff4f11e52a9c7a7089540930ad" },
  { address: "0xDdbA9940893dA3DD0B2103EDCf755e933D4268D6", privateKey: "0xdaa000245cd9407aa0354ac62eeff3b1ee9538018d2be17a1df4336b5a61165e" },
  { address: "0x02d68Ea1b69AA2aD13E8BA296BE1a04cc21D9965", privateKey: "0x97973a945e1bb0a6376a56d17761cb3dda171da663af7f76dea9be771241a2bd" },
  { address: "0xb8a0e3D8a3931e2D5B1Ee1889aB3267aDE82B335", privateKey: "0x6e6bc8dfab6793b57807dc5bf038dfaf1421f54ffc7a29bf88c3c09e3cd03212" },
  { address: "0x2A77d51F3f5303b1fd20cF5D2883104190820ed2", privateKey: "0x4f51415675bcaf5fd19568efc10af411d0ca21739dd40a7dc333da4d1620c73f" },
  { address: "0x9D49baa6295Ce7b7E58207c945F7e6C82f9D7Ec8", privateKey: "0xe4f4cd27fd3102a7e73aa2a255e49b4bad1cd011292f3764d3cba44493042b67" },
  { address: "0x4B6F4b3F1D930D09fe1Cd90A2D30E728564a4142", privateKey: "0xf235cdb33599140f73976b382d104e8f5ad9a8ef4987069badd47dee884d0509" },
  { address: "0x802594796f8A715C863083AB8317B94DF508E16E", privateKey: "0xeecf6eb21fc590f9c5c8c98f402944b0e6836e10b2cedaa657bf9ae672717f84" },
  { address: "0x9ff180D4e3D3183f84a498D6B33a23484d9f9fF4", privateKey: "0x81a666a3f68f95f7aadadc2b52e54882718ef291deaa2f4d14889ab439851c47" },
  { address: "0xdc6Bb3e58B1c526DADE1659f4665610E77069E6f", privateKey: "0xcbaa864c9fc1b326d4f3fffa8acb1211e8d6c5def05a54fd4bf3cbfa2b437a12" },
  { address: "0x9e150B8D508e430FBAc3b5B29efc2Efa2C3f3e2a", privateKey: "0xb1f895a65b14bee1c7ae3598be114d606942c09b5eeb77a3bea74f57803fc06d" },
  { address: "0x188FEd51F67F292A1A4fda905058a3583898b3dB", privateKey: "0x8789a4fad962d9b293548cbfc787d4c032283ec3e85a994d4fcbf812beea0671" },
  { address: "0x3D16F283A58F5A72D67Aeb9B97E3EF1AA669E64F", privateKey: "0x7519636b73b7738d2006b4fb137fdf8e2e683d2f2aadd734b297d35d52c7aff2" },
  { address: "0xE25578968B87eBd07a33fc7AFc735bA7ccc7a59a", privateKey: "0x5ae94ddb6fd2742e63161e7a9e4a7b1a5a93c0e59a22fa2ffcdc46b0483ed97e" },
  { address: "0xF3e9aED07eaEA6eff794bFF71cAF07939e3fDa25", privateKey: "0xe12c1890e44077d0b2532ed249cd609ebd73dd066455a1b1604e25bc81801320" },
  { address: "0x2c9Dfc10cDe9599ED2a12552ec13720e00a2f58F", privateKey: "0x55a93cba9f0ce700c901044af290b4dbd5d0c477b1be4241766b90db5144e851" },
  { address: "0x570b51d3897527ad144168Ab3aEB16C4Fb2F3fA8", privateKey: "0xf78456500f36a57b6ff9a4ad8e4516275088b64b051e6d9a04b88eeab3bc4bb3" },
  { address: "0xAf7165A8105054E008dAbc1399F5b88106F1459d", privateKey: "0x143a07d320748323b3a496d8a630254555486ec4ab5d8e90c3cc2b2549e7f09d" },
  { address: "0x540acF75CF95b2fFB4427bAB68f76bf6C7B9d936", privateKey: "0x1030d5a6c16b4a7b0829d3bc181f965cf98b4cf79a80a9596adf13b6c81fe855" },
  { address: "0x0e69FE02B59cEB5BA7c1C20b59C74dC9DB032876", privateKey: "0x03e5e1a02b73a8fa5782019e714d9c1d609c8c59440b5affb8219753cf59a5b2" },
  { address: "0x60fA57f76a451b100eD3970922f78b4532Af0Ae5", privateKey: "0xbf810ca92db04b551f438272fd706f32f4d686ad9c0fd3e2940b51553b2e8134" },
  { address: "0x81F0E4f200725AC8974C9AB2F6bf609Af6C980f3", privateKey: "0xba12e3cbff66da42aa0fcf68c11b73341c63b5570e3a89ca2462eccdcfa2f229" },
  { address: "0x5965dC71E75a89b6B3CBd0Ecc66Ff4C57c8E0d4F", privateKey: "0x0c81cb5073fb14000e045b679c6b4ecaaec642da9580f0b91a5c99d9ae1e16b7" },
  { address: "0x03280191A1FAdE45ef07EDD477985e5DB84a18CA", privateKey: "0x57b3c679696227f5228e4f2b35c50e998f99812dfde649ae1b0606a46ee46ae9" },
  { address: "0x1C8DEcEfBAf7BbCcF00092938e78924b739aF685", privateKey: "0xddbc9eabbe060029c65cd1e2de77de0acbf85f8b9cab78a95ac86cfd1ab8a660" },
  { address: "0x036e457134e0d1ED7A9E5469c5ab790a29387d17", privateKey: "0x9927e0a7bd14d8a192e6be08c35c03e26661d13604b2397e8f90d92398bb1977" },
  { address: "0x4E2106c29Ec3d08953ad5E0CFa2D1A78e3e6e263", privateKey: "0x8c69bbb1f5a708bcf069957bd0f7365761229a55827257646b396e8520414c15" },
  { address: "0x2B5864F1bD28abCEC0b775907F52EdE22202Bf60", privateKey: "0x01698cd6a45ba9beafcaedf21caa0e9ee8319c58f0c13db81f490d336bd80f3a" },
  { address: "0x113619be6C17E53066Aa4C14afe9D2F9b6238111", privateKey: "0xb718234c2c3f6360a862628184a0260eb52484d33d0f0fe7e5b5c141aca1e778" },
  { address: "0xc3915921CD118fC2b02105931112bdc5AE84C085", privateKey: "0xb38a8491e14f64a32f42891fd85ee548b965b3cd3c6f747753e815d26bfc6672" },
  { address: "0x1C0A54b71A07b8449444231243808feDB714D811", privateKey: "0xaa4c8d4fb3622d25dfdb1b9b328d25447ef7b7595846c77b9531634148326c78" },
  { address: "0x4A632BBaa24a0639dc4B71dDCF9Db9374057e805", privateKey: "0xcb500012a2dd5c6dad4e8fa792e2c3dd569bfa6c3d6f34c4ec9e997758b9eb04" },
  { address: "0x7C1Bc615007903A22751beE406185Ad1dFC4020b", privateKey: "0xf3f1f36efef2423321ff9d37b090515cce9884c8ff9f965c9ff3be6f53468a87" },
  { address: "0xB60012e1269595C4421aF52E4dF99ba7FAf543aE", privateKey: "0xebe188282db9745218beb7057c3f6c17b815f0cbfe368c098001bcf2a3a191d7" },
  { address: "0x2CD4f09f589254435623C502faa0992AE8807ac5", privateKey: "0x99cc7a56e3835c73afe01645a680997c2807ac56983777cfd48b82d96dfe05b7" },
  { address: "0x429F4fc3c838c38309630477f88f7046F1CE1c90", privateKey: "0xf8c02c1b7dee29e0237361e8b239ee2af2831ab6716bf2cc02e95d85daa1bd76" },
  { address: "0x90aE3049FC44f0186B549B136e01E49e23F898Cb", privateKey: "0x471a155ea3b82e46415388a95cbb97a22247398e56ab440c2c176e328583d876" },
  { address: "0x4F252Cf135c87619Bb2D0715d826E3bE1Bf82558", privateKey: "0x00320529eacfda71ef939eb665cf696cdc7213785e4d336831ddfb533b550f3e" },
  { address: "0xDc6706D3815Cf6675e6085495fcD2f9e1284590c", privateKey: "0x9f96e49b23eb2fd23476db87d7465a0259b51599ad988c6f6fca30bc22dcc3f6" },
  { address: "0x7774D91C943F1B6B5BfDEeD27784Ab7315bEd9C0", privateKey: "0xbeb2fbe30adf4e4224060f3d99263342e233ca74cbd4e7d3c059360cfab551f2" },
  { address: "0xbdFF1b0660f42343B8Fa593bF5f90B7C1b5256F5", privateKey: "0x2df6721e84e6cecafa78732078dd3869f366f65c1ebaec132f2f4ab11f1d2ad2" },
  { address: "0x1572a1961c8772c7be93a0B553Ebb0439d10ddeF", privateKey: "0x7cbaca5bb58520851d6f1faaac3ab1f5ab80c00f03afdfab40033ab2c30e4e26" },
  { address: "0x0fd5932B967ec28Eff7Cf409D903cDA6C1f9A373", privateKey: "0x4cce01bc0d8f11880720bc4acbc76b60179d0247c41e70bf7b6f3b3358d85fa8" },
];

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry<T>(fn: () => Promise<T>, retries = 5, delayMs = 5000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if ((e.message?.includes('rate limit') || e.message?.includes('429') || e.status === 429) && i < retries - 1) {
        console.log(`   ⏳ Rate limited, waiting ${delayMs / 1000}s...`);
        await sleep(delayMs);
        delayMs *= 1.5;
      } else {
        throw e;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

async function sweepWallet(wallet: typeof BASE_WALLETS[0], index: number) {
  const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  console.log(`\n[${index + 1}/${BASE_WALLETS.length}] Sweeping ${wallet.address.slice(0, 10)}...`);

  // Check USDC balance
  const usdcBalance = await retry(() => publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [wallet.address as `0x${string}`],
  }));

  await sleep(1500);

  // Check ETH balance
  const ethBalance = await retry(() => publicClient.getBalance({ address: wallet.address as `0x${string}` }));

  console.log(`   USDC: ${formatUnits(usdcBalance, 6)}`);
  console.log(`   ETH:  ${formatEther(ethBalance)}`);

  // Transfer USDC if > 0
  if (usdcBalance > 0n) {
    try {
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [TARGET_ADDRESS, usdcBalance],
      });
      console.log(`   ✅ USDC sent: ${hash.slice(0, 20)}...`);
      await sleep(2000);
    } catch (e: any) {
      console.log(`   ❌ USDC transfer failed: ${e.message?.slice(0, 50)}`);
    }
  }

  // Transfer ETH - re-check balance after USDC transfer
  try {
    await sleep(1000);
    const currentEthBalance = await retry(() => publicClient.getBalance({ address: wallet.address as `0x${string}` }));
    const gasPrice = await retry(() => publicClient.getGasPrice());
    const gasLimit = 21000n;
    const gasCost = gasPrice * gasLimit * 2n; // 2x buffer
    
    if (currentEthBalance > gasCost) {
      const ethToSend = currentEthBalance - gasCost;
      const hash = await walletClient.sendTransaction({
        to: TARGET_ADDRESS,
        value: ethToSend,
      });
      console.log(`   ✅ ETH sent: ${hash.slice(0, 20)}... (${formatEther(ethToSend)} ETH)`);
    } else {
      console.log(`   ⚠️ ETH too low to transfer (${formatEther(currentEthBalance)} < gas)`);
    }
  } catch (e: any) {
    console.log(`   ❌ ETH transfer failed: ${e.message?.slice(0, 50)}`);
  }

  await sleep(4000);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  BASE SWEEP - Transfer all USDC & ETH to target');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Target: ${TARGET_ADDRESS}`);
  console.log(`Wallets: ${BASE_WALLETS.length}`);

  // Direct sweep without balance check
  console.log('\n🧹 Starting sweep...');
  for (let i = 0; i < BASE_WALLETS.length; i++) {
    await sweepWallet(BASE_WALLETS[i], i);
  }

  console.log('\n✅ Sweep complete!');
}

main().catch(console.error);

