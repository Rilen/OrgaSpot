const {
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  REDIRECT_URI,
  sendJson,
  handleError,
} = require('./_lib');

/**
 * POST /api/auth/refresh
 * Body: { refreshToken: string }
 * Returns: { accessToken: string, expiresIn: number }
 */
module.exports = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return sendJson(res, 400, { error: { message: 'refreshToken is required' } });
    }

    const tokens = await refreshAccessToken(refreshToken);
    sendJson(res, 200, {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });
  } catch (error) {
    handleError(res, error);
  }
};
