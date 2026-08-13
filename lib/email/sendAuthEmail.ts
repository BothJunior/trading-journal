import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

export async function sendVerificationCodeEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const from = process.env.EMAIL_FROM || '"Personal Journal" <noreply@trading-journal-k7rq.onrender.com>';
  const transporter = getTransporter();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background-color: #020617; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #fbbf24; font-size: 24px; font-weight: 800; margin: 0;">Personal Journal</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Account Verification Code</p>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        Welcome to Personal Journal! Please use the 6-digit verification code below to activate your trading journal account:
      </p>

      <div style="background-color: #0f172a; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #fbbf24;">
          ${code}
        </span>
      </div>

      <p style="color: #64748b; font-size: 12px; line-height: 1.5; text-align: center;">
        This code expires in 15 minutes. If you did not create an account, please ignore this email.
      </p>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`[VERIFICATION CODE SENT] Email: ${email} | Code: ${code}`);
  console.log(`==================================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: `${code} is your Personal Journal verification code`,
        html,
      });
    } catch (err) {
      console.error("Failed to dispatch verification email via SMTP:", err);
    }
  }
}

export async function sendPasswordResetEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://trading-journal-k7rq.onrender.com";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const from = process.env.EMAIL_FROM || '"Personal Journal" <noreply@trading-journal-k7rq.onrender.com>';
  const transporter = getTransporter();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background-color: #020617; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #fbbf24; font-size: 24px; font-weight: 800; margin: 0;">Personal Journal</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        You requested a password reset for your Personal Journal account. Click the button below to set a new password:
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #f59e0b; color: #020617; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
          Reset Password
        </a>
      </div>

      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        Or copy and paste this URL into your browser:<br />
        <a href="${resetUrl}" style="color: #60a5fa; word-break: break-all;">${resetUrl}</a>
      </p>

      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px; text-align: center;">
        This reset link expires in 1 hour. If you did not request a password reset, please ignore this email.
      </p>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`[PASSWORD RESET SENT] Email: ${email} | URL: ${resetUrl}`);
  console.log(`==================================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "Reset your Personal Journal password",
        html,
      });
    } catch (err) {
      console.error("Failed to dispatch password reset email via SMTP:", err);
    }
  }
}
