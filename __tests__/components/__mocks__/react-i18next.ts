const t = (key: string, fallback?: string) => fallback ?? key;
export const useTranslation = jest.fn(() => ({ t, i18n: { language: 'en' } }));
export const Trans = ({ children }: { children?: React.ReactNode }) => children;
