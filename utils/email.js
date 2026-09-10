// Envio de email via Brevo (HTTPS API) — Render free tier bloqueia SMTP,
// por isso usamos sempre a API HTTPS da Brevo, nunca nodemailer/SMTP direto.

function getSiteUrl() {
  return process.env.SITE_URL || 'https://transferes-site.onrender.com';
}

function brandedEmailTemplate({ title, bodyHtml }) {
  const logoUrl = `${getSiteUrl()}/img/srride-icon.png`;
  return `
  <div style="background:#0a0a0a; padding:36px 16px; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width:520px; margin:0 auto; background:#131313; border-radius:16px; overflow:hidden; border:1px solid rgba(199,203,209,0.25);">
      <div style="background:#0a0a0a; padding:26px 28px; border-bottom:1px solid rgba(199,203,209,0.2); text-align:center;">
        <img src="${logoUrl}" alt="SR Ride" width="44" height="44" style="display:block; margin:0 auto 10px;">
        <span style="font-size:19px; font-weight:800; color:#f2f3f4; letter-spacing:0.03em; text-transform:uppercase;">SR Ride</span>
      </div>
      <div style="padding:30px 28px; color:#f2f3f4;">
        <h2 style="margin:0 0 16px; font-size:20px; color:#f2f3f4;">${title}</h2>
        <div style="font-size:15px; line-height:1.65; color:#c7cbd1;">
          ${bodyHtml}
        </div>
      </div>
      <div style="padding:18px 28px; background:#0a0a0a; border-top:1px solid rgba(199,203,209,0.15); color:#85888d; font-size:12px; text-align:center;">
        SR Ride — Chauffeur Excellence · Transfers executivos e de aeroporto em Lisboa.
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
        sender: { email: sender, name: 'SR Ride' },
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
