import React, { useState, createRef, useEffect } from "react";
import { Row, Col, Button, Input, InputNumber, Card, Modal } from "antd";
import { SendOutlined } from "@ant-design/icons";
import {
    convertToSs58_42,
    isValidAddressPolkadotAddress,
} from "./WalletUtil";
import { web3Accounts } from '@polkadot/extension-dapp';
import { useSubstrate } from "./substrate-lib";
import ReactDOMServer from "react-dom/server";
import AccountSelector from "./AccountSelector";
import Swal from "sweetalert2";
import {
    validateAmountToExecuteTransaction,
    calculateTransactionFee,
} from "./BalancesApiUtil";
import { addressToEvm } from "@polkadot/util-crypto";

function Main(props) {
    const { api, keyring, swapApi, account, balancesApi } =
        useSubstrate();
    const [accountAddress, setAccountAddress] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [transferButtonLoading, setTransferButtonLoading] = useState(false)
    const [address, setAddress] = useState();
    const [amount, setAmount] = useState();
    const [status, setStatus] = useState();
    const [selectedType, setSelectedType] = useState("BIT");
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [txFee, setTxFee] = useState()
    const [addressError, setAddressError] = useState()
    const [amountError, setAmountError] = useState()
    const [freeNativeTokenBalance, setFreeNativeTokenBalance] = useState()
    const [freeBitTokenBalance, setFreeBitTokenBalance] = useState()

    const transfer = async () => {
        if (!txFee) {
            return
        }
        if (transferButtonLoading) {
            return;
        }
        setAddressError()
        setAmountError()
        setTransferButtonLoading(true)
        try {
            let allAccounts = await web3Accounts();
            const recipientEncoded = convertToSs58_42(
                keyring,
                address
            );
            const accountPair = keyring.getPair(accountAddress);
            let result = null;
            if (selectedType == "NEER") {
                result = await balancesApi.transferToken(
                    recipientEncoded,
                    swapApi.decimalToBalance(amount),
                    setIsLoading,
                    setStatus,
                    { account: accountPair, waitToFinalized: false }
                );
            } else if (selectedType == "BIT") {
                result = await balancesApi.transferBIT(
                    recipientEncoded,
                    swapApi.decimalToBalance(amount),
                    setIsLoading,
                    setStatus,
                    { account: accountPair, waitToFinalized: false }
                );
            }
            await result.send;
            const inBlock = await result.inBlock;
            const hash = inBlock.blockHash.toString()
            const txHash = inBlock.txHash.toString()
            handleCloseTransferModal()
            Swal.fire({
                title: `Transfer ${selectedType} Successful`,
                html: ReactDOMServer.renderToString(
                    <div style={{ textAlign: "left" }}>
                        <div className="summary-modal-lines">
                            <div>Amount:</div>
                            <b>{amount} {selectedType}</b>
                        </div>
                        <div className="summary-modal-lines">
                            <div>To: </div>
                            <b style={{ fontSize: "13px" }}>{address}</b>
                        </div>
                        <div className="summary-modal-lines">
                            <div>Transaction Hash:</div>
                            <b style={{ fontSize: "13px" }}>{hash}</b>
                        </div>
                        <a href={`https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fdev-chain.bit.country#/explorer/query/${hash}`} target="_blank">View transaction on PolkadotJS</a>
                    </div>
                ),
                icon: "success",
            });
            setTransferButtonLoading(false)

        } catch (e) {
            console.log(e.toString())
            setTransferButtonLoading(false)
            if (e.toString() !== "Error: Cancelled") {
                Swal.fire({
                    title: `Transfer ${selectedType} Failed`,
                    text: e.toString(),
                    icon: "error",
                })
            }
        }
    }

    const onInputChanged = (value) => {
        setAddress(value)
        setAddressError()
    }

    const onAmountChanged = (value) => {
        setAmount(value)
        setAmountError()
    }

    useEffect(() => {
        if (amount && address) {
            const delayDebounceFn = setTimeout(() => {
                (async () => {
                    if (!isValidAddressPolkadotAddress(address)) {
                        setAddressError("Invalid Address")
                        return
                    } else {
                        setAddressError();
                    }
                    const txFee = await calculateTransactionFee(
                        selectedType == "NEER" ? "balances" : "currencies",
                        "transfer",
                        selectedType == "NEER" ? [address, swapApi.decimalToBalance(amount)] : [address, { MiningResource: 0 }, swapApi.decimalToBalance(amount)],
                        balancesApi,
                        swapApi,
                        keyring,
                        address
                    );
                    const freeBalance = selectedType == "NEER" ? freeNativeTokenBalance : freeBitTokenBalance;
                    if (amount == 0 || !validateAmountToExecuteTransaction(amount, txFee, freeBalance)) {
                        setAmountError("Insufficient funds for this transfer")
                        return
                    } else {
                        setAmountError()
                    }
                    setTxFee(txFee);
                })();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [amount, address]);

    const handleCloseTransferModal = () => {
        setShowTransferModal(false)
        setAmount()
        setAddress("")
        setTxFee()
    }

    useEffect(() => {
        console.log(showTransferModal)
    }, [showTransferModal])

    return (
        <>
            <Row style={{ padding: 20 }}>
                <Col
                    span="24"
                    style={{ textAlign: "center" }}
                >
                    <h1 style={{ color: "white", fontSize: "40px", margin: "50px" }}>
                        Kusama Asset Transfer Tool
                    </h1>
                    <AccountSelector setAccountAddress={setAccountAddress}
                        setLoading={props.setLoading}
                        setSelectedType={setSelectedType}
                        setShowTransferModal={setShowTransferModal}
                        setFreeNativeTokenBalance={setFreeNativeTokenBalance}
                        setFreeBitTokenBalance={setFreeBitTokenBalance}
                    />
                </Col>
            </Row>
            <Modal
                visible={showTransferModal}
                maskClosable={false}
                onCancel={handleCloseTransferModal}
                className="dark-modal"
                footer={
                    <Button
                        style={{ width: "100%" }}
                        onClick={transfer}
                        loading={transferButtonLoading}
                        disabled={amountError || addressError}
                        type="primary"
                    >
                        <SendOutlined /> Transfer
                    </Button>
                }
                width="33vw"
                title={`Transfer ${selectedType}`}
                centered
            >
                <div>
                    <div>
                        <div>
                            <h2>Target Address</h2>
                        </div>
                        <Input
                            value={address}
                            autoComplete="on"
                            onChange={(e) => onInputChanged(e.target.value)}
                            style={{
                                fontSize: "1.2em",
                                height: "51px",
                                borderRadius: "15px"
                            }}
                        ></Input>
                        {addressError && (<div style={{ color: "red", margin: "0.5em" }}><small>{addressError}</small></div>)}
                    </div>
                    <div style={{ marginTop: "2em" }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5em" }}>
                            <div className="transfer-title">Amount</div>
                            <span style={{ color: "white", marginLeft: "0.5em" }}>(Available: {selectedType == "NEER" ? freeNativeTokenBalance : freeBitTokenBalance})</span>
                        </div>
                        <InputNumber
                            value={amount}
                            onChange={(value) => onAmountChanged(value)}
                            style={{
                                width: "100%"
                            }}
                        ></InputNumber>
                        {amountError && (<div style={{ color: "red", margin: "1em 0.5em" }}><small>{amountError}</small></div>)}
                    </div>
                </div>
                <div className="transfer-asset-info">
                    <div>
                        Transaction fee
                    </div>
                    <div>
                        {txFee?.toString()} { }
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default function Home(props) {
    return <Main {...props} />;
}
