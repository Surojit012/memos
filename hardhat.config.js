require('@nomicfoundation/hardhat-ethers')
require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const accounts = process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 200,
      }
    }
  },
  networks: {
    galileo: {
      url: process.env.NEXT_PUBLIC_0G_RPC || 'https://evmrpc-testnet.0g.ai',
      chainId: 16602,
      accounts,
    },
    mainnet: {
      url: process.env.MAINNET_0G_RPC || 'https://evmrpc.0g.ai',
      chainId: 16661,
      accounts,
    },
  },
}
