import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5'
import { ethers } from 'ethers'
import { writable, derived, get } from 'svelte/store';

/* from https://github.com/arikw/flat-promise/blob/master/index.js */
export function flatPromise<T = unknown>() {
    let resolve: (value: T | PromiseLike<T>) => void
    let reject: (reason?: any) => void

    const promise = new Promise<T>((resolve_, reject_) => {
        resolve = resolve_;
        reject = reject_;
    });

    return {
        promise,
        resolve: resolve!,
        reject: reject!
    };
}

type Modal = ReturnType<typeof createWeb3Modal>

const projectId = import.meta.env.VITE_PROJECT_ID
const chains = [
    {
        chainId: 1,
        name: 'Ethereum Mainnet',
        currency: 'ETH',
        explorerUrl: 'https://etherscan.io',
        rpcUrl: 'https://cloudflare-eth.com'
    },
    {
        chainId: 5,
        name: 'Goerli Testnet',
        currency: 'GoerliETH',
        explorerUrl: 'https://goerli.etherscan.io',
        rpcUrl: 'https://rpc.ankr.com/eth_goerli'
    }
]

function getChainById(id: number | undefined) {
    if (!id) {
        return undefined
    }

    return chains.find((chain) => chain.chainId == id)
}

const ethersConfig = defaultConfig({
    enableCoinbase: true,
    enableEIP6963: true,
    enableInjected: true,
    metadata: {
        name: 'My Website',
        description: 'My Website description',
        url: 'https://mywebsite.com',
        icons: ['https://avatars.mywebsite.com/']
    },
    defaultChainId: chains[0].chainId,
    rpcUrl: chains[0].rpcUrl,
})


export const modal = writable<ReturnType<typeof createWeb3Modal>>()
export const walletProvider = writable<ethers.providers.ExternalProvider>()
export const address = writable<string>()
export const isConnected = writable<boolean>()
export const chain = writable<typeof chains[0]>()
export const error = writable<string>()
export const isOpen = writable<boolean>()
export const selectedNetworkId = writable<number>()
export const event = writable<ReturnType<Modal['getEvent']>>()


let initialized = false
export function initialize() {
    if (initialized) {
        return
    }

    const web3Modal = createWeb3Modal({
        ethersConfig,
        projectId,
        chains,
        themeMode: 'dark',
        themeVariables: {
            '--w3m-font-family': "'IBM Plex Sans', 'Roboto'",
            '--w3m-accent': '#8b34fa',
            '--w3m-color-mix-strength': 0,
            '--w3m-border-radius-master': '0px',
        }
    })

    modal.set(web3Modal)

    walletProvider.set(web3Modal.getWalletProvider()!)
    address.set(web3Modal.getAddress()!)
    isConnected.set(web3Modal.getIsConnected()!)
    chain.set(getChainById(web3Modal.getChainId())!)
    isOpen.set(web3Modal.getState().open)
    selectedNetworkId.set(web3Modal.getState().selectedNetworkId!)

    web3Modal.subscribeProvider((state: any) => {
        walletProvider.set(state.provider)
        address.set(state.address)
        isConnected.set(state.isConnected)
        chain.set(getChainById(state.chainId)!)
        error.set(state.error)
    })

    web3Modal.subscribeState((next) => {
        isOpen.set(next.open)
        selectedNetworkId.set(next.selectedNetworkId!)
    })

    web3Modal.subscribeEvents((next) => {
        event.set({ ...next })
    })

    console.log("[web3] initialized")
    initialized = true
}

export async function openConnect() {
    await get(modal)?.open({
        "view": "Connect"
    })
}

export async function openNetworks() {
    await get(modal)?.open({
        "view": "Networks"
    })
}

export async function close() {
    await get(modal)?.close()
}

let connectPromise: ReturnType<typeof flatPromise<string>> | undefined

event.subscribe((event) => {
    if (connectPromise && event!.data.event == "MODAL_CLOSE") {
        connectPromise.reject("modal closed")
    }
})

isConnected.subscribe((isConnected) => {
    if (connectPromise && isConnected) {
        connectPromise.resolve(get(address)!)
    }
})

export async function connect(): Promise<string> {
    if (get(isConnected) && get(address)) {
        return get(address)
    }

    try {
        connectPromise = flatPromise()

        await openConnect()

        return await connectPromise.promise
    } finally {
        connectPromise = undefined
    }
}

export async function disconnect() {
    if (get(isConnected)) {
        await get(modal)?.disconnect()
    }
}

export const shortAddress = derived(address, ($address) => {
    if ($address) {
        return `${$address.substring(0, 6)}…${$address.substr(-4)}`
    }
})

export const etherscanUrl = derived(address, ($address) => {
    if ($address) {
        return `https://etherscan.io/address/${$address}`
    }
})

export const ethersProvider = derived(walletProvider, ($walletProvider) => {
    if ($walletProvider) {
        return new ethers.providers.Web3Provider($walletProvider)
    }
})

export const signer = derived(ethersProvider, ($ethersProvider) => {
    if ($ethersProvider) {
        return $ethersProvider?.getSigner()
    }
})

export function loadContract(
    contract: { abi: any, networks: any },
) {
    return derived([signer, chain], ([$signer, $chain]) => {
        if (!$signer) {
            console.log("no signer")
            return undefined
        }

        const chainId = $chain?.chainId
        const address = contract.networks[`${chainId}`]?.address
        if (!address) {
            console.log("no address")
            return undefined
        }

        return new ethers.Contract(address, contract.abi, $signer)
    })
}

import erc20 from "../web3/abi/erc20.json"
export const usdc = loadContract({
    abi: erc20,
    networks: {
        "1": {
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        }
    }
})
