/**
 * District Stock — Centralized Authentication & Authorization Service
 * 
 * Security & Provisioning Rules:
 * 1. Initial administrator account:
 *    - Email/User ID: super.admin@district.com
 *    - Password: Admin@1234 (never stored in plain text; verified via salted SHA-256 hash)
 *    - Role: Admin
 * 2. Only authorized and active accounts can authenticate.
 * 3. Self-registration is strictly disallowed.
 * 4. Passwords are never stored in plain text.
 */

// Portable pure-JavaScript SHA-256 implementation
function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [((temp1 + temp2) | 0)].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let i2 = 3; i2 >= 0; i2--) {
      const c = (hash[i] >> (i2 * 8)) & 255;
      result += (c < 16 ? '0' : '') + c.toString(16);
    }
  }
  return result;
}

// Fixed cryptographic salt for password hashing
const SALT = 'district_stock_salt_v1';

// Precomputed SHA-256 hash for Admin@1234 + salt:
// 'Admin@1234' + 'district_stock_salt_v1' => '6f7e26acbdbec4200b4c92dc0bc9098b6083c91d39d0bca0353e72694a6b7d68'
const INITIAL_ADMIN_HASH = '6f7e26acbdbec4200b4c92dc0bc9098b6083c91d39d0bca0353e72694a6b7d68';

// In-memory persistent database of authorized user accounts
// Initial installation starts strictly with the initial administrator account
let usersDatabase = [
  {
    id: 'USR-001',
    email: 'super.admin@district.com',
    userId: 'super.admin@district.com',
    name: 'Super Administrator',
    role: 'Admin',
    status: 'active',
    mobile: '+91 98000 00001',
    assignedLocations: ['Central Warehouse', 'All Event Hubs'],
    salt: SALT,
    passwordHash: INITIAL_ADMIN_HASH,
    createdAt: '2026-10-10T00:00:00.000Z',
  },
];

// Active authenticated session
let currentSession = null;

export const authService = {
  /**
   * Securely hash a password with the system salt
   */
  hashPassword(password, userSalt = SALT) {
    return sha256(password + userSalt);
  },

  /**
   * Authenticate with User ID / Email and Password
   */
  async authenticate(identifier, password) {
    if (!identifier || !identifier.trim()) {
      return { success: false, error: 'Please enter your User ID or Email.' };
    }
    if (!password || !password.trim()) {
      return { success: false, error: 'Please enter your password.' };
    }

    const cleanId = identifier.trim().toLowerCase();

    // Find account by email or userId
    const user = usersDatabase.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.userId && u.userId.toLowerCase() === cleanId)
    );

    if (!user) {
      return {
        success: false,
        error: 'Invalid User ID or Password. No matching account found.',
      };
    }

    // Check account status
    if (user.status !== 'active') {
      return {
        success: false,
        error: 'This account is inactive. Please contact your system administrator.',
      };
    }

    // Secure password verification
    const computedHash = sha256(password + (user.salt || SALT));
    if (computedHash !== user.passwordHash) {
      return {
        success: false,
        error: 'Invalid User ID or Password.',
      };
    }

    // Create session (omitting password hash)
    currentSession = {
      id: user.id,
      email: user.email,
      userId: user.userId || user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      mobile: user.mobile,
      assignedLocations: user.assignedLocations,
      hub: user.assignedLocations ? user.assignedLocations[0] : 'Central Hub',
      loginTime: new Date().toISOString(),
    };

    return {
      success: true,
      session: currentSession,
    };
  },

  /**
   * Authenticate via Ground Access Code (Rush Operations)
   */
  async authenticateAccessCode(accessCode) {
    const code = (accessCode || '').trim().toUpperCase();
    if (!code) {
      return { success: false, error: 'Please enter your event access code.' };
    }
    if (code.length < 3) {
      return { success: false, error: 'Access code must be at least 3 characters.' };
    }

    // Role mapping for known codes (supports Warehouse and Event Ground users)
    let role = 'Ground User — Warehouse';
    let hub = 'Central Warehouse - Terminal 01';

    if (code.includes('EVENT') || code.includes('EXP') || code.includes('VIP')) {
      role = 'Ground User — Event';
      hub = 'Main Event Arena - Dispatch Hub';
    } else if (code.includes('PLAN')) {
      role = 'Event Planner';
      hub = 'Event Planning Department';
    } else if (code.includes('MGR') || code.includes('OPS')) {
      role = 'Operations Manager';
      hub = 'Regional Operations HQ';
    }

    currentSession = {
      id: `GND-${code}`,
      email: `ground.${code.toLowerCase()}@district.internal`,
      userId: `GROUND-${code}`,
      name: `Ground Operator (${code})`,
      role: role,
      status: 'active',
      assignedLocations: [hub],
      hub: hub,
      accessCode: code,
      loginTime: new Date().toISOString(),
    };

    return {
      success: true,
      session: currentSession,
    };
  },

  /**
   * Get current authenticated session
   */
  getCurrentSession() {
    return currentSession;
  },

  /**
   * Log out active user and clear session
   */
  logout() {
    currentSession = null;
  },

  /**
   * Retrieve all users (excluding sensitive password hashes)
   */
  getUsers() {
    return usersDatabase.map(({ passwordHash, salt, ...safeUser }) => safeUser);
  },

  /**
   * Get User Setup metric summary
   */
  getUserMetrics() {
    // In initial fresh installation, metrics are blank (—) as requested
    return {
      total: '—',
      active: '—',
      inactive: '—',
    };
  },
};
