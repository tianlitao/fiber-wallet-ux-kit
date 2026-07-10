import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {(phase: string, options?: { defaultConfig?: import('next').NextConfig }) => import('next').NextConfig} */
const createNextConfig = (phase) => ({
  output: phase === PHASE_DEVELOPMENT_SERVER ? undefined : "export",
  async headers() {
    return [
      {
        source: "/:path((?!joyid-sign-bridge).*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
      {
        source: "/joyid-sign-bridge",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
});

export default createNextConfig;
