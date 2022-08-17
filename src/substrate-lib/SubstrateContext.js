import React, { useReducer, useContext } from 'react';
import PropTypes from 'prop-types';
import jsonrpc from '@polkadot/types/interfaces/jsonrpc';
import queryString from 'query-string';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import keyring from '@polkadot/ui-keyring';
import { Balances } from "@metaverse-network-sdk/sdk-balances";
import { Swap } from "@metaverse-network-sdk/sdk-swap";
import { ApiManager } from "@metaverse-network-sdk/api";
import config from '../config';

const parsedQuery = queryString.parse(window.location.search);
const connectedSocket = parsedQuery.rpc || config.PROVIDER_SOCKET;
console.log(`Connected socket: ${connectedSocket}`);

///
// Initial state for `useReducer`

const INIT_STATE = {
  socket: connectedSocket,
  jsonrpc: { ...jsonrpc, ...config.RPC },
  types: null,
  keyring: null,
  keyringState: null,
  api: null,
  apiManager: null,
  apiError: null,
  apiState: null,
  balancesApi: null,
  swapApi: null
};

let _api;
let _apiManager;

///
// Reducer function for `useReducer`

const reducer = (state, action) => {
  switch (action.type) {
    case 'CONNECT_INIT':
      return { ...state, apiState: 'CONNECT_INIT' };

    case 'CONNECT':
      return { ...state, api: action.payload, apiState: 'CONNECTING' };

    case 'CONNECT_SUCCESS':
      return { ...state, apiState: 'READY' };

    case 'CONNECT_ERROR':
      return { ...state, apiState: 'ERROR', apiError: action.payload };

    case 'LOAD_KEYRING':
      return { ...state, keyringState: 'LOADING' };

    case 'SET_KEYRING':
      return { ...state, keyring: action.payload, keyringState: 'READY' };

    case 'KEYRING_ERROR':
      return { ...state, keyring: null, keyringState: 'ERROR' };

    case 'SETUP_SDK':
      return { ...state, balancesApi: action.payload.balances, swapApi: action.payload.swap };

    case 'SETUP_API_MANAGER':
      return { ...state, apiManager: action.payload };

    default:
      throw new Error(`Unknown type: ${action.type}`);
  }
};

///
// Connecting to the Substrate node

const connect = async (state, dispatch) => {
  const { apiState, socket, jsonrpc, types } = state;
  // We only want this function to be performed once
  if (apiState) return;

  dispatch({ type: 'CONNECT_INIT' });
  // Set listeners for disconnection and reconnection event.
  _apiManager = await ApiManager.create({ wsEndpoint: socket });
  const balances = new Balances(_apiManager);
  const swap = new Swap(_apiManager);
  _api = _apiManager.api;
  dispatch({ type: "SETUP_API_MANAGER", payload: _apiManager });
  try {
    await _api.isReady;
    dispatch({ type: "CONNECT", payload: _api });
    // `ready` event is not emitted upon reconnection. So we check explicitly here.
    const connectTime = window.performance.now();
    _api.isReady.then((_api) =>
      dispatch({ type: "CONNECT_SUCCESS", payload: connectTime }));
  } catch (error) {
    console.log(error);
  }

  dispatch({
    type: "SETUP_SDK",
    payload: {
      balances,
      swap
    },
  });
};

///
// Loading accounts from dev and polkadot-js extension

let loadAccts = false;
const loadAccounts = (state, dispatch) => {
  const asyncLoadAccounts = async () => {
    dispatch({ type: 'LOAD_KEYRING' });
    try {
      await web3Enable(config.APP_NAME);
      let allAccounts = await web3Accounts();
      allAccounts = allAccounts.map(({ address, meta }) =>
        ({ address, meta: { ...meta, name: `${meta.name} (${meta.source})` } }));
      keyring.loadAll({ isDevelopment: config.DEVELOPMENT_KEYRING }, allAccounts);
      dispatch({ type: 'SET_KEYRING', payload: keyring });
    } catch (e) {
      console.error(e);
      dispatch({ type: 'KEYRING_ERROR' });
    }
  };

  const { keyringState } = state;
  // If `keyringState` is not null `asyncLoadAccounts` is running.
  if (keyringState) return;
  // If `loadAccts` is true, the `asyncLoadAccounts` has been run once.
  if (loadAccts) return dispatch({ type: 'SET_KEYRING', payload: keyring });

  // This is the heavy duty work
  loadAccts = true;
  asyncLoadAccounts();
};

const SubstrateContext = React.createContext();

const SubstrateContextProvider = (props) => {
  // filtering props and merge with default param value
  const initState = { ...INIT_STATE };
  const neededPropNames = ['socket', 'types'];
  neededPropNames.forEach(key => {
    initState[key] = (typeof props[key] === 'undefined' ? initState[key] : props[key]);
  });

  const [state, dispatch] = useReducer(reducer, initState);
  loadAccounts(state, dispatch);
  connect(state, dispatch);

  return <SubstrateContext.Provider value={state}>
    {props.children}
  </SubstrateContext.Provider>;
};

// prop typechecking
SubstrateContextProvider.propTypes = {
  socket: PropTypes.string,
  types: PropTypes.object
};

const useSubstrate = () => ({ ...useContext(SubstrateContext) });

export { SubstrateContextProvider, useSubstrate };
