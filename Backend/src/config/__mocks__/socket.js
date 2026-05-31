import { jest } from '@jest/globals';

export const emitToUser   = jest.fn().mockResolvedValue(undefined);
export const getUserSockets = jest.fn().mockResolvedValue([]);
export const getIO        = jest.fn().mockReturnValue({});
export const initSocket   = jest.fn().mockReturnValue({});