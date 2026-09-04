// Envio de email via Brevo (HTTPS API) — Render free tier bloqueia SMTP,
// por isso usamos sempre a API HTTPS da Brevo, nunca nodemailer/SMTP direto.

async function sendEmail({ to, subject, html, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.SENDER_EMAIL;

  if (!apiKey || !sender) {
    console.warn('BREVO_API_KEY ou SENDER_EMAIL não definidos — email não enviado:', subject);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        sender: { email: sender, name: 'Transferes' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        ...(replyTo ? { replyTo: { email: replyTo } } : {})
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Erro Brevo:', res.status, text);
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    console.error('Erro ao enviar email via Brevo:', err);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendEmail };
