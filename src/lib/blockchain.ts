import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'

// ABI khớp với contracts/DiaryAnchor.sol
const DIARY_ANCHOR_ABI = parseAbi(['function anchor(string calldata seasonId, bytes32 dataHash) external'])

/**
 * Gửi 1 transaction lên Sepolia để neo SHA-256 hash của season lên chain.
 *
 * Yêu cầu env:
 *   SEPOLIA_RPC_URL           — RPC endpoint (ví dụ: https://sepolia.infura.io/v3/...)
 *   ANCHOR_WALLET_PRIVATE_KEY — Private key ví neo (có ETH Sepolia để trả gas)
 *   ANCHOR_CONTRACT_ADDRESS   — Địa chỉ contract DiaryAnchor đã deploy lên Sepolia
 *
 * Trả về { txHash, txUrl } ngay sau khi tx được broadcast (không chờ confirm).
 * Status = pending; BE/worker có thể poll receipt sau nếu cần.
 */
export async function sendAnchorTx({ seasonId, dataHash }: { seasonId: string; dataHash: string }): Promise<{
  txHash: string
  txUrl: string
}> {
  const rawKey = process.env.ANCHOR_WALLET_PRIVATE_KEY
  const contractAddress = process.env.ANCHOR_CONTRACT_ADDRESS
  const rpcUrl = process.env.SEPOLIA_RPC_URL

  if (!rawKey || !contractAddress || !rpcUrl) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      message: USER_MESSAGES.BLOCKCHAIN_NOT_CONFIGURED
    })
  }

  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`
  const account = privateKeyToAccount(privateKey)

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl)
  })

  // SHA-256 = 32 bytes = 64 hex chars → fit bytes32 trong Solidity
  const dataHashBytes32 = `0x${dataHash}` as `0x${string}`

  const txHash = await walletClient.writeContract({
    address: contractAddress as `0x${string}`,
    abi: DIARY_ANCHOR_ABI,
    functionName: 'anchor',
    args: [seasonId, dataHashBytes32]
  })

  const txUrl = `https://sepolia.etherscan.io/tx/${txHash}`
  return { txHash, txUrl }
}

/**
 * Lấy receipt của 1 transaction. Trả về null nếu chưa được mine (pending).
 * Dùng bởi worker để cập nhật status anchored/failed sau khi tx được confirm.
 */
export async function fetchAnchorReceipt(txHash: `0x${string}`) {
  const rpcUrl = process.env.SEPOLIA_RPC_URL
  if (!rpcUrl) return null

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  })

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
    return receipt
  } catch {
    // Tx chưa mine → viem ném lỗi TransactionReceiptNotFoundError. Bỏ qua, chờ lần poll tiếp.
    return null
  }
}

