
import { CardanoWASM } from '@hydra-sdk/cardano-wasm'

export function datumFromHex(inlineDatumHex?: string) {
    if (!inlineDatumHex) return undefined;

    try {
        const plutusData = CardanoWASM.PlutusData.from_hex(inlineDatumHex);
        const jsonStr = plutusData.to_json(CardanoWASM.PlutusDatumSchema.BasicConversions);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("datumFromHex error:", e);
        return undefined;
    }
};