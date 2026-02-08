import { verifyAccessToken } from "./jwt";

export const authMiddleware = async (c: any, next: any) => {
    const auth = c.req.header("Authorization");

    if (!auth) {
        return c.json({
            message: "Unauthorized",
            success: false,
        }, 401);
    }

    const token = auth.replace("Bearer ", "");

    try {
        const payload = await verifyAccessToken(token);
        c.set("user", payload.payload);
        await next();
    } catch (error) {
        return c.json({
            message: "Token Expired",
            success: false,
        }, 402);
    }
}