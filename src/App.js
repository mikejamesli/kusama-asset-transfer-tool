import React, { useState, createRef } from "react";
import { Redirect, Router } from "@reach/router";
import Home from "./Home";
import { Layout, Col, Row, Spin, Card } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import "./App.scss";
import "antd/dist/antd.css";

import { SubstrateContextProvider, useSubstrate } from "./substrate-lib";

const { Header } = Layout;
function App() {
  const [loading, setLoading] = useState();
  const loadingIcon = <LoadingOutlined style={{ fontSize: 36 }} spin />;

  const loader = (text) => (
    <Spin className="loader" indicator={loadingIcon} tip={text} />
  );
  return (
    <SubstrateContextProvider>
      <Layout className="layout">
        <Router>
          <Home setLoading={setLoading} path="/"></Home>
        </Router>
      </Layout>
    </SubstrateContextProvider>
  );
}

export default App;