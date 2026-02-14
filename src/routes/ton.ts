import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { Hono } from "hono";
import { generateUUID } from "../services/engineGeneration";
import { sql } from "../db/db";

export const tonRoute = new Hono();

tonRoute.post("/generate-ton-address", async (c: any) => {
    try {
        // 1. Get and validate request body
        let user_id;
        try {
            const body = await c.req.json();
            user_id = body.user_id;
        } catch (e) {
            return c.json({
                success: false,
                message: "Invalid JSON body!",
                data: null,
            }, 400);
        }

        if (!user_id) {
            return c.json({
                success: false,
                message: "Missing user_id!",
                data: null,
            }, 403);
        }

        // 2. Generate TON Wallet
        const mnemonic = await mnemonicNew();
        const keyPair = await mnemonicToPrivateKey(mnemonic);

        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });

        const walletAddress = wallet.address.toString();

        // 3. Atomic Database Operations (Transaction)
        const result = await sql.begin(async (tx: any) => {
            // Insert Wallet
            const [walletRow] = await tx`
                INSERT INTO wallets (id, user_id, address, status, mnemonic, private_key, public_key, blockchain, created_at)
                VALUES (${generateUUID()}, ${user_id}, ${walletAddress}, 'ACTIVE', ${mnemonic}, ${keyPair.secretKey.toString('hex')}, ${keyPair.publicKey.toString('hex')}, 'TON', NOW())
                RETURNING id
            `;

            if (!walletRow) {
                throw new Error("Failed to create wallet record.");
            }

            // Insert TON Asset
            await tx`
                INSERT INTO assets (id, wallet_id, symbol, token_address, blockchain, balance)
                VALUES (${generateUUID()}, ${walletRow.id}, 'TON', 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', 'TON', 0)
            `;

            // Insert USDT Asset (TON)
            await tx`
                INSERT INTO assets (id, wallet_id, symbol, token_address, blockchain, balance)
                VALUES (${generateUUID()}, ${walletRow.id}, 'USDT', 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', 'TON', 0)
            `;

            return { address: walletAddress };
        });

        return c.json({
            success: true,
            message: "TON Address Generated Successfully!",
            data: result
        }, 200);

    } catch (error: any) {
        // Log the full error to the console for debugging
        console.error("[TON_GEN_ADDRESS_ERROR]:", error);

        return c.json({
            success: false,
            message: "Failed To Generate TON Address!",
            error: error.message,
            data: null,
        }, 400);
    }
});


tonRoute.post("/send-ton", async (c: any) => {
    const { user_id, amount, receiver, symbol } = await c.req.json();

    if (!user_id || !amount || !receiver) {
        return c.json({
            success: false,
            message: "Missing required fields!",
            data: null,
        }, 403);
    }

    try {
        const [wallet] = await sql`SELECT * FROM wallets WHERE user_id = ${user_id} LIMIT 1`;

        if (!wallet) {
            return c.json({
                success: false,
                message: "Wallet not found!",
                data: null,
            }, 400);
        }

        const [asset] = await sql`SELECT * FROM assets WHERE wallet_id = ${wallet.id} AND symbol = ${symbol}`;

        if (!asset) {
            return c.json({
                success: false,
                message: "Asset not found!",
                data: null,
            }, 400);
        }

        if (asset.balance < amount) {
            return c.json({
                success: false,
                message: "Insufficient balance!",
                data: null,
            }, 400);
        }



    } catch (error: any) {

    }
})
