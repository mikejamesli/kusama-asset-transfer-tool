export const validateAmountToExecuteTransaction = (
  amount,
  tx,
  balance,
  minimumAmount = 0
) => {
  if (
    Number(amount) >= Number(minimumAmount) &&
    Number(amount) <= Number(balance) - Number(tx)
  ) {
    return true;
  } else {
    return false;
  }
};

export const calculateTransactionFee = async (
  pallet,
  extrinsic,
  params,
  balancesApi,
  swapApi,
  keyring,
  account
) => {
  let signedAccount = null;
  if (account == null) {
    return;
  } else {
    signedAccount = account;
  }
  const accountPair =
    signedAccount && signedAccount.address
      ? keyring.getPair(signedAccount.address)
      : keyring.getPair(signedAccount);

  let result;
  try {
    result = await balancesApi.getTransactionFee(pallet, extrinsic, params, {
      account: accountPair,
      waitToFinalized: true,
    });
    return swapApi.balanceToDecimal(result.partialFee.toJSON());
  } catch (e) {
    console.log(e);
    return null;
  }
};

