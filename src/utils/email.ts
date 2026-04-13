import nodemailer from 'nodemailer'

type SendResetPasswordEmailPayload = {
  to: string
  resetToken: string
}

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

const buildResetPasswordLink = (resetToken: string) => {
  const clientBaseUrl = process.env.CLIENT_RESET_PASSWORD_URL ?? 'http://localhost:3000/reset-password'
  const url = new URL(clientBaseUrl)
  url.searchParams.set('token', resetToken)
  return url.toString()
}

export const sendResetPasswordEmail = async ({ to, resetToken }: SendResetPasswordEmailPayload) => {
  const transporter = createTransporter()
  const resetLink = buildResetPasswordLink(resetToken)

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: 'Reset your password',
    text: `Click this link to reset your password: ${resetLink}`,
    html: `
      <p>Hi,</p>
      <p>You requested to reset your password.</p>
      <p>
        Click this link to continue:
        <a href="${resetLink}" target="_blank" rel="noopener noreferrer">Reset password</a>
      </p>
      <p>If you did not request this, please ignore this email.</p>
    `
  })
}
