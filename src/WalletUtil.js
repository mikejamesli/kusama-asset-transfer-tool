const { decodeAddress, encodeAddress } = require("@polkadot/keyring");
const { hexToU8a, isHex } = require("@polkadot/util");

export const isValidAddressPolkadotAddress = (address) => {
  try {
    encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));

    return true;
  } catch (error) {
    return false;
  }
};

export const convertToSs58_268 = (keyring, wallet) => {
  if (keyring == null || wallet == null) {
    return wallet;
  }
  wallet = wallet.trim();
  const walletDecoded = keyring.decodeAddress(wallet);
  return keyring.encodeAddress(walletDecoded, 268);
};

export const convertToSs58_42 = (keyring, wallet) => {
  if (keyring == null || wallet == null) {
    return wallet;
  }
  wallet = wallet.trim();
  const walletDecoded = keyring.decodeAddress(wallet);
  return keyring.encodeAddress(walletDecoded, 42);
};
