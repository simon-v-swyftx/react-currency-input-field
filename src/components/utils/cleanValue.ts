import { parseAbbrValue } from './parseAbbrValue';
import { removeSeparators } from './removeSeparators';
import { removeInvalidChars } from './removeInvalidChars';
import { escapeRegExp } from './escapeRegExp';
import { CurrencyInputProps } from '../CurrencyInputProps';

export type CleanValueOptions = Pick<
  CurrencyInputProps,
  | 'decimalSeparator'
  | 'groupSeparator'
  | 'allowDecimals'
  | 'decimalsLimit'
  | 'allowNegativeValue'
  | 'disableAbbreviations'
  | 'prefix'
  | 'transformRawValue'
  | 'intlConfig'
> & { value: string };

/**
 * Convert non-western Arabic digits to western Arabic digits
 */
export const convertToWesternArabicDigits = (value: string): string => {
  return value.replace(/[^\d]/g, (digit) => {
    const code = digit.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) {
      return String.fromCharCode(code - 0x0660 + 48); // Arabic-Indic digits
    } else if (code >= 0x06f0 && code <= 0x06f9) {
      return String.fromCharCode(code - 0x06f0 + 48); // Eastern Arabic-Indic digits
    } else if (code >= 0x0966 && code <= 0x096f) {
      return String.fromCharCode(code - 0x0966 + 48); // Devanagari digits
    } else if (code >= 0x09e6 && code <= 0x09ef) {
      return String.fromCharCode(code - 0x09e6 + 48); // Bengali digits
    } else if (code >= 0x0a66 && code <= 0x0a6f) {
      return String.fromCharCode(code - 0x0a66 + 48); // Gurmukhi digits
    } else if (code >= 0x0ae6 && code <= 0x0aef) {
      return String.fromCharCode(code - 0x0ae6 + 48); // Gujarati digits
    } else if (code >= 0x0b66 && code <= 0x0b6f) {
      return String.fromCharCode(code - 0x0b66 + 48); // Oriya digits
    } else if (code >= 0x0be6 && code <= 0x0bef) {
      return String.fromCharCode(code - 0x0be6 + 48); // Tamil digits
    } else if (code >= 0x0c66 && code <= 0x0c6f) {
      return String.fromCharCode(code - 0x0c66 + 48); // Telugu digits
    } else if (code >= 0x0ce6 && code <= 0x0cef) {
      return String.fromCharCode(code - 0x0ce6 + 48); // Kannada digits
    } else if (code >= 0x0d66 && code <= 0x0d6f) {
      return String.fromCharCode(code - 0x0d66 + 48); // Malayalam digits
    } else if (code >= 0x0e50 && code <= 0x0e59) {
      return String.fromCharCode(code - 0x0e50 + 48); // Thai digits
    } else if (code >= 0x0ed0 && code <= 0x0ed9) {
      return String.fromCharCode(code - 0x0ed0 + 48); // Lao digits
    } else if (code >= 0x17e0 && code <= 0x17e9) {
      return String.fromCharCode(code - 0x17e0 + 48); // Khmer digits
    } else if (code >= 0x1040 && code <= 0x1049) {
      return String.fromCharCode(code - 0x1040 + 48); // Myanmar digits
    } else if (code >= 0x0de6 && code <= 0x0def) {
      return String.fromCharCode(code - 0x0de6 + 48); // Sinhala digits
    } else if (code >= 0x0f20 && code <= 0x0f29) {
      return String.fromCharCode(code - 0x0f20 + 48); // Tibetan digits
    } else if (code >= 0x1810 && code <= 0x1819) {
      return String.fromCharCode(code - 0x1810 + 48); // Mongolian digits
    } else if (code >= 0x1369 && code <= 0x1371) {
      return String.fromCharCode(code - 0x1369 + 48); // Ethiopic digits
    } else if (code >= 0x07c0 && code <= 0x07c9) {
      return String.fromCharCode(code - 0x07c0 + 48); // N'Ko digits
    } else if (code >= 0x104a0 && code <= 0x104a9) {
      return String.fromCharCode(code - 0x104a0 + 48); // Osmanya digits
    } else if (code >= 0xa620 && code <= 0xa629) {
      return String.fromCharCode(code - 0xa620 + 48); // Vai digits
    } else if (code >= 0xa8d0 && code <= 0xa8d9) {
      return String.fromCharCode(code - 0xa8d0 + 48); // Saurashtra digits
    } else {
      return digit; // Return the original character if it's not a recognized digit
    }
  });
};

/**
 * Remove prefix, separators and extra decimals from value
 */
export const cleanValue = ({
  value,
  groupSeparator = ',',
  decimalSeparator = '.',
  allowDecimals = true,
  decimalsLimit = 2,
  allowNegativeValue = true,
  disableAbbreviations = false,
  prefix = '',
  transformRawValue = (rawValue) => rawValue,
}: CleanValueOptions): string => {
  const transformedValue = transformRawValue(value);

  if (transformedValue === '-') {
    return transformedValue;
  }

  const abbreviations = disableAbbreviations ? [] : ['k', 'm', 'b'];
  const reg = new RegExp(`((^|\\D)-\\d)|(-${escapeRegExp(prefix)})`);
  const isNegative = reg.test(transformedValue);

  // Convert non-western Arabic digits to western Arabic digits
  const westernArabicValue = convertToWesternArabicDigits(transformedValue);

  // Is there a digit before the prefix? eg. 1$
  const [prefixWithValue, preValue] =
    RegExp(`(\\d+)-?${escapeRegExp(prefix)}`).exec(westernArabicValue) || [];
  const withoutPrefix = prefix
    ? prefixWithValue
      ? westernArabicValue.replace(prefixWithValue, '').concat(preValue)
      : westernArabicValue.replace(prefix, '')
    : westernArabicValue;
  const withoutSeparators = removeSeparators(withoutPrefix, groupSeparator);
  const withoutInvalidChars = removeInvalidChars(withoutSeparators, [
    groupSeparator,
    decimalSeparator,
    ...abbreviations,
  ]);

  let valueOnly = withoutInvalidChars;

  if (!disableAbbreviations) {
    // disallow letter without number
    if (
      abbreviations.some(
        (letter) => letter === withoutInvalidChars.toLowerCase().replace(decimalSeparator, '')
      )
    ) {
      return '';
    }
    const parsed = parseAbbrValue(withoutInvalidChars, decimalSeparator);
    if (parsed !== undefined) {
      valueOnly = String(parsed);
    }
  }

  const includeNegative = isNegative && allowNegativeValue ? '-' : '';

  if (decimalSeparator && valueOnly.includes(decimalSeparator)) {
    const [int, decimals] = withoutInvalidChars.split(decimalSeparator);
    const trimmedDecimals = decimalsLimit && decimals ? decimals.slice(0, decimalsLimit) : decimals;
    const includeDecimals = allowDecimals ? `${decimalSeparator}${trimmedDecimals}` : '';

    return `${includeNegative}${int}${includeDecimals}`;
  }

  return `${includeNegative}${valueOnly}`;
};
