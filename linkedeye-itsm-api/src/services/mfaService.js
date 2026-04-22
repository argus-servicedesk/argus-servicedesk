// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — MFA (TOTP) Service
// ═══════════════════════════════════════════════════════════

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate TOTP secret and QR code for user MFA setup
 */
async function generateMfaSetup(email, appName = 'LinkedEye ITSM') {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    issuer: appName,
    length: 32,
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  // Generate 10 backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCode,
    backupCodes,
    otpauthUrl: secret.otpauth_url,
  };
}

/**
 * Verify a TOTP token against a secret
 */
function verifyTotp(token, secret) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow +/-2 time steps (+/-60 seconds)
  });
}

/**
 * Verify a backup code (constant-time comparison).
 * Returns { valid, remaining } where remaining is the updated backup codes array.
 */
function verifyBackupCode(code, backupCodes) {
  const upperCode = code.toUpperCase();
  let foundIndex = -1;

  for (let i = 0; i < backupCodes.length; i++) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(upperCode), Buffer.from(backupCodes[i]))) {
        foundIndex = i;
        break;
      }
    } catch {
      // Different lengths — skip
    }
  }

  if (foundIndex === -1) {
    return { valid: false, remaining: backupCodes };
  }

  const remaining = backupCodes.filter((_, i) => i !== foundIndex);
  return { valid: true, remaining };
}

module.exports = { generateMfaSetup, verifyTotp, verifyBackupCode };
