import { Resend } from "resend";

const resend = new Resend(process.env.ReSendToken!);

export function sendOTP(subject: string, otp: string) {
    resend.emails.send({
        from: "onboarding@resend.dev",
        to: "playwithyas@gmail.com",
        subject: subject,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Code</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:hidden;">
          
          <tr>
            <td style="padding:24px 32px; background:#111827; color:#ffffff;">
              <h2 style="margin:0; font-size:20px; font-weight:600;">
                Verify your account
              </h2>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.6;">
                Hello 👋,
              </p>

              <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
                You requested a new verification code. Use the code below to complete your sign-in.
              </p>

              <div style="text-align:center; margin:32px 0;">
                <div style="display:inline-block; padding:18px 28px; font-size:28px; letter-spacing:6px; font-weight:700; color:#111827; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px;">
                  ${otp}
                </div>
              </div>

              <p style="margin:0 0 12px; color:#6b7280; font-size:14px;">
                This code will expire in <strong>5 minutes</strong>.
              </p>

              <p style="margin:0; color:#6b7280; font-size:14px;">
                If you didn’t request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px; background:#f9fafb; text-align:center;">
              <p style="margin:0; color:#9ca3af; font-size:12px;">
                © 2026 Your Company. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `,
    });
}
