import { describe, it, expect } from 'vitest';
import {
  calculateRgbppCellCapacity,
  calculateRgbppClusterCellCapacity,
  calculateTransactionFee,
  generateUniqueTypeArgs,
  isLockArgsSizeExceeded,
  isTypeAssetSupported,
} from './ckb-tx';

describe('ckb tx utils', () => {
  it('calculateTransactionFee', () => {
    const fee1 = calculateTransactionFee(1245);
    expect(BigInt(1370)).toBe(fee1);

    const fee2 = calculateTransactionFee(1245, BigInt(1200));
    expect(BigInt(1494)).toBe(fee2);
  });

  it('calculateTransactionFee', () => {
    const longLockArgs = '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399';
    expect(true).toBe(isLockArgsSizeExceeded(longLockArgs));

    const shortLockArgs = '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3';
    expect(false).toBe(isLockArgsSizeExceeded(shortLockArgs));
  });

  it('calculateRgbppCellCapacity', () => {
    const xudtType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    const capacity = calculateRgbppCellCapacity(xudtType);
    expect(BigInt(254_0000_0000)).toBe(capacity);

    const actual = calculateRgbppCellCapacity();
    expect(actual).toBe(BigInt(254_0000_0000));
  });

  it('isTypeAssetSupported', () => {
    const xudtTestnetType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtTestnetType, false)).toBe(true);

    const xudtMainnetType: CKBComponents.Script = {
      codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtMainnetType, true)).toBe(true);

    const xudtMainnetErrorType: CKBComponents.Script = {
      codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtMainnetErrorType, true)).toBe(false);
  });

  it('calculateRgbppCellCapacity', () => {
    const firstInput = {
      previousOutput: {
        txHash: '0x047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29',
        index: '0x0',
      },
      since: '0x0',
    };

    const typeId = generateUniqueTypeArgs(firstInput, 0);
    expect(typeId).toBe('0xdc03ec5c4086fcb813707c6dd8bf5b9848d7e335');
  });

  it('calculateRgbppClusterCellCapacity', () => {
    const clusterData = {
      name: 'Name of the cluster',
      description: 'Description of the cluster',
    };
    const capacity = calculateRgbppClusterCellCapacity(clusterData);
    expect(capacity).toBe(BigInt(211_0000_0000));
  });
});
