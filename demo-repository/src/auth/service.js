function authenticate(token, now = Date.now()) {
  if (!token || typeof token !== 'object') return false;
  if (!token.userId || !token.expiresAt) return false;
  return token.expiresAt > now;
}
module.exports = { authenticate };
