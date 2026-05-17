import { useEffect } from 'react'
import algosdk from 'algosdk'
import { getNetworkConfig } from '../services/networkConfig'
import { useOpsStore } from '../store/opsStore'

/** Poll algod for live block height (sidebar + ops health). */
export function useAlgodStatus(pollMs = 12_000) {
  const setNetworkBlock = useOpsStore((s) => s.setNetworkBlock)

  useEffect(() => {
    const { algod, network } = getNetworkConfig()
    const client = new algosdk.Algodv2(algod.token, algod.server, algod.port)

    let cancelled = false
    const tick = async () => {
      try {
        const status = await client.status().do()
        if (!cancelled) setNetworkBlock(Number(status['last-round']))
      } catch {
        /* algod unreachable — keep last block */
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), pollMs)
    useOpsStore.setState({ networkLabel: `Algorand ${network}` })
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pollMs, setNetworkBlock])
}
