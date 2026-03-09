type PasswordResetPayload = {
  to: string;
  code: string;
};

function getMailgunConfig() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM_EMAIL;

  if (!apiKey || !domain || !from) {
    return null;
  }

  return {
    apiKey,
    domain,
    from,
  };
}

export async function sendPasswordResetCodeEmail(payload: PasswordResetPayload) {
  const config = getMailgunConfig();

  if (!config) {
    console.warn('Password reset email was not sent because Mailgun is not fully configured.');
    return { sent: false };
  }

  const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      from: config.from,
      to: payload.to,
      subject: 'Código para restablecer tu contraseña',
      text: `Tu código para restablecer contraseña es: ${payload.code}. Este código expira en 15 minutos.`,
      html: `<p>Tu código para restablecer contraseña es:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${payload.code}</p><p>Este código expira en 15 minutos.</p>`,
    }).toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Mailgun error ${response.status}: ${details}`);
  }

  return { sent: true };
}
