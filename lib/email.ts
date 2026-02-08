type SendEmailArgs = {
  to: string
  subject: string
  html: string
  text: string
}

async function sendWithResend(args: SendEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY and EMAIL_FROM are required to send email')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend email failed (${res.status}): ${body}`)
  }
}

export async function sendEmail(args: SendEmailArgs): Promise<void> {
  // Primary: Resend (no extra deps)
  if (process.env.RESEND_API_KEY) {
    await sendWithResend(args)
    return
  }

  // No provider configured: log for dev.
  // In production, this will end up in platform logs; request endpoint remains non-enumerating.
  console.info('[email] provider not configured, skipping send', {
    to: args.to,
    subject: args.subject,
  })
}

