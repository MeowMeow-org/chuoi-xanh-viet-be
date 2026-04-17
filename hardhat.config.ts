import 'dotenv/config'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const PRIVATE_KEY = (process.env.ANCHOR_WALLET_PRIVATE_KEY ?? '').replace(/^0x/, '')
const RPC_URL = process.env.SEPOLIA_RPC_URL ?? ''

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    sepolia: {
      url: RPC_URL,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : []
    }
  },
  paths: {
    sources: './contracts',
    artifacts: './contracts/artifacts'
  }
}

export default config
