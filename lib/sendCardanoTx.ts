// lib/sendCardanoTx.ts
export type TxPayload = {
    type: 'Witnessed Tx ConwayEra';
    cborHex: string;
    description: string;
    txId: string;
};

const DEFAULT_URL =
    process.env.NEXT_PUBLIC_HYDRA_API_BASE_URL ??
    'https://game-flappybird-api.hydrawallet.app/hydra/submit-tx';

export async function sendCardanoTx(
    payload: TxPayload,
    url: string = DEFAULT_URL
): Promise<unknown> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            accept: '*/*',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
        throw new Error(`POST failed ${res.status} ${res.statusText}: ${text}`);
    }
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
