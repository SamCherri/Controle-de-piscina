import test from 'node:test';
import assert from 'node:assert/strict';
import { performLoginAttempt, type AuthServiceDeps, type AuthUserRecord } from '@/lib/auth/service';
import { issuePasswordReset, redeemPasswordReset, type PasswordResetServiceDeps, type PasswordResetTokenRecord, type PasswordResetUser } from '@/lib/auth/password-reset-service';

function createLoginDeps(user: AuthUserRecord | null, now = new Date('2026-03-23T12:00:00Z')) {
  const state = {
    user: user ? { ...user } : null,
    audits: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>
  };

  const deps: AuthServiceDeps = {
    findUserByEmail: async () => state.user,
    verifyPassword: async (password, passwordHash) => password === passwordHash,
    updateUser: async (_, data) => {
      state.updates.push(data);
      if (state.user) {
        state.user = { ...state.user, ...data } as AuthUserRecord;
      }
    },
    audit: async entry => {
      state.audits.push(entry as Record<string, unknown>);
    },
    now: () => now
  };

  return { deps, state };
}

function createPasswordResetDeps(options?: {
  user?: PasswordResetUser | null;
  tokenRecord?: PasswordResetTokenRecord | null;
  now?: Date;
}) {
  const state = {
    user: options?.user ?? null,
    tokenRecord: options?.tokenRecord ?? null,
    invalidated: [] as Array<{ userId: string; exceptTokenId?: string }>,
    createdTokens: [] as Array<{ userId: string; tokenHash: string; expiresAt: Date }>,
    updatedPasswords: [] as Array<{ userId: string; passwordHash: string }>,
    usedTokens: [] as string[],
    audits: [] as Array<Record<string, unknown>>
  };

  const deps: PasswordResetServiceDeps = {
    findUserByEmail: async () => state.user,
    invalidateOpenTokens: async (userId, exceptTokenId) => {
      state.invalidated.push({ userId, exceptTokenId });
    },
    createToken: async input => {
      state.createdTokens.push(input);
    },
    findTokenByHash: async tokenHash => state.tokenRecord && state.tokenRecord.tokenHash === tokenHash ? state.tokenRecord : null,
    updateUserPassword: async (userId, passwordHash) => {
      state.updatedPasswords.push({ userId, passwordHash });
    },
    markTokenUsed: async tokenId => {
      state.usedTokens.push(tokenId);
    },
    audit: async entry => {
      state.audits.push(entry as Record<string, unknown>);
    },
    generateToken: () => 'plain-token',
    hashToken: token => `hash:${token}`,
    now: () => options?.now ?? new Date('2026-03-23T12:00:00Z'),
    expiresAt: from => new Date(from.getTime() + 30 * 60_000),
    buildResetUrl: token => `http://localhost:3000/reset-password?token=${token}`,
    exposeResetUrlPreview: true
  };

  return { deps, state };
}

test('login bem-sucedido zera tentativas, grava lastLoginAt e respeita troca obrigatória', async () => {
  const { deps, state } = createLoginDeps({
    id: 'u1',
    email: 'admin@piscina.com',
    name: 'Admin',
    passwordHash: 'senha123',
    mustChangePassword: true,
    failedLoginAttempts: 2,
    lockedUntil: null
  });

  const result = await performLoginAttempt(deps, 'admin@piscina.com', 'senha123');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.requiresPasswordChange, true);
  }
  assert.deepEqual(state.updates[0], {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date('2026-03-23T12:00:00Z')
  });
});

test('login inválido incrementa tentativas', async () => {
  const { deps, state } = createLoginDeps({
    id: 'u1',
    email: 'admin@piscina.com',
    name: 'Admin',
    passwordHash: 'senha123',
    mustChangePassword: false,
    failedLoginAttempts: 1,
    lockedUntil: null
  });

  const result = await performLoginAttempt(deps, 'admin@piscina.com', 'errada');

  assert.deepEqual(result, { ok: false, error: 'INVALID_CREDENTIALS' });
  assert.deepEqual(state.updates[0], {
    failedLoginAttempts: 2,
    lockedUntil: null
  });
});

test('bloqueio temporário ocorre após múltiplas falhas', async () => {
  const now = new Date('2026-03-23T12:00:00Z');
  const { deps, state } = createLoginDeps({
    id: 'u1',
    email: 'admin@piscina.com',
    name: 'Admin',
    passwordHash: 'senha123',
    mustChangePassword: false,
    failedLoginAttempts: 4,
    lockedUntil: null
  }, now);

  const result = await performLoginAttempt(deps, 'admin@piscina.com', 'errada');

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, 'ACCOUNT_LOCKED');
    assert.equal(result.lockedUntil?.toISOString(), '2026-03-23T12:15:00.000Z');
  }
  assert.deepEqual(state.updates[0], {
    failedLoginAttempts: 0,
    lockedUntil: new Date('2026-03-23T12:15:00.000Z')
  });
});

test('solicitação de reset não revela existência e gera token quando usuário existe', async () => {
  const { deps, state } = createPasswordResetDeps({
    user: { id: 'u1', email: 'admin@piscina.com' }
  });

  const result = await issuePasswordReset(deps, 'admin@piscina.com');

  assert.equal(result.ok, true);
  assert.equal(result.resetUrlPreview, 'http://localhost:3000/reset-password?token=plain-token');
  assert.equal(state.invalidated.length, 1);
  assert.equal(state.createdTokens[0]?.tokenHash, 'hash:plain-token');
});

test('reset com token válido atualiza senha e invalida token', async () => {
  const { deps, state } = createPasswordResetDeps({
    tokenRecord: {
      id: 't1',
      userId: 'u1',
      tokenHash: 'hash:plain-token',
      expiresAt: new Date('2026-03-23T12:30:00Z'),
      usedAt: null,
      user: { id: 'u1', email: 'admin@piscina.com' }
    }
  });

  const result = await redeemPasswordReset(deps, 'plain-token', 'novo-hash');

  assert.deepEqual(result, { ok: true, email: 'admin@piscina.com' });
  assert.deepEqual(state.updatedPasswords[0], { userId: 'u1', passwordHash: 'novo-hash' });
  assert.deepEqual(state.usedTokens, ['t1']);
  assert.deepEqual(state.invalidated, [{ userId: 'u1', exceptTokenId: 't1' }]);
});

test('reset com token inválido ou expirado falha', async () => {
  const { deps: invalidDeps } = createPasswordResetDeps({ tokenRecord: null });
  const invalidResult = await redeemPasswordReset(invalidDeps, 'plain-token', 'novo-hash');
  assert.deepEqual(invalidResult, { ok: false, error: 'Token inválido ou expirado.' });

  const { deps: expiredDeps } = createPasswordResetDeps({
    tokenRecord: {
      id: 't1',
      userId: 'u1',
      tokenHash: 'hash:plain-token',
      expiresAt: new Date('2026-03-23T11:59:00Z'),
      usedAt: null,
      user: { id: 'u1', email: 'admin@piscina.com' }
    }
  });
  const expiredResult = await redeemPasswordReset(expiredDeps, 'plain-token', 'novo-hash');
  assert.deepEqual(expiredResult, { ok: false, error: 'Token inválido ou expirado.' });
});
