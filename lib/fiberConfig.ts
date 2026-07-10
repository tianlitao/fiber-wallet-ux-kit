export const TESTNET_CONFIG = `
fiber:
  listening_addr: "/ip4/127.0.0.1/tcp/8228"
  bootnode_addrs:
    - "/dns4/thrall.fiber.channel/tcp/443/wss/p2p/Qmes1EBD4yNo9Ywkfe6eRw9tG1nVNGLDmMud1xJMsoYFKy"
    - "/dns4/onyxia.fiber.channel/tcp/443/wss/p2p/QmdyQWjPtbK4NWWsvy8s69NGJaQULwgeQDT5ZpNDrTNaeV"
  announce_listening_addr: false
  chain: testnet
  scripts:
    - name: FundingLock
      script:
        code_hash: 0x6c67887fe201ee0c7853f1682c0b77c0e6214044c156c7558269390a8afa6d7c
        hash_type: type
        args: 0x
      cell_deps:
        - type_id:
            code_hash: 0x00000000000000000000000000000000000000000000000000545950455f4944
            hash_type: type
            args: 0x3cb7c0304fe53f75bb5727e2484d0beae4bd99d979813c6fc97c3cca569f10f6
        - cell_dep:
            out_point:
              tx_hash: 0x5a5288769cecde6451cb5d301416c297a6da43dc3ac2f3253542b4082478b19b
              index: 0x0
            dep_type: code
    - name: CommitmentLock
      script:
        code_hash: 0x740dee83f87c6f309824d8fd3fbdd3c8380ee6fc9acc90b1a748438afcdf81d8
        hash_type: type
        args: 0x
      cell_deps:
        - type_id:
            code_hash: 0x00000000000000000000000000000000000000000000000000545950455f4944
            hash_type: type
            args: 0xf7e458887495cf70dd30d1543cad47dc1dfe9d874177bf19291e4db478d5751b
        - cell_dep:
            out_point:
              tx_hash: 0x5a5288769cecde6451cb5d301416c297a6da43dc3ac2f3253542b4082478b19b
              index: 0x0
            dep_type: code

rpc:
  listening_addr: "127.0.0.1:8227"

ckb:
  rpc_url: "https://testnet.ckbapp.dev/"
  udt_whitelist:
    - name: RUSD
      script:
        code_hash: 0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a
        hash_type: type
        args: 0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b
      cell_deps:
        - type_id:
            code_hash: 0x00000000000000000000000000000000000000000000000000545950455f4944
            hash_type: type
            args: 0x97d30b723c0b2c66e9cb8d4d0df4ab5d7222cbb00d4a9a2055ce2e5d7f0d8b0f
      auto_accept_amount: 1000000000

services:
  - fiber
  - rpc
  - ckb
`;

// --- Default peer node ---
export const DEFAULT_PEER_HOST = "fiber.nervosscan.com";
export const DEFAULT_PEER_PUBKEY = "0376333505e0cfc13bf2ffee4e55027606388b24f00acf418f6535d89cd30749da";
export const DEFAULT_PEER_ADDRESS = "/dns4/fiber.nervosscan.com/tcp/443/wss/p2p/QmYGNtMg2MkoXdDgbVd4YfDNh3mATJ2K8EUBw4FCHTrHT4";
export const DEFAULT_FUNDING_FEE_RATE = "0x7d0"; // 2000 shannons/KW

// --- CKB unit helpers ---

const SHANNONS_PER_CKB = 100_000_000n;
const CKB_AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,8}))?$/;

export function ckbToShannons(input: string): `0x${string}` {
  const value = input.trim();
  const match = CKB_AMOUNT_PATTERN.exec(value);

  if (!match) {
    throw new Error("Enter a valid CKB amount with up to 8 decimals.");
  }

  const whole = BigInt(match[1]);
  const fraction = (match[2] ?? "").padEnd(8, "0");
  const shannons =
    whole * SHANNONS_PER_CKB + BigInt(fraction.length > 0 ? fraction : "0");

  return `0x${shannons.toString(16)}`;
}

export function shannonsToDisplay(value: string): string {
  const shannons = BigInt(value);
  const whole = shannons / SHANNONS_PER_CKB;
  const fourDecimals = (shannons % SHANNONS_PER_CKB) / 10_000n;

  return `${whole}.${fourDecimals.toString().padStart(4, "0")}`;
}

export function hexToNumber(hex: string): number {
  return Number(BigInt(hex));
}
