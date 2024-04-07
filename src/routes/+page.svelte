<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import {
		connect,
		openConnect,
		openNetworks,
		chain,
		close,
		disconnect,
		initialize,
		isConnected,
		isOpen,
		address,
		shortAddress,
		etherscanUrl,
		usdc
	} from '../stores/web3';

	onMount(initialize);

	let symbol = 0;
	let balance = '?';
	// dummy address found on https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48#balances
	let addressInput = '0xad69cd2E116637A9d01ba3B92CE81476d2397bD9';

	async function refresh() {
		if (!$usdc) {
			return;
		}

		symbol = await $usdc.symbol();

		if (addressInput) {
			balance = (await $usdc.balanceOf(addressInput)).toString();
		} else {
			balance = '?';
		}

		console.log({ addressInput, symbol, balance });
	}

	onDestroy(
		address.subscribe((address) => {
			if (!addressInput) {
				addressInput = address;
				refresh();
			}
		})
	);

	onDestroy(usdc.subscribe(refresh));
</script>

<section>
	<pre><code
			>{JSON.stringify(
				{
					$isConnected,
					$isOpen,
					$address,
					$shortAddress,
					$chain,
					$etherscanUrl
				},
				null,
				4
			)}</code
		></pre>
	<button on:click={connect}>connect</button>
	<button on:click={openConnect}>openConnect</button>
	<button on:click={openNetworks}>openNetworks</button>
	<button on:click={close}>close</button>
	<button on:click={disconnect}>disconnect</button>

	<br />
	<br />
	<br />
	<pre><code
			>{JSON.stringify(
				{
					symbol,
					balance
				},
				null,
				4
			)}</code
		></pre>
	<input bind:value={addressInput} type="text" />
	<button on:click={refresh}>refresh</button>
</section>
