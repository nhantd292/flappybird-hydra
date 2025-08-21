'use client';
import { useState, useEffect } from "react";
import { TxBuilder } from '@hydra-sdk/transaction';
import { HydraBridge } from '@hydra-sdk/bridge';
import { AppWallet, NETWORK_ID, deserializeTx } from '@hydra-sdk/core';

/* ví gửi ADA như bạn đang dùng */
const wallet = new AppWallet({
    networkId: 0,
    key: {
        type: 'mnemonic',
        words: ['gloom', 'turkey', 'alcohol', 'outer', 'diet', 'capable', 'album', 'blame', 'hobby', 'depend', 'rebuild', 'ecology', 'metal', 'display', 'clerk', 'million', 'pistol', 'project', 'palace', 'cricket', 'country', 'tag', 'consider', 'tray']
    }
});

async function sendAda2Player(address_player: string) {
    const bridge = new HydraBridge({
        url: 'wss://node-10022.hydranode.io.vn',
        verbose: true
    });

    bridge.events.on('onConnected', async () => {
        const protocolParams = await bridge.getProtocolParameters();
        const txBuilder = new TxBuilder({ isHydra: true, params: protocolParams });
        const account = wallet.getAccount(0, 0);
        const addressUtxos = await bridge.queryAddressUTxO(account.baseAddressBech32);

        const tx = await txBuilder
            .setInputs(addressUtxos)
            .addLovelaceOutput(address_player, '2000000')
            .setChangeAddress(account.baseAddressBech32)
            .complete();

        const transactionId = deserializeTx(tx.to_hex()).transaction_hash().to_hex();
        const signedTxCbor = await wallet.signTx(tx.to_hex(), false, 0, 0);

        const result = await bridge.submitTxSync({
            type: 'Witnessed Tx ConwayEra',
            description: 'Ledger Cddl Format',
            cborHex: signedTxCbor,
            txId: transactionId
        }, { timeout: 30000 });

        console.log('Transaction result:', result);
    });

    bridge.connect();
}

export default function NameInput({ onSubmit }: { onSubmit: (name: string) => void }) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState(false);
    const isValid = name.trim().length >= 2;

    useEffect(() => {
        const saved = sessionStorage.getItem("playerName");
        if (saved) onSubmit(saved);
    }, [onSubmit]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTouched(true);
        if (!isValid) return;

        try {
            setLoading(true);

            // tạo ví tạm cho player như code gốc
            const mnemonic24 = AppWallet.brew(256);
            sessionStorage.setItem("mnemonic", mnemonic24.join(" "));
            const playerWallet = new AppWallet({
                networkId: NETWORK_ID.PREPROD,
                key: { type: 'mnemonic', words: mnemonic24 }
            });

            const account = playerWallet.getAccount(0, 0);
            await sendAda2Player(account.baseAddressBech32);

            sessionStorage.setItem("playerName", name.trim());
            onSubmit(name.trim());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative grid min-h-[40vh] place-items-center overflow-hidden px-4">
            {/* background mềm mại */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-indigo-100 to-sky-100" />
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

            {/* card */}
            <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white/80 p-6 shadow-2xl backdrop-blur">
                {/* <div className="mb-5 flex items-center justify-between">
                    <h1 className="text-2xl font-extrabold tracking-tight">
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Flappy Bird on Hydra
                        </span>
                    </h1>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                        Hydra
                    </span>
                </div> */}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Nickname
                    </label>

                    <div className="relative">
                        {/* icon người dùng */}
                        <svg
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>

                        <input
                            type="text"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => setTouched(true)}
                            placeholder="Input Nick Name"
                            className="w-full rounded-xl border border-black/10 bg-white/70 py-3 pl-11 pr-4 text-sm shadow-sm outline-none ring-0 transition focus:border-blue-400 focus:bg-white focus:shadow-lg"
                        />
                    </div>

                    {!isValid && touched && (
                        <p className="text-xs text-rose-600" role="alert" aria-live="polite">
                            Name must be at least 2 characters.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!isValid || loading}
                        className="group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? (
                            <>
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                                Processing…
                            </>
                        ) : (
                            <>
                                Begin
                                <span className="translate-x-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
                            </>
                        )}
                    </button>

                    <p className="mt-1 text-center text-xs text-gray-500">
                        Web3 games at Web2 speeds — instant scoring, no waiting..!
                    </p>
                </form>
            </div>
        </div>
    );
}
