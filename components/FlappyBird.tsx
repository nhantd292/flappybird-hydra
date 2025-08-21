'use client';
import { useCallback, useEffect, useRef, useState } from "react";

import { TxBuilder } from '@hydra-sdk/transaction'
import { AppWallet, deserializeTx } from '@hydra-sdk/core'
import { HydraBridge } from '@hydra-sdk/bridge'
import { CardanoWASM } from '@hydra-sdk/cardano-wasm'
import { datumFromHex } from "@/lib/datumProcess";

import AsyncQueue from "@/lib/queue";
const { PlutusDatumSchema } = CardanoWASM;
import { sendCardanoTx, type TxPayload } from '@/lib/sendCardanoTx';

type Pipe = { x: number; y: number; width: number; height: number; scored: boolean; image: HTMLImageElement };

export default function FlappyBird() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameOver, setGameOver] = useState(false);
    const [restartKey, setRestartKey] = useState(0);
    const [isStarted, setIsStarted] = useState(false);

    const flapSound = useRef<HTMLAudioElement | null>(null);
    const pointSound = useRef<HTMLAudioElement | null>(null);
    const hitSound = useRef<HTMLAudioElement | null>(null);

    const queueRef = useRef(new AsyncQueue());

    // Load ảnh
    const bgImage = useRef<HTMLImageElement>(new Image());
    const birdImage = useRef<HTMLImageElement>(new Image());

    // Wallet giữ ổn định qua các render
    const walletRef = useRef<AppWallet | null>(null);
    if (!walletRef.current) {
        const words_mn: string[] = (sessionStorage.getItem("mnemonic") ?? "").split(" ");
        walletRef.current = new AppWallet({
            networkId: 0,
            key: { type: 'mnemonic', words: words_mn },
        });
    }

    function playSound(sound: HTMLAudioElement | null) {
        if (sound) {
            sound.currentTime = 0;
            sound.play();
        }
    }

    // ✅ dùng number (primitive) + useCallback để ổn định deps
    const processHydraTransactions = useCallback(async (curent_point: number) => {
        const wallet = walletRef.current!;
        const bridge = new HydraBridge({
            url: 'wss://node-10022.hydranode.io.vn',
            verbose: true
        });

        bridge.events.on('onConnected', async () => {
            // Get protocol parameters
            const protocolParams = await bridge.getProtocolParameters();

            // Create transaction builder for Hydra
            const txBuilder = new TxBuilder({
                isHydra: true,
                params: protocolParams
            });

            // Get UTxOs for address
            const account = wallet.getAccount(0, 0);
            const addressUtxos = await bridge.queryAddressUTxO(account.baseAddressBech32);

            let best_score = curent_point;
            for (const utxo of addressUtxos) {
                const decoded = datumFromHex(utxo.output.inlineDatum?.to_hex()) as { best_score?: unknown } | undefined;
                const bs = decoded?.best_score;
                if (typeof bs === 'number' && bs > best_score) {
                    best_score = bs;
                }
            }

            const now = new Date();
            const datum_json = {
                name: sessionStorage.getItem("playerName") || "Guest",
                best_score: best_score,
                score: curent_point,
                utc_time: now.toISOString()
            };
            const datum = CardanoWASM.encode_json_str_to_plutus_datum(
                JSON.stringify(datum_json),
                PlutusDatumSchema.BasicConversions
            );

            // Build transaction
            const tx = await txBuilder
                .setInputs(addressUtxos)
                .addLovelaceOutput(account.baseAddressBech32, '2000000')
                .setChangeAddress(account.baseAddressBech32)
                .txOutInlineDatumValue(datum)
                .complete();

            // Get transaction ID
            const txId = deserializeTx(tx.to_hex()).transaction_hash().to_hex();

            // Sign transaction
            const signedTx = await wallet.signTx(tx.to_hex(), false, 0, 0);

            const payload: TxPayload = {
                type: 'Witnessed Tx ConwayEra',
                cborHex: signedTx,
                description: 'Ledger Cddl Format',
                txId: txId,
            };

            await sendCardanoTx(payload);

            // Nếu muốn submit vào Hydra Head, bật đoạn dưới:
            // await bridge.submitTxSync(
            //   { type: 'Witnessed Tx ConwayEra', description: 'Ledger Cddl Format', cborHex: signedTx },
            //   { timeout: 30000 }
            // );
        });

        bridge.connect();
    }, []);

    useEffect(() => {
        flapSound.current = new Audio("/sounds/flap.wav");
        pointSound.current = new Audio("/sounds/point.wav");
        hitSound.current = new Audio("/sounds/hit.wav");

        const baseWidth = 400, baseHeight = 600;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.width = baseWidth;
        canvas.height = baseHeight;

        // Load ảnh nền + chim
        bgImage.current.src = "/images/background.png";
        birdImage.current.src = "/images/bird.png";

        // Khi cả 2 ảnh load xong, vẽ màn hình chờ
        let loaded = 0;
        function tryDraw() {
            loaded++;
            if (loaded === 2) {
                ctx.drawImage(bgImage.current, 0, 0, baseWidth, baseHeight);
                ctx.drawImage(birdImage.current, 50, 300, 34, 34);
                ctx.fillStyle = "white";
                ctx.font = "28px Arial";
                ctx.fillText("Click to begin", 100, baseHeight / 2);
            }
        }
        bgImage.current.onload = tryDraw;
        birdImage.current.onload = tryDraw;
    }, []);

    useEffect(() => {
        if (!isStarted) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const baseWidth = 400, baseHeight = 600;
        canvas.width = baseWidth;
        canvas.height = baseHeight;

        const bird = {
            x: 50, y: 300, width: 40, height: 34,
            gravity: 0.5, lift: -8, velocity: 0,
            angle: 0
        };
        const pipes: Pipe[] = [];
        const pipeWidth = 70;
        const gap = 135;
        let frame = 0;
        let points = 0;
        let isGameOver = false;

        const pipeImages = [
            "/images/pipes/pipe_head.png"
        ].map(src => {
            const img = new Image();
            img.src = src;
            return img;
        });

        function createPipe() {
            const top = Math.random() * (baseHeight - gap - 100) + 50;
            const img = pipeImages[0];
            pipes.push({ x: baseWidth, y: 0, width: pipeWidth, height: top, scored: false, image: img });
            pipes.push({ x: baseWidth, y: top + gap, width: pipeWidth, height: baseHeight - (top + gap), scored: false, image: img });
        }

        const pipeBodyImg = new Image();
        pipeBodyImg.src = "/images/pipes/pipe_body.png";

        function draw() {
            // Vẽ nền
            ctx.drawImage(bgImage.current, 0, 0, baseWidth, baseHeight);

            // Vẽ ống
            for (let i = 0; i < pipes.length; i++) {
                const p = pipes[i];
                const isTop = i % 2 === 0;

                const headHeight = 30;
                const bodyHeight = p.height - headHeight;

                if (isTop) {
                    ctx.save();
                    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
                    ctx.scale(1, -1);
                    ctx.drawImage(p.image, -p.width / 2, -p.height / 2, p.width, headHeight);
                    ctx.drawImage(pipeBodyImg, -p.width / 2, -p.height / 2 + headHeight - 1, p.width, bodyHeight + 1);
                    ctx.restore();
                } else {
                    ctx.drawImage(p.image, p.x, p.y, p.width, headHeight);
                    ctx.drawImage(pipeBodyImg, p.x, p.y + headHeight - 1, p.width, bodyHeight);
                }
            }

            // Vẽ chim có xoay
            ctx.save();
            ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
            ctx.rotate(bird.angle);
            ctx.drawImage(birdImage.current, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
            ctx.restore();

            // Điểm
            ctx.fillStyle = "white";
            ctx.font = "30px Arial";
            ctx.fillText(points.toString(), 20, 50);
        }

        function update() {
            bird.velocity += bird.gravity;

            const VMAX = 10;
            if (bird.velocity > VMAX) bird.velocity = VMAX;
            if (bird.velocity < -VMAX) bird.velocity = -VMAX;

            bird.y += bird.velocity;

            const MAX_DOWN = Math.PI / 4;
            const MAX_UP = -Math.PI / 6;
            const t = (bird.velocity + VMAX) / (2 * VMAX);
            const targetAngle = MAX_UP + (MAX_DOWN - MAX_UP) * t;

            const SMOOTH = 0.15;
            bird.angle += (targetAngle - bird.angle) * SMOOTH;

            if (bird.y + bird.height > baseHeight || bird.y < 0) {
                playSound(hitSound.current);
                isGameOver = true;
            }

            for (const p of pipes) p.x -= 3;
            if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.splice(0, 2);
            if (frame % 90 === 0) createPipe();

            for (const p of pipes) {
                if (
                    bird.x < p.x + p.width &&
                    bird.x + bird.width > p.x &&
                    bird.y < p.y + p.height &&
                    bird.y + bird.height > p.y
                ) {
                    playSound(hitSound.current);
                    isGameOver = true;
                }
            }

            // Ghi điểm
            for (let i = 0; i < pipes.length; i += 2) {
                const pipe = pipes[i];
                if (!pipe.scored && pipe.x + pipe.width < bird.x) {
                    points++;
                    pipe.scored = true;
                    playSound(pointSound.current);
                    queueRef.current.enqueue(async () => {
                        await processHydraTransactions(points);
                    });
                }
            }
            frame++;
        }

        function loop() {
            if (isGameOver) {
                setGameOver(true);
                ctx.fillStyle = "red";
                ctx.font = "40px Arial";
                ctx.fillText("Game Over", 100, baseHeight / 2);
                return;
            }
            update();
            draw();
            requestAnimationFrame(loop);
        }

        function flap() {
            bird.velocity = Math.max(bird.lift, -10);
            playSound(flapSound.current);
        }

        // Handlers có reference cố định để remove được, không cần any
        const onKeyDown = (_e: KeyboardEvent) => flap();
        const onMouseDown = (_e: MouseEvent) => flap();
        const onTouchStart = (e: TouchEvent) => { e.preventDefault(); flap(); };

        window.addEventListener("keydown", onKeyDown);
        canvas.addEventListener("mousedown", onMouseDown, { passive: false });
        canvas.addEventListener("touchstart", onTouchStart, { passive: false });

        loop();

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            canvas.removeEventListener("mousedown", onMouseDown);
            canvas.removeEventListener("touchstart", onTouchStart);
        };
    }, [restartKey, isStarted, processHydraTransactions]); // ✅ thêm processHydraTransactions

    function handleRestart() {
        setGameOver(false);
        setIsStarted(false);
        setRestartKey(prev => prev + 1);
    }

    return (
        <div className="flex flex-col items-center">
            <canvas
                ref={canvasRef}
                className="border-2 border-black w-full max-w-[400px] h-auto"
                onClick={() => !isStarted && setIsStarted(true)}
            />
            {gameOver && (
                <button
                    onClick={handleRestart}
                    className="mt-[-100px] px-6 py-3 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600"
                >
                    Replay
                </button>
            )}
        </div>
    );
}
