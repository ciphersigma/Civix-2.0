import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendOTPEmail(to: string, code: string): Promise<void> {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log(`[EMAIL-DEV] OTP for ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: `"CIVIX" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `${code} is your CIVIX verification code`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="margin:0;font-size:24px;color:#1f2937">CIVIX</h1>
          <p style="margin:4px 0 0;color:#6b7280;font-size:13px">Waterlogging Alert Platform</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
          <p style="margin:0 0 16px;color:#374151;font-size:15px">Your verification code is:</p>
          <div style="text-align:center;padding:16px;background:#eef2ff;border-radius:10px;margin-bottom:16px">
            <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#6366f1">${code}</span>
          </div>
          <p style="margin:0;color:#9ca3af;font-size:13px">This code expires in 10 minutes. Don't share it with anyone.</p>
        </div>
        <p style="text-align:center;margin:16px 0 0;color:#d1d5db;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
