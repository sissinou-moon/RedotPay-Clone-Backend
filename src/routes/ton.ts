import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";
import { Hono } from "hono";

export const tonRoute = new Hono();

tonRoute.get("/generate-ton-address", async (c: any) => {
    const mnemonic = await mnemonicNew();
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    try {
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });

        return c.json({
            success: true,
            message: "TON Address Generated Successfully!",
            data: {
                mnemonic: mnemonic.join(''),
                private_key: keyPair.secretKey.toString('hex'),
                public_key: keyPair.publicKey.toString('hex'),
                address: wallet.address.toString({
                    bounceable: false,
                    testOnly: true,
                }),
            }
        }, 200);
    } catch (error) {
        return c.json({
            success: false,
            message: "Failed To Generate TON Address!",
            data: null,
        }, 500);
    }
})
