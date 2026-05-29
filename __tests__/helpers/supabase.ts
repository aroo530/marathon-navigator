import { supabase } from '@/constants/supabaseClient';

/**
 * The auto-mapped mock for the Supabase client (via moduleNameMapper).
 * Cast so callers can call .mockResolvedValue etc. without extra type assertions.
 */
export const supabaseMock = supabase as unknown as { from: jest.Mock; rpc: jest.Mock };

/**
 * Creates a chainable Supabase query builder mock that resolves to { data, error }.
 * Covers: .from().select().eq().neq().order().single() and .rpc() patterns.
 */
export function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> & { then: PromiseLike<unknown>['then'] } = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    neq:    jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then:   (resolve: any, reject: any) =>
      Promise.resolve(result).then(resolve, reject),
  } as any;
  return chain;
}
