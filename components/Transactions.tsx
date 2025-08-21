'use client';

import { useEffect, useRef, useState } from "react";
import { HydraBridge } from '@hydra-sdk/bridge';
import TPSGauge from '@/components/TPSGauge';

type TxItem = { id: string; ts: number; isNew: boolean };

export default function Transactions() {
    const [txList, setTxList] = useState<TxItem[]>([]);
    const bridgeRef = useRef<HydraBridge | null>(null);
    const [tps, setTps] = useState(0);
    const txCounterRef = useRef(0);

    // --- Lấy 20 tx mới nhất khi load trang ---
    async function fetchLatestTxs(signal?: AbortSignal) {
        try {
            const sort = encodeURIComponent(JSON.stringify([{ orderBy: "timestamp", orderType: "desc" }]));
            const url = `https://game-flappybird-api.hydrawallet.app/explorer/transactions?page=1&limit=10&sort=${sort}`;

            const res = await fetch(url, { headers: { accept: "application/json" }, signal });
            if (!res.ok) {
                console.error("Fetch transactions failed:", res.status, res.statusText);
                return;
            }

            const json = await res.json();
            const items: any[] = json?.data?.items ?? [];

            const ids = items
                .map(it => it?.txId)
                .filter((id: any): id is string => typeof id === "string");

            const now = Date.now();
            const newItems = ids.map(id => ({ id, ts: now, isNew: false })); // API → isNew = false

            setTxList(newItems.slice(0, 10)); // giữ đúng 20 tx mới nhất
        } catch (e: any) {
            if (e?.name !== 'AbortError') console.error("Fetch transactions error:", e);
        }
    }

    // --- Hydra realtime ---
    async function manageHydraHead() {
        const bridge = new HydraBridge({
            url: 'wss://node-10022.hydranode.io.vn',
            verbose: true
        });
        bridgeRef.current = bridge;

        bridge.events.on('onConnected', async () => {
            console.log('Connected! Initializing Head...');
            bridge.commands.init();
        });

        bridge.events.on('onMessage', (payload: any) => {
            switch (payload.tag) {
                case 'HeadIsInitializing':
                    console.log('Head initializing...');
                    break;
                case 'HeadIsOpen':
                    console.log('Head is open and ready!');
                    break;
                case 'TxValid': {
                    const txId = payload.transactionId as string;
                    if (!txId) return;
                    console.log('Transaction confirmed:', txId);

                    txCounterRef.current += 1;

                    setTxList(prev => {
                        if (prev.find(tx => tx.id === txId)) return prev; // tránh trùng
                        const now = Date.now();
                        const newTx = { id: txId, ts: now, isNew: true };
                        return [newTx, ...prev].slice(0, 10); // giữ tối đa 20
                    });
                    break;
                }
            }
        });

        bridge.connect();
    }

    useEffect(() => {
        // reset và cập nhật TPS mỗi giây
        const interval = setInterval(() => {
            setTps(txCounterRef.current / 2);
            txCounterRef.current = 0;
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Trigger re-render mỗi giây để cập nhật fade effect
    useEffect(() => {
        const interval = setInterval(() => {
            setTxList(prev => [...prev]);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Khởi tạo
    useEffect(() => {
        const ac = new AbortController();

        fetchLatestTxs(ac.signal);
        manageHydraHead();

        return () => {
            ac.abort();
            try {
                const b: any = bridgeRef.current;
                b?.events?.removeAllListeners?.();
                b?.disconnect?.();
            } catch { /* noop */ }
            bridgeRef.current = null;
        };
    }, []);

    return (
        <div className="space-y-4">

            <div>

                <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="font-semibold mb-2">TPS</h2>
                    <TPSGauge tps={tps} maxTPS={50} />
                </div>
            </div>
            <div className="mb-2">
                <h2 className="font-semibold mb-2">Realtime transactions</h2>
                {txList.length === 0 ? (
                    <p className="text-sm text-gray-500">list empty.</p>
                ) : (
                    <ul className="space-y-1">
                        {txList.map(({ id, ts, isNew }, index) => {
                            const shortId = `${id.slice(0, 6)}...${id.slice(-6)}`;

                            let backgroundColor = 'transparent';
                            if (isNew) {
                                const elapsed = (Date.now() - ts) / 500; // 0 → 1 trong 8s
                                const clamped = Math.min(1, Math.max(0, elapsed));
                                const bgOpacity = 0.8 * (1 - clamped); // 0.8 → 0
                                backgroundColor = `rgba(34, 197, 94, ${bgOpacity.toFixed(2)})`;
                            }

                            return (
                                <li
                                    key={`${id}_${index}`}
                                    className="flex items-center justify-between rounded p-1 text-sm transition-all duration-500"
                                    style={{ backgroundColor }}
                                >
                                    <code>{shortId}</code>
                                    <a
                                        href={`https://explorer.hydrawallet.app/flappy/transactions/${id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        👁
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
