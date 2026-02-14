import { Hono } from "hono";
import { sql } from "../db/db";
import { signAccessToken, signRefreshToken, verifyAccessToken } from "../middleware/jwt";
import { sendOTP } from "../services/messageServices";
import { generateOTP, generateUsername, generateUUID, hashText } from "../services/engineGeneration";

export const auth = new Hono();

auth.post("/sign-up", async (c: any) => {
    const { email, password, device_name, user_agent, os, ip, type } = c.req.json();

    if (!email || !password) {
        return c.json({ message: "Missing Data" }, 403);
    }

    const [user] = await sql`
        SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;

    if (user) {
        return c.json({ message: "User Already Exists" }, 406);
    }

    try {
        const hashedPassword = hashText(password);
        const username = generateUsername();

        const insertUserRow = await sql`
        INSERT INTO users (id, email, password, username, status, created_at)
        VALUES (${generateUUID()}, ${email}, ${hashedPassword}, ${username}, 'ACTIVE', NOW())
        RETURNING *
    `;

        const refreshToken = await signRefreshToken({ user_id: insertUserRow[0].id });
        const accessToken = await signAccessToken({ user_id: insertUserRow[0].id })

        const insertSessionRow = await sql`
        INSERT INTO sessions (id, user_id, refresh_token, status, expires_at, created_at)
        VALUES (${generateUUID()}, ${insertUserRow[0].id}, ${refreshToken}, 'ACTIVE', NOW() + INTERVAL '7 days', NOW())
    `;

        if (device_name && user_agent && os && ip && type) {
            const insertDeviceRow = await sql`
            INSERT INTO devices (id, user_id, device_name, user_agent, os, ip, type, status, created_at)
            VALUES (${generateUUID()}, ${insertUserRow[0].id}, ${device_name}, ${user_agent}, ${os}, ${ip}, ${type}, 'ACTIVE', NOW())
        `;
        }

        return c.json({
            success: true,
            message: "User Created Successfully!",
            data: {
                refresh_token: refreshToken,
                access_token: accessToken,
                user: insertUserRow,
            }
        }, 200)
    } catch (error) {
        return c.json({
            success: false,
            message: "Something Went Wrong!",
            data: null,
        }, 400)
    }
});

auth.post("/sign-in", async (c: any) => {
    const { email, password } = c.req.json();

    const [user] = await sql`
        SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;

    if (!user) {
        return c.json({ message: "User not found" }, 404);
    }

    if (user.password !== password) {
        return c.json({ message: "Invalid password" }, 405);
    }

    const [session] = await sql`
        SELECT * FROM sessions WHERE user_id = ${user.id} AND status = ACTIVE AND expires_at > NOW() LIMIT 1
    `;

    if (session) {
        const [device] = await sql`
            SELECT * FROM devices WHERE user_id = ${user.id} AND id = ${session.device_id} LIMIT 1
        `;

        if (device && device.trusted) {
            const accessToken = signAccessToken({ userId: user.id });

            return c.json({
                success: true,
                message: "Welcome Back!",
                data: {
                    refresh_token: session.refresh_token,
                    access_token: accessToken,
                    user
                }
            }, 200);
        } else {
            return c.json({
                success: false,
                message: "Device Not Trusted",
                data: {
                    refresh_token: session.refresh_token,
                    user,
                }
            }, 420);
        }
    } else {
        return c.json({
            success: false,
            message: "No Active Session",
            data: {
                user,
            }
        }, 421);
    }
})

auth.post("/send-otp", async (c: any) => {

    const { email, user_id } = c.req.json();

    if (!email || !user_id) {
        return c.json(
            {
                success: false,
                message: "Missing Data!",
                data: null,
            },
            403
        )
    }

    const id = generateUUID();
    const otp = generateOTP();
    const hashedOTP = hashText(otp);

    try {
        await sql`
      DELETE FROM otp 
      WHERE user_id = ${user_id}
    `;

        const insertOTPRow = await sql`
        INSERT INTO otp (id, otp, user_id, verified, expires_at, created_at) 
        VALUES (${id}, ${hashedOTP}, ${user_id}, false, NOW() + INTERVAL '15 minutes', NOW())
    `
        await sendOTP("OTP Verification", otp);
    } catch (error) {
        return c.json({
            success: false,
            message: "Faild To Send OTP!"
        }, 400)
    }

    return c.json({
        success: true,
        message: "OTP Has Been Sent Successfully!",
        data: {
            otp_id: id,
            email: email,
            user_id: user_id,
        }
    }, 200);
})

