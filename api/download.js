// api/download.js
//
// Validates the signed link sent by email (see api/razorpay-webhook.js) and,
// if it's genuine and not expired, redirects the customer to the actual
// bundle file. This is what makes the emailed link "valid for 24 hours"
// instead of a permanent, guessable URL anyone could share.

const crypto = require('crypto');

module.exports = async (req, res) => {
  const { token, exp, email } = req.query;

  if (!token || !exp || !email) {
    return res.status(400).send('This link is missing required information.');
  }

  const expiresAt = Number(exp);

  const expectedToken = crypto
    .createHmac('sha256', process.env.DOWNLOAD_TOKEN_SECRET)
    .update(`${email}:${expiresAt}`)
    .digest('hex');

  if (token !== expectedToken) {
    return res.status(403).send('This link is invalid or has been tampered with.');
  }

  if (Date.now() > expiresAt) {
    return res
      .status(410)
      .send('This download link has expired (links are valid for 24 hours). Contact support for a new one.');
  }

  if (!process.env.BUNDLE_FILE_URL) {
    return res.status(500).send('BUNDLE_FILE_URL is not configured. Set it in your Vercel project environment variables.');
  }

  return res.redirect(302, process.env.BUNDLE_FILE_URL);
};
