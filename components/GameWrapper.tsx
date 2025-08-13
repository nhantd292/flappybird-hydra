'use client';
import { useState } from "react";
import FlappyBird from "./FlappyBird";
import Leaderboard from "./Leaderboard";
import Stats from "./Stats";
import NameInput from "./NameInput";

import { TxBuilder } from '@hydrawallet-sdk/transaction'
import { AppWallet, NETWORK_ID, deserializeTx } from '@hydrawallet-sdk/core'
import { HydraBridge } from '@hydrawallet-sdk/bridge'


export async function buildTransaction() {
    const bridge = new HydraBridge({
        url: 'ws://hydranode-10035.hexcore.io.vn',
        verbose: true
    })
    // Set up event handlers
    bridge.events.on('onConnected', async () => {
        console.log('Connected! Initializing Head...')
        bridge.commands.init()
    })

    // Connect to start the process
    bridge.connect()



    // bridge.connect()
    // const isConnected = bridge.connected()
    // console.log('Connected:', isConnected)
    // const protocolParams = await bridge.getProtocolParameters()
    // // console.log('Protocol Parameters:', protocolParams)
    // const addressUtxos = await bridge.queryAddressUTxO('addr_test1qqgagp6hm64jsxphelk494rpwysrkk8gzlhn8cnaueqqsqmfksxjux7q5ulgtfe9f40zt2sz0w4rw9t06kft8qa0w2cqxzut0c')
    // console.log('Address UTxOs:', addressUtxos)


    // const wallet = new AppWallet({
    //     networkId: NETWORK_ID.PREPROD, // or NETWORK_ID.MAINNET
    //     key: {
    //         type: 'mnemonic',
    //         words: ['gloom', 'turkey', 'alcohol', 'outer', 'diet', 'capable', 'album', 'blame', 'hobby', 'depend', 'rebuild', 'ecology', 'metal', 'display', 'clerk', 'million', 'pistol', 'project', 'palace', 'cricket', 'country', 'tag', 'consider', 'tray'] // 12, 15, or 24 words
    //     }
    // })

    // const txBuilder = new TxBuilder({
    //     isHydra: true, // Optional Hydra mode
    //     params: protocolParams,
    // })
    // const tx = await txBuilder
    //     .txOut('addr_test1qqgagp6hm64jsxphelk494rpwysrkk8gzlhn8cnaueqqsqmfksxjux7q5ulgtfe9f40zt2sz0w4rw9t06kft8qa0w2cqxzut0c', [{ unit: 'lovelace', quantity: '1000000' }])
    //     .txIn('07ab4784bb144054a4b5be2ae756f122d8a7404b287f8b052167569173963a08', 0, [{ unit: 'lovelace', quantity: '20000000' }], 'addr_test1qqgagp6hm64jsxphelk494rpwysrkk8gzlhn8cnaueqqsqmfksxjux7q5ulgtfe9f40zt2sz0w4rw9t06kft8qa0w2cqxzut0c')
    //     .changeAddress('addr_test1qqgagp6hm64jsxphelk494rpwysrkk8gzlhn8cnaueqqsqmfksxjux7q5ulgtfe9f40zt2sz0w4rw9t06kft8qa0w2cqxzut0c')
    //     .complete()
    // console.log('Transaction built:', tx)
    // const txs = await wallet.signTx(tx.to_hex())
    // console.log('txs:', txs)

    // return txs;
}


export default function GameWrapper() {

    // processHydraTransactions()

    const [playerName, setPlayerName] = useState<string | null>(null);

    if (!playerName) return <NameInput onSubmit={setPlayerName} />;

    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full max-w-5xl mx-auto p-4">
            {/* Game */}
            <div className="flex-1 flex flex-col items-center bg-white rounded-lg shadow p-4">
                <FlappyBird />
            </div>
            {/* Leaderboard + Stats */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <Leaderboard />
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <Stats />
                </div>
            </div>
        </div>
    );
}
