import { Collector, buildRgbppLockArgs, appendCkbTxWitnesses, updateCkbTxWithRealBtcTxId, sendCkbTx, genCreateClusterCkbVirtualTx, getRgbppLockScript, buildPreLockArgs, genRgbppLockScript } from '@rgbpp-sdk/ckb';
import { DataSource, ECPair, bitcoin, NetworkType, sendRgbppUtxos, transactionToHex } from '@rgbpp-sdk/btc';
import { BtcAssetsApi, BtcAssetsApiError } from '@rgbpp-sdk/service';
import { scriptToAddress } from '@nervosnetwork/ckb-sdk-utils';
import { predefinedSporeConfigs } from '@spore-sdk/core'
import { CLUSTER_DATA } from './0-cluster-info';
import { registerCustomLockScriptInfos } from '@ckb-lumos/common-scripts/lib/common';
import { createRgbppScriptInfo } from './script-info';

// BTC SECP256K1 private key
const BTC_TEST_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
// API docs: https://btc-assets-api.testnet.mibao.pro/docs
const BTC_ASSETS_API_URL = 'https://btc-assets-api.testnet.mibao.pro';
// https://btc-assets-api.testnet.mibao.pro/docs/static/index.html#/Token/post_token_generate
const BTC_ASSETS_TOKEN = '';

const createCluster = async ({ ownerRgbppLockArgs }: { ownerRgbppLockArgs: string }) => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  });
  const isMainnet = false;

  const network = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  const keyPair = ECPair.fromPrivateKey(Buffer.from(BTC_TEST_PRIVATE_KEY, 'hex'), { network });
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });

  console.log('btc address: ', btcAddress);

  const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
  const service = BtcAssetsApi.fromToken(BTC_ASSETS_API_URL, BTC_ASSETS_TOKEN, 'https://btc-test.app');
  const source = new DataSource(service, networkType);

  registerCustomLockScriptInfos([createRgbppScriptInfo(isMainnet)]);

  const ownerLock = {
    ...getRgbppLockScript(isMainnet),
    args: ownerRgbppLockArgs
  }
  const ownerAddress = scriptToAddress(ownerLock, isMainnet)
  console.log(ownerAddress)

  const ckbVirtualTxResult = await genCreateClusterCkbVirtualTx({
    clusterParams: {
      data: CLUSTER_DATA,
      // The BTC transaction Vouts[0] for OP_RETURN, Vouts[1] for cluster and Vouts[2] for change
      toLock: genRgbppLockScript(buildPreLockArgs(1), isMainnet),
      changeAddress: scriptToAddress(genRgbppLockScript(buildPreLockArgs(2), isMainnet), isMainnet),
      fromInfos: [ownerAddress],
      config: isMainnet ? predefinedSporeConfigs.Mainnet : predefinedSporeConfigs.Testnet
    },
  });

  const { commitment, ckbRawTx, clusterId } = ckbVirtualTxResult;

  console.log('clusterId: ', clusterId);

  // Send BTC tx
  const psbt = await sendRgbppUtxos({
    ckbVirtualTx: ckbRawTx,
    commitment,
    tos: [btcAddress!],
    ckbCollector: collector,
    from: btcAddress!,
    source,
  });
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  const btcTx = psbt.extractTransaction();
  const btcTxBytes = transactionToHex(btcTx, false);
  const { txid: btcTxId } = await service.sendBtcTransaction(btcTx.toHex());

  console.log('BTC TxId: ', btcTxId);

  const interval = setInterval(async () => {
    try {
      console.log('Waiting for BTC tx and proof to be ready');
      const rgbppApiSpvProof = await service.getRgbppSpvProof(btcTxId, 0);
      clearInterval(interval);
      // Update CKB transaction with the real BTC txId
      const newCkbRawTx = updateCkbTxWithRealBtcTxId({ ckbRawTx, btcTxId, isMainnet });
      const ckbTx = await appendCkbTxWitnesses({
        ckbRawTx: newCkbRawTx,
        btcTxBytes,
        rgbppApiSpvProof,
      });

      const txHash = await sendCkbTx({ collector, signedTx: ckbTx });
      console.info(`RGB++ Cluster has been created and tx hash is ${txHash}`);
    } catch (error) {
      if (!(error instanceof BtcAssetsApiError)) {
        console.error(error);
      }
    }
  }, 30 * 1000);
};

// Use your real BTC UTXO information on the BTC Testnet
// rgbppLockArgs: outIndexU32 + btcTxId
createCluster({
  ownerRgbppLockArgs: buildRgbppLockArgs(1, '2341bbc300ffca85031dfc1dee99580331165ba617d97ad11cb1c614de8c76ec'),
});