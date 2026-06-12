module.exports = {
  webpack: {
    alias: {
      accounts: false,
    },
    configure: (webpackConfig) => {
      // Code splitting
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        splitChunks: {
          chunks: "all",
          maxInitialRequests: 20,
          cacheGroups: {
            rainbowkit: {
              test: /[\\/]node_modules[\\/]@rainbow-me[\\/]/,
              name: "rainbowkit",
              chunks: "all",
              priority: 20,
            },
            wagmi: {
              test: /[\\/]node_modules[\\/](wagmi|@wagmi|viem)[\\/]/,
              name: "wagmi",
              chunks: "all",
              priority: 20,
            },
            ethers: {
              test: /[\\/]node_modules[\\/]ethers[\\/]/,
              name: "ethers",
              chunks: "all",
              priority: 20,
            },
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
          },
        },
      };
      return webpackConfig;
    },
  },
};
