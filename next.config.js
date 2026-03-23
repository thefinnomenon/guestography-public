const CopyPlugin = require("copy-webpack-plugin");
const FOREVER_CACHE_TTL_SECONDS = 60 * 60 * 24 * 365 * 100;

module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ["image/avif", "image/webp"],
    domains: ["pub-bedeb084f89f4d399783f981c721c4c5.r2.dev"],
    // Cache optimized images effectively forever.
    minimumCacheTTL: FOREVER_CACHE_TTL_SECONDS,
  },
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  async rewrites() {
    return [
      {
        source: "/mixpanel/lib.min.js",
        destination: "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js",
      },
      {
        source: "/mixpanel/lib.js",
        destination: "https://cdn.mxpnl.com/libs/mixpanel-2-latest.js",
      },
      {
        source: "/mixpanel/decide",
        destination: "https://decide.mixpanel.com/decide",
      },
      {
        source: "/mixpanel/:slug",
        destination: "https://api.mixpanel.com/:slug",
      },
    ];
  },
  webpack: function (config, { isServer }) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    config.plugins = [
      ...config.plugins,
      new CopyPlugin({
        patterns: [
          {
            from: "./node_modules/mediainfo.js/dist/MediaInfoModule.wasm",
            to: ".",
          },
        ],
      }),
    ];

    if (!isServer) {
      config.resolve.fallback = {
        module: false,
      };
    }

    return config;
  },
};

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,

    org: "the-finnternet",
    project: "guestography",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: false,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  }
);
