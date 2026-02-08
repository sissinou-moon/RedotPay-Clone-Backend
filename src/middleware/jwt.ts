import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export const signAccessToken = (payload: any) => {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);
}

export const signRefreshToken = (payload: any) => {
    return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret);
}

export const verifyAccessToken = (token: string) => {
    return jwtVerify(token, secret);
}
