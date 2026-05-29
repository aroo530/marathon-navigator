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

export const supabaseMock = {
  from: jest.fn(),
  rpc:  jest.fn(),
};

jest.mock('@/constants/supabaseClient', () => ({
  supabase: supabaseMock,
}));

jest.mock('@/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
