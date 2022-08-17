import React, { useState, useEffect } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Grid, Label, Message, Card } from "semantic-ui-react";
import { Menu, Select, Row, Col, Button } from "antd";
import { Link } from "@reach/router";
import { useSubstrate } from "./substrate-lib";
import Identicon from '@polkadot/react-identicon';
import { FireFilled } from "@ant-design/icons";
import MetaverseNetwork from './MN.png'


function Main(props) {
  const sudoAccounts = [
    "ALICE",
    "ALICE_STASH",
    "BOB",
    "BOB_STASH",
    "CHARLIE",
    "DAVE",
    "EVE",
    "FERDIE",
  ];
  const [accountSelected, setAccountSelected] = useState("");

  const { apiManager, apiState, keyring, keyringState, apiError } = useSubstrate();
  const { setAccountAddress, setLoading, setSelectedType, setShowTransferModal, setFreeNativeTokenBalance, setFreeBitTokenBalance } = props;

  // Get the list of accounts we possess the private key for
  const keyringOptions = keyring
    .getPairs()
    .map((account) => ({
      key: account.address,
      value: account.address,
      text: account.meta.name.toUpperCase(),
      icon: "user",
    }))
    .filter((account) => sudoAccounts.includes(account.text) != true);

  const initialAddress =
    keyringOptions.length > 0 ? keyringOptions[0].value : "";

  // Set the initial address
  useEffect(() => {
    setAccountAddress(initialAddress);
    setAccountSelected(initialAddress);
    if (keyring) {
      const accountPair = keyring.getPair(initialAddress);
      apiManager.setAccount(accountPair, keyring);
    }
  }, [setAccountAddress, initialAddress, keyring]);

  const onChange = (address) => {
    // Update state with new account address
    setAccountAddress(address);
    setAccountSelected(address);
    const accountPair = keyring.getPair(address);
    apiManager.setAccount(accountPair, keyring);
  };

  return (
    <div className="menu">
      <div className="account-selector">
        {!accountSelected ? (
          <span>
            Add your account with the{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/polkadot-js/extension"
            >
              Polkadot JS Extension
            </a>
          </span>
        ) : (
          <>
            <div className="available-balance-label">
              Wallet
            </div>
            <Select
              className="wallet-select"
              onChange={onChange}
              defaultValue={keyringOptions && (keyringOptions[0].key)}
            >
              {keyringOptions.map((account, i) => (
                <div key={i} value={account.key}>
                  <Row style={{ alignItems: "center" }}>
                    <Col span={2}>
                      <Identicon value={account.key} theme={"polkadot"} size={32} />
                    </Col>
                    <Col span={22}>
                      <Row>
                        <div style={{ textAlign: "left", fontWeight: "bold" }}>{account.text}</div>
                      </Row>
                      <Row>
                        <div>{account.key}</div>
                      </Row>
                    </Col>
                  </Row>
                </div>
              ))}
            </Select>
          </>
        )}
      </div>
      <div style={{ paddingLeft: "10px", marginTop: "2em" }}>
        <BalanceAnnotation
          accountSelected={accountSelected}
          setSelectedType={setSelectedType}
          setShowTransferModal={setShowTransferModal}
          setFreeNativeTokenBalance={setFreeNativeTokenBalance}
          setFreeBitTokenBalance={setFreeBitTokenBalance} />
      </div>
    </div >
  );
}

function BalanceAnnotation(props) {
  const { accountSelected, setSelectedType, setShowTransferModal, setFreeNativeTokenBalance, setFreeBitTokenBalance } = props;
  const { api, swapApi } = useSubstrate();
  const [nativeTokenBalance, setNativeTokenBalance] = useState(0);
  const [bitBalance, setBitBalance] = useState(0);

  // When account address changes, update subscriptions
  useEffect(() => {
    let unsubscribe;

    // If the user has selected an address, create a new subscription
    accountSelected &&
      api.query.system
        .account(accountSelected, (balance) => {
          const balanceData = balance.data.toHuman()
          const freeBalance = parseFloat(swapApi.balanceToDecimal(parseFloat(balanceData.free.replace(/,/g, "")) - parseFloat(balanceData.miscFrozen.replace(/,/g, ""))))
          setNativeTokenBalance(freeBalance.toFixed(4))
          setFreeNativeTokenBalance(freeBalance)
        })
        .then((unsub) => {
          unsubscribe = unsub;
        })
        .catch(console.error);

    api.query.tokens
      .accounts(accountSelected, { miningResource: 0 }, (balance) => {
        const freeBalance = parseFloat(swapApi.balanceToDecimal(balance.free.toHuman().replace(/,/g, "")))
        const formattedBalance = freeBalance.toFixed(4)
        setBitBalance(formattedBalance);
        setFreeBitTokenBalance(freeBalance)
      })
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch(console.error);

    return () => unsubscribe && unsubscribe();
  }, [api, accountSelected]);

  return accountSelected ? (
    <>
      <div className="available-balance-label">
        Assets
      </div>
      <Card bordered={false} className="home-card">
        <div>
          <div className="asset-card" style={{ borderBottom: "1px solid #3f3f3f" }}>
            <span className="ticker"> <img src={MetaverseNetwork} />  NEER</span>
            <div>
              {nativeTokenBalance}
              <Button className="transfer-button" onClick={() => { setSelectedType("NEER"); setShowTransferModal(true) }}>Transfer</Button>
            </div>
          </div>
          <div className="asset-card">
            <span className="ticker"><img src={MetaverseNetwork} /> BIT</span>
            <div>
              {bitBalance}
              <Button className="transfer-button" onClick={() => { setSelectedType("BIT"); setShowTransferModal(true) }}>Transfer</Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  ) : null;
}

export default function AccountSelector(props) {
  const { api, keyring, keyringState, apiState, apiError } = useSubstrate();

  const message = (err) => (
    <Grid centered columns={2} padded>
      <Grid.Column>
        <Message
          negative
          compact
          floating
          header="Error Connecting to Bit.Country Testnet Chain"
          content={`${JSON.stringify(err, null, 4)}`}
        />
      </Grid.Column>
    </Grid>
  );

  if (apiState === "ERROR") return message(apiError);

  // if (keyringState !== "READY") {
  //   props.setLoading(
  //     "Loading accounts (please review any extension's authorization)"
  //   );
  // }

  if (apiState !== "READY") {
    props.setLoading(
      "Connecting to Bit.Country Testnet Chain. Polkadot JS Extension is required to use this site."
    );
  }

  if (keyringState !== "READY" || apiState !== "READY") {
    return false;
  } else {
    props.setLoading(null);
  }

  return keyring.getPairs && api.query ? <Main {...props} /> : null;
}
