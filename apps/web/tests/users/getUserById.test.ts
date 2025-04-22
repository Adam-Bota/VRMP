import { getUserById } from '../../services/users';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@/firebase.client', () => ({
  db: jest.fn(),
}));

describe('getUserById', () => {
  it('should return user data for an existing user', async () => {
    const userId = '123';
    const user = await getUserById(userId);
    expect(user).toHaveProperty('id', userId);
  });

  it('should return null for a non-existent user', async () => {
    const userId = 'non-existent';
    const user = await getUserById(userId);
    expect(user).toBeNull();
  });
});