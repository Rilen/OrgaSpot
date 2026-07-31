const {
  generateAuthUrl,
  exchangeCodeForTokens,
  sendJson,
  handleError,
  REDIRECT_URI,
} = require('./_lib');

/**
 * GET  /api/auth       — Returns Spotify OAuth URL
 * GET  /api/auth?code= — Handles OAuth callback
 */
module.exports = async (req, res) => {
  const { code, error, error_description, state } = req.query;

  // Handle OAuth callback (Spotify redirects here after user authorizes)
  if (code) {
    try {
      const tokens = await exchangeCodeForTokens(code);

      // Redirect back to frontend with tokens in URL hash
      const hash = `#access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}&expires_in=${tokens.expires_in}`;
      const redirectUrl = `${process.env.FRONTEND_URL || 'https://orgaspot.vercel.app/'}${hash}`;

      res.writeHead(302, { Location: redirectUrl });
      res.end();
      return;
    } catch (err) {
      const errorHash = `#error=${encodeURIComponent(err.message)}`;
      res.writeHead(302, {
        Location: `${process.env.FRONTEND_URL || 'https://orgaspot.vercel.app/'}${errorHash}`,
      });
      res.end();
      return;
    }
  }

  // Handle OAuth error
  if (error) {
    return sendJson(res, 400, {
      error: { message: error_description || error },
    });
  }

  // Initial request — return OAuth URL
  try {
    const url = generateAuthUrl();
    sendJson(res, 200, { url });
  } catch (err) {
    handleError(res, err);
  }
};
