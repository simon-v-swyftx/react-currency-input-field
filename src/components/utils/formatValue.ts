import { IntlConfig } from '../CurrencyInputProps';
import { escapeRegExp } from './escapeRegExp';
import { getSuffix } from './getSuffix';

export type FormatValueOptions = {
  /**
   * Value to format
   */
  value: string | undefined;

  /**
   * Decimal separator
   *
   * Default = '.'
   */
  decimalSeparator?: string;

  /**
   * Group separator
   *
   * Default = ','
   */
  groupSeparator?: string;

  /**
   * Turn off separators
   *
   * This will override Group separators
   *
   * Default = false
   */
  disableGroupSeparators?: boolean;

  /**
   * Intl locale currency config
   */
  intlConfig?: IntlConfig;

  /**
   * Specify decimal scale for padding/trimming
   *
   * Eg. 1.5 -> 1.50 or 1.234 -> 1.23
   */
  decimalScale?: number;

  /**
   * Prefix
   */
  prefix?: string;

  /**
   * Suffix
   */
  suffix?: string;
};

/**
 * Format value with decimal separator, group separator and prefix
 */
export const formatValue = (options: FormatValueOptions): string => {
  const {
    value: _value,
    decimalSeparator,
    intlConfig,
    decimalScale,
    prefix = '',
    suffix = '',
    groupSeparator = ',',
  } = options;

  if (_value === '' || _value === undefined) {
    return '';
  }

  if (_value === '-') {
    return '-';
  }

  const isNegative = new RegExp(`^\\d?-${prefix ? `${escapeRegExp(prefix)}?` : ''}\\d`).test(
    _value
  );

  let value =
    decimalSeparator !== '.'
      ? replaceDecimalSeparator(_value, decimalSeparator, isNegative)
      : _value;

  if (
    decimalSeparator &&
    decimalSeparator !== '-' &&
    value.startsWith(decimalSeparator) &&
    !value.includes('.')
  ) {
    value = '0' + value;
  }

  const defaultNumberFormatOptions = {
    minimumFractionDigits: decimalScale || 0,
    maximumFractionDigits: 20,
  };

  const numberFormatter = intlConfig
    ? new Intl.NumberFormat(
        intlConfig.locale,
        intlConfig.currency
          ? {
              ...defaultNumberFormatOptions,
              style: 'currency',
              currency: intlConfig.currency,
            }
          : defaultNumberFormatOptions
      )
    : new Intl.NumberFormat(undefined, defaultNumberFormatOptions);

  let parts: Intl.NumberFormatPart[];

  if (value.includes('.')) {
    const [integerPart, decimalPart] = value.split('.');
    const integerBig = BigInt(integerPart);
    parts = numberFormatter.formatToParts(integerBig);
    parts.push({ type: 'decimal', value: decimalSeparator || '.' });
    parts.push({ type: 'fraction', value: decimalPart });
  } else {
    const bigIntValue = BigInt(value);
    parts = numberFormatter.formatToParts(bigIntValue);
  }

  let formatted = replaceParts(parts, options);

  // Does intl formatting add a suffix?
  const intlSuffix = getSuffix(formatted, { ...options });

  // Include decimal separator if user input ends with decimal separator
  const includeDecimalSeparator =
    _value.slice(-1) === decimalSeparator && !formatted.endsWith(decimalSeparator)
      ? decimalSeparator
      : '';

  const [, decimals] =
    value
      .replace(new RegExp(escapeRegExp(groupSeparator), 'g'), '')
      .match(RegExp('\\d+\\.(\\d+)')) || [];

  if (
    decimalScale !== undefined &&
    decimals &&
    decimalSeparator &&
    formatted.includes(decimalSeparator)
  ) {
    formatted = formatted.replace(
      RegExp(`(\\d+)(${escapeRegExp(decimalSeparator)})(\\d+)`, 'g'),
      `$1$2${decimals.slice(0, decimalScale)}`
    );
  }

  if (suffix && includeDecimalSeparator) {
    return `${formatted}${includeDecimalSeparator}${suffix}`;
  }

  if (intlSuffix && includeDecimalSeparator) {
    return formatted.replace(intlSuffix, `${includeDecimalSeparator}${intlSuffix}`);
  }

  if (intlSuffix && suffix) {
    return formatted.replace(intlSuffix, `${includeDecimalSeparator}${suffix}`);
  }

  return [formatted, includeDecimalSeparator, suffix].join('');
};

/**
 * Before converting to Number, decimal separator has to be .
 */
const replaceDecimalSeparator = (
  value: string,
  decimalSeparator: FormatValueOptions['decimalSeparator'],
  isNegative: boolean
): string => {
  let newValue = value;
  if (decimalSeparator && decimalSeparator !== '.') {
    newValue = newValue.replace(RegExp(escapeRegExp(decimalSeparator), 'g'), '.');
    if (isNegative && decimalSeparator === '-') {
      newValue = `-${newValue.slice(1)}`;
    }
  }
  return newValue;
};

const replaceParts = (
  parts: Intl.NumberFormatPart[],
  {
    prefix,
    groupSeparator,
    decimalSeparator,
    decimalScale,
    disableGroupSeparators = false,
  }: Pick<
    FormatValueOptions,
    'prefix' | 'groupSeparator' | 'decimalSeparator' | 'decimalScale' | 'disableGroupSeparators'
  >
): string => {
  return parts
    .reduce(
      (prev, { type, value }, i) => {
        if (i === 0 && prefix) {
          if (type === 'minusSign') {
            return [value, prefix];
          }

          if (type === 'currency') {
            return [...prev, prefix];
          }

          return [prefix, value];
        }

        if (type === 'currency') {
          return prefix ? prev : [...prev, value];
        }

        if (type === 'group') {
          return !disableGroupSeparators
            ? [...prev, groupSeparator !== undefined ? groupSeparator : value]
            : prev;
        }

        if (type === 'decimal') {
          if (decimalScale !== undefined && decimalScale === 0) {
            return prev;
          }

          return [...prev, decimalSeparator !== undefined ? decimalSeparator : value];
        }

        if (type === 'fraction') {
          return [...prev, decimalScale !== undefined ? value.slice(0, decimalScale) : value];
        }

        return [...prev, value];
      },
      ['']
    )
    .join('');
};
