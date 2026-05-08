/**
 * Deploy DiaryAnchor.sol lên Sepolia testnet.
 *
 * Chạy:
 *   npx ts-node -r dotenv/config scripts/deployDiaryAnchor.ts
 *
 * Sau khi chạy xong, copy địa chỉ contract vào .env:
 *   ANCHOR_CONTRACT_ADDRESS=0x...
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import solc from 'solc'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

function compileDiaryAnchor(): { abi: unknown[]; bytecode: `0x${string}` } {
  const contractPath = path.resolve(__dirname, '../contracts/DiaryAnchor.sol')
  const source = fs.readFileSync(contractPath, 'utf8')

  const input = {
    language: 'Solidity',
    sources: { 'DiaryAnchor.sol': { content: source } },
    settings: {
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object'] }
      },
      optimizer: { enabled: true, runs: 200 }
    }
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input)))

  if (output.errors) {
    const serious = output.errors.filter((e: { severity: string }) => e.severity === 'error')
    if (serious.length > 0) {
      console.error('Lỗi compile:')
      serious.forEach((e: { formattedMessage: string }) => console.error(e.formattedMessage))
      process.exit(1)
    }
  }

  const contract = output.contracts['DiaryAnchor.sol']['DiaryAnchor']
  const bytecode = contract.evm.bytecode.object as string
  const abi = contract.abi as unknown[]

  return {
    abi,
    bytecode: (bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`) as `0x${string}`
  }
}

async function main() {
  const rawKey = process.env.ANCHOR_WALLET_PRIVATE_KEY
  const rpcUrl = process.env.SEPOLIA_RPC_URL

  if (!rawKey || !rpcUrl) {
    console.error('Thiếu ANCHOR_WALLET_PRIVATE_KEY hoặc SEPOLIA_RPC_URL trong .env')
    process.exit(1)
  }

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`
  const account = privateKeyToAccount(privateKey)

  console.log(`\n📦 Đang compile DiaryAnchor.sol...`)
  const { abi, bytecode } = compileDiaryAnchor()
  console.log(`✅ Compile thành công (bytecode: ${bytecode.length / 2 - 1} bytes)`)

  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) })
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })

  console.log(`\n🔑 Địa chỉ ví: ${account.address}`)
  const balance = await publicClient.getBalance({ address: account.address })
  console.log(`💰 Số dư: ${Number(balance) / 1e18} ETH`)

  if (balance === 0n) {
    console.warn('\n⚠️  Ví không có ETH Sepolia. Lấy ETH miễn phí tại: https://sepoliafaucet.com')
    process.exit(1)
  }

  console.log(`\n🚀 Đang deploy lên Sepolia...`)
  const deployTxHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: []
  })

  console.log(`📡 Deploy TX: https://sepolia.etherscan.io/tx/${deployTxHash}`)
  console.log(`⏳ Đang chờ confirm...`)

  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash })

  if (!receipt.contractAddress) {
    console.error('❌ Deploy thất bại — không có contractAddress trong receipt')
    process.exit(1)
  }

  console.log(`\n✅ Deploy thành công!`)
  console.log(`📍 Contract address: ${receipt.contractAddress}`)
  console.log(`🔗 Xem trên Etherscan: https://sepolia.etherscan.io/address/${receipt.contractAddress}`)
  console.log(`\n👉 Thêm vào .env:`)
  console.log(`ANCHOR_CONTRACT_ADDRESS=${receipt.contractAddress}`)
}

main().catch((err) => {
  console.error('❌ Lỗi:', err)
  process.exit(1)
})
