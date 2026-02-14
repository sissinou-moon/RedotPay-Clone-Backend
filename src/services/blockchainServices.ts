import { mnemonicToPrivateKey } from "@ton/crypto";
import { internal, TonClient, WalletContractV4, beginCell, toNano, Address } from "@ton/ton";

const client = new TonClient({
    endpoint: "https://testnet.tonhub.com/api/v2",
    apiKey: '8ca8cb418abf8387ea965e5a338aa2f3b13ae5a548e82e5ae244cd842cf592d1' // Get one from @tonapibot on Telegram
});

async function sendTon(mnemonic: string[], toAddress: string, amount: string) {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);

    // Get current seqno to prevent replay attacks
    const seqno = await contract.getSeqno();

    await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: toAddress,
                value: amount, // e.g., "0.05"
                bounce: false,
                body: "Hello from Hono!", // Optional comment
            })
        ]
    });
}

async function sendJeton(mnemonic: string[], toAddress: string, amount: number, jetonAddress: string) {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);

    const USDT_MASTER = Address.parse(jetonAddress);

    // 1. Find YOUR specific USDT wallet address
    // In TON, every user has a unique wallet for every Jetton
    const userUsdtAddress = await client.callGetMethod(USDT_MASTER, 'get_wallet_address', [
        { type: 'slice', cell: beginCell().storeAddress(wallet.address).endCell() }
    ]);
    const myUsdtWalletAddress = userUsdtAddress.stack.readAddress();

    // 2. Construct the Jetton Transfer body
    const body = beginCell()
        .storeUint(0xf8a7ea5, 32) // Opcode for Jetton transfer
        .storeUint(0, 64)          // Query ID
        .storeCoins(amount * 10 ** 6) // USDT has 6 decimals, not 9!
        .storeAddress(Address.parse(toAddress)) // Recipient
        .storeAddress(wallet.address)            // Response address (for excess gas)
        .storeBit(0)               // Custom payload
        .storeCoins(toNano("0.02")) // Forward TON amount (notified to recipient)
        .storeBit(0)               // Forward payload
        .endCell();

    // 3. Send the message to your USDT wallet
    const seqno = await contract.getSeqno();
    await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: myUsdtWalletAddress,
                value: toNano("0.05"), // Gas for the transaction
                bounce: true,
                body: body,
            })
        ]
    });
}