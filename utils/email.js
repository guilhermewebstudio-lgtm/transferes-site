// Envio de email via Brevo (HTTPS API) — Render free tier bloqueia SMTP,
// por isso usamos sempre a API HTTPS da Brevo, nunca nodemailer/SMTP direto.

function brandedEmailTemplate({ title, bodyHtml }) {
  return `
  <div style="background:#060a12; padding:32px 16px; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#0b1220; border-radius:16px; overflow:hidden; border:1px solid #1c2740;">
      <div style="background:#0d1526; padding:24px 28px; border-bottom:1px solid #1c2740;">
        <span style="font-size:20px; font-weight:800; color:#eef2f8; letter-spacing:0.02em;">Transferes</span>
      </div>
      <div style="padding:28px; color:#eef2f8;">
        <h2 style="margin:0 0 16px; font-size:20px; color:#eef2f8;">${title}</h2>
        <div style="font-size:15px; line-height:1.6; color:#c7d2e0;">
          ${bodyHtml}
        </div>
      </div>
      <div style="padding:18px 28px; background:#080e18; border-top:1px solid #1c2740; color:#7c8aa3; font-size:12px;">
        Transferes — transfers executivos e de aeroporto em Lisboa.
      </div>
    </div>
  </div>`;
}

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

module.exports = { sendEmail, brandedEmailTemplate };