auth.post("/verify-otp", async (c: any) => {
    const { email, user_id, otp } = c.json();

    if (!email || !user_id || !otp) {
        return c.json(
            {
                success: false,
                message: "Missing Data!",
                data: null,
            },
            403
        )
    }

    const [otpRow] = await sql`
      SELECT * FROM otp WHERE user_id = ${user_id} LIMIT 1
    `;

    const newOTPHashed = hashText(otp);

    if (otpRow.expires_at < Date.now()) {
        return c.json({
            success: false,
            message: "OTP Expired!",
            data: null,
        }, 400);
    } else if (otpRow.otp === newOTPHashed) {
        return c.json({
            success: true,
            message: "OTP Verified Successfully!",
            data: {
                user_id: user_id,
                email: email,
            }
        }, 200)
    } else {
        return c.json({
            success: false,
            message: "Faild To Verify OTP!",
            data: null,
        }, 400);
    }
})

auth.post("/session-device", async (c: any) => {
    const { email, device_name, user_agent, os, user_id, ip, type } = await c.json();

    if (!email || !user_id || !device_name || !os || !ip) {
        return c.json(
            {
                success: false,
                message: "Missing Data!",
                data: null,
            },
            403
        )
    }

    const [device] = await sql`
      SELECT * FROM devices
      WHERE user_id = ${user_id}
        AND device_name = ${device_name}
        AND user_agent = ${user_agent}
        AND os = ${os}
      LIMIT 1
    `;

    const [user] = await sql`
      SELECT * FROM users
      WHERE user_id = ${user_id}
      LIMIT 1
    `;

    if (device) {
        if (device.trusted) {
            const refresh_token = await signRefreshToken({ user_id });
            const access_token = await signAccessToken({ user_id });
            const sessionID = generateUUID();

            await sql`
              UPDATE sessions
              SET status = REVOKED
              WHERE user_id = ${user_id}
            `;

            await sql`
                INSERT INTO sessions (id, ip, device_id, refresh_token, status, last_seen, expires_at, created_at)
                VALUES (${sessionID}, ${ip}, ${device.device_id}, ${refresh_token}, ACTIVE, NOW(), NOW() + INTERVAL '7 days', NOW())
            `;

            return c.json({
                success: true,
                message: "Welcome Back!",
                data: {
                    refresh_token,
                    access_token,
                    user,
                }
            }, 200);
        } else {
            const refresh_token = await signRefreshToken({ user_id });
            const access_token = await signAccessToken({ user_id });
            const sessionID = generateUUID();

            await sql`
              UPDATE sessions
              SET status = REVOKED
              WHERE user_id = ${user_id}
            `;

            await sql`
              UPDATE devices
              SET trusted = true
              WHERE device_name = ${device_name}
                AND user_agent = ${user_agent}
                AND os = ${os}
            `;

            await sql`
                INSERT INTO sessions (id, ip, device_id, refresh_token, status, last_seen, expires_at, created_at)
                VALUES (${sessionID}, ${ip}, ${device.device_id}, ${refresh_token}, ACTIVE, NOW(), NOW() + INTERVAL '7 days', NOW())
            `;

            return c.json({
                success: true,
                message: "Welcome Back!",
                data: {
                    refresh_token,
                    access_token,
                    user,
                }
            }, 200);
        }
    } else {
        const refresh_token = await signRefreshToken({ user_id });
        const access_token = await signAccessToken({ user_id });
        const sessionID = generateUUID();
        const device_id = generateUUID();

        await sql`
          UPDATE devices
          SET trusted = false
          WHERE user_id = ${user_id}
        `;

        await sql`
          UPDATE sessions
          SET status = REVOKED
          WHERE user_id = ${user_id}
        `;

        await sql`
            INSERT INTO devices (id, user_id, ip, user_agent, os, type, trusted, device_name)
            VALUES (${device_id}, ${user_id}, ${ip}, ${user_agent}, ${os}, ${type}, true, ${device_name})
        `;

        await sql`
            INSERT INTO sessions (id, ip, device_id, refresh_token, status, last_seen, expires_at, created_at)
            VALUES (${sessionID}, ${ip}, ${device_id}, ${refresh_token}, ACTIVE, NOW(), NOW() + INTERVAL '7 days', NOW())
        `;

        return c.json({
            success: true,
            message: "Welcome Back!",
            data: {
                refresh_token,
                access_token,
                user,
            }
        }, 200);
    }
})

auth.post("/check", async (c: any) => {

    const { refresh_token } = await c.json();

    const isValide = await verifyAccessToken(refresh_token);

    if (isValide) {
        return c.json({
            success: true,
            message: "Refresh Token Is Valid!",
            data: null,
        }, 200);
    } else {
        return c.json({
            success: false,
            message: "Refresh Token Is Not Valid!",
            data: null,
        }, 400);
    }
});
