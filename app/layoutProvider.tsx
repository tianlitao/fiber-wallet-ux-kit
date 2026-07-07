/* eslint-disable*/
"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { CSSProperties } from "react";
import React from "react";
import { FiberProvider } from "@/lib/fiberContext";
import { FiberWalletSignersController } from "@/lib/joyid/FiberWalletSignersController";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const defaultClient = React.useMemo(() => {
    return new ccc.ClientPublicTestnet();
  }, []);
  const signersController = React.useMemo(
    () => new FiberWalletSignersController(),
    [],
  );

  return (
    <ccc.Provider
      connectorProps={{
        style: {
          "--background": "#232323",
          "--divider": "rgba(255, 255, 255, 0.1)",
          "--btn-primary": "#2D2F2F",
          "--btn-primary-hover": "#515151",
          "--btn-secondary": "#2D2F2F",
          "--btn-secondary-hover": "#515151",
          "--icon-primary": "#FFFFFF",
          "--icon-secondary": "rgba(255, 255, 255, 0.6)",
          color: "#ffffff",
          "--tip-color": "#666",
        } as CSSProperties,
      }}
      signersController={signersController}
      defaultClient={defaultClient}
      clientOptions={[
        {
          name: "CKB Testnet",
          client: new ccc.ClientPublicTestnet(),
        },
      ]}
    >
      <FiberProvider>{children}</FiberProvider>
    </ccc.Provider>
  );
}
