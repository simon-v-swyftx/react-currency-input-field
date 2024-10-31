import { escapeRegExp } from './escapeRegExp';

/**
 * Remove invalid characters
 */
export const removeInvalidChars = (value: string, validChars: ReadonlyArray<string>): string => {
  const chars = escapeRegExp(validChars.join(''));
  const reg = new RegExp(`[^\\p{N}${chars}]`, 'giu');
  return value.replace(reg, '');
};
