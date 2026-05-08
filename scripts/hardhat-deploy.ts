import 'dotenv/config'
import { ethers } from 'hardhat'
import fs from 'fs'
import path from 'path'

async function main() {
  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`\n🔑 Địa chỉ ví: ${deployer.address}`)
  console.log(`💰 Số dư:       ${ethers.formatEther(balance)} ETH`)

  if (balance === 0n) {
    console.error('\n❌ Ví không có ETH Sepolia. Lấy ETH tại: https://faucets.alchemy.com/ethereum-sepolia')
    process.exit(1)
  }

  console.log(`\n📦 Đang compile + deploy DiaryAnchor...`)
  const DiaryAnchor = await ethers.getContractFactory('DiaryAnchor')
  const contract = await DiaryAnchor.deploy()
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  const txHash = contract.deploymentTransaction()?.hash

  console.log(`\n✅ Deploy thành công!`)
  console.log(`📍 Contract address: ${address}`)
  if (txHash) {
    console.log(`🔗 TX:              https://sepolia.etherscan.io/tx/${txHash}`)
    console.log(`🔗 Contract:        https://sepolia.etherscan.io/address/${address}`)
  }
  console.log(`\n👉 Thêm vào .env:`)
  console.log(`ANCHOR_CONTRACT_ADDRESS=${address}`)

  // Tự ghi vào file .env
  const envPath = path.resolve(__dirname, '../.env')
  let envContent = fs.readFileSync(envPath, 'utf8')
  // Dùng `(?:#\s*)?` để match và thay cả dòng đã bị comment (tránh lần sau chỉ sửa phần value,
  // giữ lại dấu '#' khiến dotenv bỏ qua biến này).
  const anchorLineRegex = /^[ \t]*(?:#\s*)?ANCHOR_CONTRACT_ADDRESS=.*$/m
  if (anchorLineRegex.test(envContent)) {
    envContent = envContent.replace(anchorLineRegex, `ANCHOR_CONTRACT_ADDRESS=${address}`)
  } else {
    envContent += `\nANCHOR_CONTRACT_ADDRESS=${address}\n`
  }
  fs.writeFileSync(envPath, envContent)
  console.log(`\n✅ Đã tự ghi ANCHOR_CONTRACT_ADDRESS vào .env`)
}

main().catch((err) => {
  console.error('❌ Lỗi deploy:', err.message ?? err)
  process.exit(1)
})
