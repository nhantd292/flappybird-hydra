'use client';
import { useEffect, useRef, useState } from "react";

import { TxBuilder } from '@hydra-sdk/transaction'
import { AppWallet, deserializeTx } from '@hydra-sdk/core'
import { HydraBridge } from '@hydra-sdk/bridge'
import { CardanoWASM } from '@hydra-sdk/cardano-wasm'
import { datumFromHex } from "@/lib/datumProcess";

import AsyncQueue from "@/lib/queue";
const { PlutusDatumSchema } = CardanoWASM;
import { sendCardanoTx, type TxPayload } from '@/lib/sendCardanoTx';

const now = new Date();

type Pipe = { x: number; y: number; width: number; height: number; scored: boolean; image: HTMLImageElement };

export default function FlappyBird() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [highScore, setHighScore] = useState(0);
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

    function playSound(sound: HTMLAudioElement | null) {
        if (sound) {
            sound.currentTime = 0;
            sound.play();
        }
    }

    const words_mn: string[] = (sessionStorage.getItem("mnemonic") ?? "").split(" ");
    const wallet = new AppWallet({
        networkId: 0,
        key: {
            type: 'mnemonic',
            words: words_mn,
        }
    })

    async function processHydraTransactions(curent_point: Number) {
        const bridge = new HydraBridge({
            url: 'wss://node-10022.hydranode.io.vn',
            verbose: true
        })


        bridge.events.on('onConnected', async () => {
            // Get protocol parameters
            const protocolParams = await bridge.getProtocolParameters()

            // Create transaction builder for Hydra
            const txBuilder = new TxBuilder({
                isHydra: true,
                params: protocolParams
            })

            // Get UTxOs for address
            const account = wallet.getAccount(0, 0)
            const addressUtxos = await bridge.queryAddressUTxO(account.baseAddressBech32)
            let best_score = curent_point

            for (const utxo of addressUtxos) {
                const res = datumFromHex(utxo.output.inlineDatum?.to_hex())
                if (res && typeof res === "object") {
                    if (res.best_score !== undefined && res.best_score > best_score) {
                        best_score = res.best_score;
                    }
                }
            }

            const datum_json = {
                name: sessionStorage.getItem("playerName") || "Guest",
                best_score: best_score,
                score: curent_point,
                utc_time: now.toISOString()
            };
            const datum = CardanoWASM.encode_json_str_to_plutus_datum(
                JSON.stringify(datum_json),
                PlutusDatumSchema.BasicConversions
            )

            // Build transaction
            const tx = await txBuilder
                .setInputs(addressUtxos)
                .addLovelaceOutput(account.baseAddressBech32, '2000000')
                .setChangeAddress(account.baseAddressBech32)
                .txOutInlineDatumValue(datum)
                .complete()

            // Get transaction ID
            const txId = deserializeTx(tx.to_hex()).transaction_hash().to_hex()

            // Sign transaction
            const signedTx = await wallet.signTx(tx.to_hex(), false, 0, 0)

            const payload: TxPayload = {
                type: 'Witnessed Tx ConwayEra',
                cborHex: signedTx,
                description: 'Ledger Cddl Format',
                txId: txId,
            };
            // console.log('Transaction payload:', payload)
            // console.log('Transaction datum:', datum)
            const restx = await sendCardanoTx(payload);
            // console.log('restx:', restx)

            // Submit to Hydra Head 
            // const result = await bridge.submitTxSync({
            //     type: 'Witnessed Tx ConwayEra',
            //     description: 'Ledger Cddl Format',
            //     cborHex: signedTx, // txId 
            // }, { timeout: 30000 })
            // console.log('Transaction successful:', result)

        })

        bridge.connect()
    }

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
            if (loaded === 2) { // cả 2 ảnh đã load
                ctx.drawImage(bgImage.current, 0, 0, baseWidth, baseHeight);
                ctx.drawImage(birdImage.current, 50, 300, 34, 34); // vẽ chim ở vị trí chờ
                ctx.fillStyle = "white";
                ctx.font = "28px Arial";
                ctx.fillText("Click to begin", 100, baseHeight / 2);
            }
        }
        bgImage.current.onload = tryDraw;
        birdImage.current.onload = tryDraw;

        // High score
        const savedHigh = localStorage.getItem("highScore");
        if (savedHigh) setHighScore(Number(savedHigh));
    }, []);

    useEffect(() => {
        if (!isStarted) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const baseWidth = 400, baseHeight = 600;
        canvas.width = baseWidth;
        canvas.height = baseHeight;

        // ★ NEW: thêm angle để xoay, và một vài hằng số dùng cho xoay
        const bird = {
            x: 50, y: 300, width: 40, height: 34,
            gravity: 0.5, lift: -8, velocity: 0,
            angle: 0 // ★ NEW
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

                const headHeight = 30; // chiều cao đầu ống
                const bodyHeight = p.height - headHeight;

                if (isTop) {
                    // Ống trên (lật ngược)
                    ctx.save();
                    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
                    ctx.scale(1, -1);
                    // Vẽ đầu ống
                    ctx.drawImage(p.image, -p.width / 2, -p.height / 2, p.width, headHeight);
                    // Vẽ thân ống (dưới đầu)
                    ctx.drawImage(pipeBodyImg, -p.width / 2, -p.height / 2 + headHeight - 1, p.width, bodyHeight + 1);
                    ctx.restore();
                } else {
                    // Ống dưới
                    // Vẽ đầu ống
                    ctx.drawImage(p.image, p.x, p.y, p.width, headHeight);
                    // Vẽ thân ống
                    ctx.drawImage(pipeBodyImg, p.x, p.y + headHeight - 1, p.width, bodyHeight);
                }
            }

            // ★ NEW: Vẽ chim xoay quanh tâm theo góc bird.angle
            ctx.save();
            ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
            ctx.rotate(bird.angle);
            ctx.drawImage(
                birdImage.current,
                -bird.width / 2,
                -bird.height / 2,
                bird.width,
                bird.height
            );
            ctx.restore();

            // Vẽ điểm
            ctx.fillStyle = "white";
            ctx.font = "30px Arial";
            ctx.fillText(points.toString(), 20, 50);
        }

        function update() {
            // Vật lý cơ bản
            bird.velocity += bird.gravity;

            // ★ NEW: giới hạn velocity để góc không quá cực đoan
            const VMAX = 10; // tốc độ rơi tối đa (đơn vị "px/frame" tương đối)
            if (bird.velocity > VMAX) bird.velocity = VMAX;
            if (bird.velocity < -VMAX) bird.velocity = -VMAX;

            bird.y += bird.velocity;

            // ★ NEW: chuyển velocity -> góc mục tiêu
            const MAX_DOWN = Math.PI / 4;   // +45° khi rơi nhanh
            const MAX_UP = -Math.PI / 6;  // -30° khi bay lên
            const t = (bird.velocity + VMAX) / (2 * VMAX); // map [-VMAX..+VMAX] -> [0..1]
            const targetAngle = MAX_UP + (MAX_DOWN - MAX_UP) * t;

            // ★ NEW: làm mượt góc
            const SMOOTH = 0.15;
            bird.angle += (targetAngle - bird.angle) * SMOOTH;

            // Va chạm sàn/trần
            if (bird.y + bird.height > baseHeight || bird.y < 0) {
                playSound(hitSound.current);
                isGameOver = true;
            }

            // Di chuyển ống
            for (let p of pipes) p.x -= 3;
            if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.splice(0, 2);
            if (frame % 90 === 0) createPipe();

            // Va chạm ống
            for (let p of pipes) {
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

            // Ghi điểm (khi qua cặp ống)
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

                // Vẽ màn hình Game Over
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

        // Input
        window.addEventListener("keydown", flap);
        canvas.addEventListener("mousedown", flap, { passive: false });
        canvas.addEventListener("touchstart", (e) => { e.preventDefault(); flap(); }, { passive: false });

        loop();

        return () => {
            window.removeEventListener("keydown", flap);
            canvas.removeEventListener("mousedown", flap);
            canvas.removeEventListener("touchstart", flap as any);
        };
    }, [restartKey, isStarted]);

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
            ></canvas>
            {gameOver && (
                <>
                    <button
                        onClick={handleRestart}
                        className="mt-[-100px] px-6 py-3 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600"
                    >
                        Replay
                    </button>
                </>
            )}
        </div>
    );
}
