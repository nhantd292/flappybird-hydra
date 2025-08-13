'use client';
import { useEffect, useRef, useState } from "react";

import { TxBuilder } from '@hydrawallet-sdk/transaction'
import { AppWallet, NETWORK_ID, deserializeTx } from '@hydrawallet-sdk/core'
import { HydraBridge } from '@hydrawallet-sdk/bridge'
import { CardanoWASM } from '@hydrawallet-sdk/cardano-wasm'
import { time } from "console";
const { PlutusData, PlutusDatumSchema } = CardanoWASM;

type Pipe = { x: number; y: number; width: number; height: number; scored: boolean; image: HTMLImageElement };

export default function FlappyBird() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [finalScore, setFinalScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [restartKey, setRestartKey] = useState(0);
    const [isStarted, setIsStarted] = useState(false);

    const flapSound = useRef<HTMLAudioElement | null>(null);
    const pointSound = useRef<HTMLAudioElement | null>(null);
    const hitSound = useRef<HTMLAudioElement | null>(null);

    // Load ảnh
    const bgImage = useRef<HTMLImageElement>(new Image());
    const birdImage = useRef<HTMLImageElement>(new Image());

    function playSound(sound: HTMLAudioElement | null) {
        if (sound) {
            sound.currentTime = 0;
            sound.play();
        }
    }
    const payload = { name: "nhantd", score: finalScore, ts: Date.now() };
    const datum = CardanoWASM.encode_json_str_to_plutus_datum(
        JSON.stringify(payload),
        PlutusDatumSchema.BasicConversions
    )
    // console.log("datum", datum)
    // console.log("datum 2", CardanoWASM.decode_plutus_datum_to_json_str(datum, PlutusDatumSchema.BasicConversions))

    async function manageHydraHead() {
        const bridge = new HydraBridge({
            url: 'wss://node-10022.hydranode.io.vn',
            verbose: true
        })

        // Set up event handlers
        bridge.events.on('onConnected', async () => {
            console.log('Connected! Initializing Head...')
            bridge.commands.init()
        })

        bridge.events.on('onMessage', (payload) => {
            switch (payload.tag) {
                case 'HeadIsInitializing':
                    console.log('Head initializing...')
                    break
                case 'HeadIsOpen':
                    console.log('Head is open and ready!')
                    break
                case 'TxValid':
                    console.log('Transaction confirmed:', payload.transactionId)
                    break
            }
        })

        // Connect to start the process
        bridge.connect()
    }


    async function processHydraTransactions() {
        const bridge = new HydraBridge({
            url: 'wss://node-10022.hydranode.io.vn',
            verbose: true
        })

        const wallet = new AppWallet({
            networkId: 0,
            key: {
                type: 'mnemonic',
                words: ['gloom', 'turkey', 'alcohol', 'outer', 'diet', 'capable', 'album', 'blame', 'hobby', 'depend', 'rebuild', 'ecology', 'metal', 'display', 'clerk', 'million', 'pistol', 'project', 'palace', 'cricket', 'country', 'tag', 'consider', 'tray'] // 12, 15, or 24 words
            }
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


            // console.log('Transaction:', {
            //     type: 'Witnessed Tx ConwayEra',
            //     description: 'Ledger Cddl Format',
            //     cborHex: signedTx,
            //     txId
            // })

            // Submit to Hydra Head
            const result = await bridge.submitTxSync({
                type: 'Witnessed Tx ConwayEra',
                description: 'Ledger Cddl Format',
                cborHex: signedTx,
                txId
            }, { timeout: 30000 })

            console.log('Transaction successful:', result)
        })

        bridge.connect()
    }


    async function submitScore(finalScore: number) {
        const name = sessionStorage.getItem("playerName") || "Guest"; // Lấy tên người chơi đã nhập
        await fetch("/api/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, score: finalScore }),
        });
    }

    useEffect(() => {
        if (!gameOver) return;

        (async () => {
            try {
                await processHydraTransactions();
            } catch (e) {
                console.error("Submit to Hydra failed:", e);
            }
        })();
    }, [gameOver, finalScore]);


    useEffect(() => {

        manageHydraHead()
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

        const bird = { x: 50, y: 300, width: 34, height: 34, gravity: 0.5, lift: -8, velocity: 0 };
        const pipes: Pipe[] = [];
        const pipeWidth = 70;
        const gap = 150;
        let frame = 0;
        let points = 0;
        let isGameOver = false;

        const pipeImages = [
            "/images/pipes/pipe_head_btc.png",
            "/images/pipes/pipe_head_eth.png",
            "/images/pipes/pipe_head_bnb.png",
            "/images/pipes/pipe_head_txr.png",
            "/images/pipes/pipe_head_xrp.png",
            "/images/pipes/pipe_head_sol.png"
        ].map(src => {
            const img = new Image();
            img.src = src;
            return img;
        });

        function createPipe() {
            const top = Math.random() * (baseHeight - gap - 100) + 50;
            const img = pipeImages[Math.floor(Math.random() * pipeImages.length)];
            pipes.push({ x: baseWidth, y: 0, width: pipeWidth, height: top, scored: false, image: img });
            pipes.push({ x: baseWidth, y: top + gap, width: pipeWidth, height: baseHeight - (top + gap), scored: false, image: img });
        }

        // const pipeHeadImg = new Image();
        const pipeBodyImg = new Image();
        pipeBodyImg.src = "/images/pipes/pipe_body.png";

        function draw() {
            // Vẽ nền
            ctx.drawImage(bgImage.current, 0, 0, baseWidth, baseHeight);

            // Vẽ ống
            for (let i = 0; i < pipes.length; i++) {
                const p = pipes[i];
                const isTop = i % 2 === 0;

                const headHeight = 80; // chiều cao đầu ống
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

            // Vẽ chim
            ctx.drawImage(birdImage.current, bird.x, bird.y, bird.width, bird.height);

            // Vẽ điểm
            ctx.fillStyle = "white";
            ctx.font = "30px Arial";
            ctx.fillText(points.toString(), 20, 50);
        }

        function update() {
            bird.velocity += bird.gravity;
            bird.y += bird.velocity;
            if (bird.y + bird.height > baseHeight || bird.y < 0) {
                playSound(hitSound.current);
                isGameOver = true;
            }

            for (let p of pipes) p.x -= 3;
            if (pipes.length && pipes[0].x + pipeWidth < 0) pipes.splice(0, 2);
            if (frame % 90 === 0) createPipe();

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

            for (let i = 0; i < pipes.length; i += 2) {
                const pipe = pipes[i];
                if (!pipe.scored && pipe.x + pipe.width < bird.x) {
                    points++;
                    pipe.scored = true;
                    setScore(points);
                    playSound(pointSound.current);
                }
            }
            frame++;
        }

        function loop() {
            if (isGameOver) {
                setGameOver(true);
                setFinalScore(points);

                // Gửi điểm lên server
                submitScore(points);

                if (points > highScore) {
                    localStorage.setItem("highScore", points.toString());
                    setHighScore(points);
                }
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
            bird.velocity = bird.lift;
            playSound(flapSound.current);
        }

        window.addEventListener("keydown", flap);
        canvas.addEventListener("mousedown", flap);
        canvas.addEventListener("touchstart", flap);
        loop();

        return () => {
            window.removeEventListener("keydown", flap);
            canvas.removeEventListener("mousedown", flap);
            canvas.removeEventListener("touchstart", flap);
        };
    }, [restartKey, isStarted]);

    function handleRestart() {
        setScore(0);
        setFinalScore(0);
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
            {/* <p className="mt-2 text-lg font-semibold">Điểm cao nhất: {highScore}</p> */}
            {/* {isStarted && !gameOver && <p className="mt-2 text-xl font-bold">Điểm hiện tại: {score}</p>} */}
            {gameOver && (
                <>
                    {/* <p className="mt-2 text-2xl font-bold text-red-600">Game Over – Điểm của bạn: {finalScore}</p> */}
                    <button
                        onClick={handleRestart}
                        className="mt-4 px-6 py-3 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600"
                    >
                        Replay
                    </button>
                </>
            )}
        </div>
    );
}
