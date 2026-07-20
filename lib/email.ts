import nodemailer from 'nodemailer'

// Hardcoded SMTP credentials as requested
const SMTP_USER = process.env.SMTP_USER || 'NexVoting@gmail.com'
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const SMTP_PASS = process.env.SMTP_PASS || 'uzgduskemwafgulv'

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
})

export async function sendOtpEmail(to: string, otp: string, name?: string) {
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
      <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
        <div style="text-align:center;margin-bottom:18px">
          <img src="/logo.png" alt="BloodNet" style="height:48px;object-fit:contain" />
        </div>
        <h2 style="color:#dc2626">Your BloodNet OTP</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your One-Time Password (OTP) to verify your email is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:2px;margin:10px 0">${otp}</p>
        <p>This code expires in 10 minutes. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:18px 0" />
        <p style="font-size:12px;color:#6b7280">If you didn't request this, you can ignore this email.</p>
      </div>
    </div>
  `

  const info = await transporter.sendMail({
    from: `BloodNet <${SMTP_USER}>`,
    to,
    subject: 'BloodNet OTP Verification',
    html,
  })

  return info
}
