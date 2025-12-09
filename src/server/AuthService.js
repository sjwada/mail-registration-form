/**
 * AuthService (Application Layer)
 * 
 * Handles authentication flows (Magic Link).
 * Functional Style: Uses Result monad for flow control.
 * Pure: Depends only on interfaces/adapters (injected or imported).
 */

// const { HouseholdRepositoryClean } = require('./domain/repository/HouseholdRepositoryClean');
// const { KVStoreAdapter } = require('./infra/KVStoreAdapter');
// const { Result } = require('./shared/Result');

class AuthService {
  constructor(householdRepo, kvStore) {
    // Dependency Injection (Defaults to standard implementations)
    this.householdRepo = householdRepo || new HouseholdRepositoryClean();
    this.kvStore = kvStore || KVStoreAdapter;
    this.expiryMinutes = CONFIG.MAGIC_LINK_EXPIRY_MINUTES || 30;
  }

  /**
   * Request a Magic Link for the given email.
   * Flow: Verify Email -> Generate Token -> Save Token -> Send Email
   * @param {string} email 
   * @returns {Result<string, Error>} Success message or Error
   */
  requestMagicLink(email) {
    return this.householdRepo.findByEmail(email)
      .flatMap(householdId => {
        if (!householdId) {
          return Result.err(new Error('メールアドレスが見つかりませんでした。'));
        }
        return Result.ok(householdId);
      })
      .flatMap(householdId => {
        // Generate Token & Expiry
        const token = this._generateToken();
        const expires = new Date().getTime() + (this.expiryMinutes * 60 * 1000);
        
        // Save to KV Store
        const data = JSON.stringify({ householdId, expires });
        return this.kvStore.set(`magiclink_${token}`, data)
          .map(() => token); // Pass token down the chain
      })
      .flatMap(token => {
        // Send Email (Side Effect, but wrapped in Result via try-catch if needed)
        // MailService is currently a global object in GAS.
        // Ideally we wrap it too, but for now we assume it throws on error.
        return Result.fromTry(() => {
          sendMagicLinkEmail(email, token);
          return '編集リンクをメールで送信しました。メールをご確認ください。';
        });
      });
  }

  /**
   * Validate a Magic Link token.
   * @param {string} token 
   * @returns {Result<Household, Error>}
   */
  validateToken(token) {
    return this.kvStore.get(`magiclink_${token}`)
      .flatMap(dataStr => {
        if (!dataStr) return Result.err(new Error('編集リンクが無効です。'));
        
        const data = JSON.parse(dataStr);
        const now = new Date().getTime();
        
        if (now > data.expires) {
          this.kvStore.delete(`magiclink_${token}`); // Cleanup
          return Result.err(new Error('編集リンクの有効期限が切れています。'));
        }
        
        // Success: Consume token (One-time use)
        this.kvStore.delete(`magiclink_${token}`);
        
        return this.householdRepo.getHouseholdData(data.householdId);
      });
  }

  /**
   * Authenticate a user with Email and Edit Code.
   * @param {string} email 
   * @param {string} editCode 
   * @returns {Result<object, Error>} Household Data or Error
   */
  authenticate(email, editCode) {
    return this.householdRepo.findByEmail(email)
      .flatMap(data => {
        if (!data) {
            return Result.err(new Error('メールアドレスが見つかりませんでした。'));
        }
        
        // Data is already the full household object, so we verify directly.
        if (!data.household) {
             // Should verify if this case is reachable from findByEmail (it returns null if household missing)
             // But for safety:
             return Result.err(new Error('世帯データが見つかりませんでした。'));
        }

        // Validate Edit Code
        const storedCode = String(data.household['編集コード']); // Check header key if different? Repo uses '編集コード'
        if (storedCode !== String(editCode)) {
           return Result.err(new Error('編集コードが正しくありません。'));
        }

        // Validate Email is Active (belongs to a current guardian or student)
        // Access strictly via header keys
        const isGuardian = data.guardians.some(g => g['連絡用メール'] === email);
        const isStudent = data.students.some(s => s['連絡用メール'] === email || s['オンライン授業用メール'] === email);
        
        if (!isGuardian && !isStudent) {
            return Result.err(new Error('このメールアドレスは現在有効ではありません（削除された可能性があります）。'));
        }

        return Result.ok(data);
      });
  }

  // Helper
  _generateToken() {
    return Utilities.getUuid();
  }
}

if (typeof exports !== 'undefined') {
  exports.AuthService = AuthService;
}
