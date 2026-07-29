// api/razorpay-webhook.js
//
// Razorpay calls this URL directly (server-to-server) the moment a payment
// is captured — it does NOT rely on the customer's browser, so it can't be
// skipped or spoofed the way a client-side "success" callback can.
//
// Flow:
//   1. Razorpay sends a POST here with the raw payment payload + a signature.
//   2. We verify the signature using RAZORPAY_WEBHOOK_SECRET.
//   3. On a genuine "payment.captured" event, we build a signed, time-limited
//      download link and email it to the customer via the Resend API.
//
// Setup (Razorpay Dashboard → Settings → Webhooks):
//   Webhook URL: https://yourdomain.com/api/razorpay-webhook
//   Active events: payment.captured
//   Secret: generate one and save it as RAZORPAY_WEBHOOK_SECRET in Vercel
//
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RAZORPAY_WEBHOOK_SECRET   — the secret you set for this webhook in Razorpay
//   RESEND_API_KEY            — from resend.com/api-keys
//   RESEND_FROM_EMAIL         — e.g. "Winning Stack <bundle@yourdomain.com>" (must be a verified Resend sender)
//   DOWNLOAD_TOKEN_SECRET     — any long random string, used to sign download links
//   SITE_URL                  — e.g. https://your-project.vercel.app (no trailing slash)
//   BUNDLE_FILE_URL           — where the actual bundle file lives (Google Drive/S3/direct file link)

const crypto = require('crypto');

// Razorpay signs the RAW request body, so we must read the raw bytes
// ourselves instead of letting Vercel auto-parse JSON.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function buildDownloadLink(email) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // valid for 24 hours
  const token = crypto
    .createHmac('sha256', process.env.DOWNLOAD_TOKEN_SECRET)
    .update(`${email}:${expiresAt}`)
    .digest('hex');

  return `${process.env.SITE_URL}/api/download?token=${token}&exp=${expiresAt}&email=${encodeURIComponent(email)}`;
}

async function sendBundleEmail(email, downloadUrl) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Your Digital Bundle is Ready!',
      html: `
        <p>Hi! Thanks for your purchase.</p>
        <p>Download your bundle here: <a href="${downloadUrl}">${downloadUrl}</a></p>
        <p>This link is valid for 24 hours.</p>
      `,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const rawBody = await readRawBody(req);

  // ---- 1. Verify this request genuinely came from Razorpay ----
  const signature = req.headers['x-razorpay-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (!signature || signature !== expectedSignature) {
    return res.status(400).send('Invalid signature');
  }

  const payload = JSON.parse(rawBody);

  // ---- 2. Only act on a captured payment ----
  if (payload.event !== 'payment.captured') {
    return res.status(200).send('Event ignored');
  }

  const payment = payload.payload && payload.payload.payment && payload.payload.payment.entity;
  const email = payment && payment.email;

  if (!email) {
    console.error('payment.captured webhook had no email on the payment entity', payment && payment.id);
    return res.status(200).send('No email on payment — cannot deliver bundle');
  }

  // ---- 3. Build the download link and email it ----
  try {
    const downloadUrl = buildDownloadLink(email);
    await sendBundleEmail(email, downloadUrl);
    return res.status(200).send('Bundle emailed');
  } catch (err) {
    console.error('Failed to deliver bundle email:', err);
    // Return 200 anyway so Razorpay doesn't endlessly retry a broken payload;
    // rely on your own logs/alerts to catch delivery failures.
    return res.status(200).send('Webhook received, email delivery failed — check logs');
  }
};
