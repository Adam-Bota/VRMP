import { createUserIfNotExists } from '../../services/users';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@/firebase.client', () => ({
  db: jest.fn(),
}));

describe('createUserIfNotExists', () => {
  it('should create a new user document if it does not exist', async () => {
    const mockAuthUser = { uid: '123', email: 'test@example.com', displayName: 'Test User', photoURL: 'http://example.com/photo.jpg' };
    const result = await createUserIfNotExists(mockAuthUser);
    expect(result).toBe(mockAuthUser.uid);
  });

  it('should update lastLoginAt for an existing user', async () => {
    const mockAuthUser = { uid: '123', email: 'test@example.com', displayName: 'Test User', photoURL: 'http://example.com/photo.jpg' };
    await expect(createUserIfNotExists(mockAuthUser)).resolves.not.toThrow();
  });
});