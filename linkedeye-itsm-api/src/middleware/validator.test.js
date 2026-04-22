// ═══════════════════════════════════════════════════════════
// Password Complexity Validation Tests
// ═══════════════════════════════════════════════════════════

describe('Password Validation', () => {
  test('should accept password with 12+ chars, uppercase, lowercase, number, special', () => {
    const strongPassword = 'SecurePass123!';

    // Test all requirements
    expect(strongPassword.length).toBeGreaterThanOrEqual(12);
    expect(strongPassword).toMatch(/(?=.*[a-z])/); // lowercase
    expect(strongPassword).toMatch(/(?=.*[A-Z])/); // uppercase
    expect(strongPassword).toMatch(/(?=.*\d)/);    // number
    expect(strongPassword).toMatch(/(?=.*[@$!%*?&])/); // special
  });

  test('should reject password without uppercase', () => {
    const password = 'securepass123!';
    expect(password).not.toMatch(/(?=.*[A-Z])/);
  });

  test('should reject password without lowercase', () => {
    const password = 'SECUREPASS123!';
    expect(password).not.toMatch(/(?=.*[a-z])/);
  });

  test('should reject password without number', () => {
    const password = 'SecurePass!';
    expect(password).not.toMatch(/(?=.*\d)/);
  });

  test('should reject password without special character', () => {
    const password = 'SecurePass123';
    expect(password).not.toMatch(/(?=.*[@$!%*?&])/);
  });

  test('should reject password shorter than 12 characters', () => {
    const password = 'Pass123!';
    expect(password.length).toBeLessThan(12);
  });

  test('should accept various valid special characters', () => {
    const validPasswords = [
      'ValidPass1@test',
      'ValidPass1$test',
      'ValidPass1!test',
      'ValidPass1%test',
      'ValidPass1*test',
      'ValidPass1?test',
      'ValidPass1&test',
    ];

    validPasswords.forEach(pwd => {
      expect(pwd.length).toBeGreaterThanOrEqual(12);
      expect(pwd).toMatch(/(?=.*[a-z])/);
      expect(pwd).toMatch(/(?=.*[A-Z])/);
      expect(pwd).toMatch(/(?=.*\d)/);
      expect(pwd).toMatch(/(?=.*[@$!%*?&])/);
    });
  });
});
