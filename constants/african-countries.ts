export type AfricanCountry = {
  code: string;
  currencyCode: string;
  dialCode: string;
  flag: string;
  name: string;
  phoneNumberLengths: number[];
};

export const africanCountries: AfricanCountry[] = [
  { code: 'DZ', currencyCode: 'DZD', dialCode: '+213', flag: '🇩🇿', name: 'Algeria', phoneNumberLengths: [9] },
  { code: 'AO', currencyCode: 'AOA', dialCode: '+244', flag: '🇦🇴', name: 'Angola', phoneNumberLengths: [9] },
  { code: 'BJ', currencyCode: 'XOF', dialCode: '+229', flag: '🇧🇯', name: 'Benin', phoneNumberLengths: [8] },
  { code: 'BW', currencyCode: 'BWP', dialCode: '+267', flag: '🇧🇼', name: 'Botswana', phoneNumberLengths: [8] },
  { code: 'BF', currencyCode: 'XOF', dialCode: '+226', flag: '🇧🇫', name: 'Burkina Faso', phoneNumberLengths: [8] },
  { code: 'BI', currencyCode: 'BIF', dialCode: '+257', flag: '🇧🇮', name: 'Burundi', phoneNumberLengths: [8] },
  { code: 'CV', currencyCode: 'CVE', dialCode: '+238', flag: '🇨🇻', name: 'Cabo Verde', phoneNumberLengths: [7] },
  { code: 'CM', currencyCode: 'XAF', dialCode: '+237', flag: '🇨🇲', name: 'Cameroon', phoneNumberLengths: [9] },
  { code: 'CF', currencyCode: 'XAF', dialCode: '+236', flag: '🇨🇫', name: 'Central African Republic', phoneNumberLengths: [8] },
  { code: 'TD', currencyCode: 'XAF', dialCode: '+235', flag: '🇹🇩', name: 'Chad', phoneNumberLengths: [8] },
  { code: 'KM', currencyCode: 'KMF', dialCode: '+269', flag: '🇰🇲', name: 'Comoros', phoneNumberLengths: [7] },
  { code: 'CD', currencyCode: 'CDF', dialCode: '+243', flag: '🇨🇩', name: 'Democratic Republic of the Congo', phoneNumberLengths: [9] },
  { code: 'CG', currencyCode: 'XAF', dialCode: '+242', flag: '🇨🇬', name: 'Republic of the Congo', phoneNumberLengths: [9] },
  { code: 'CI', currencyCode: 'XOF', dialCode: '+225', flag: '🇨🇮', name: "Cote d'Ivoire", phoneNumberLengths: [10] },
  { code: 'DJ', currencyCode: 'DJF', dialCode: '+253', flag: '🇩🇯', name: 'Djibouti', phoneNumberLengths: [8] },
  { code: 'EG', currencyCode: 'EGP', dialCode: '+20', flag: '🇪🇬', name: 'Egypt', phoneNumberLengths: [10] },
  { code: 'GQ', currencyCode: 'XAF', dialCode: '+240', flag: '🇬🇶', name: 'Equatorial Guinea', phoneNumberLengths: [9] },
  { code: 'ER', currencyCode: 'ERN', dialCode: '+291', flag: '🇪🇷', name: 'Eritrea', phoneNumberLengths: [7] },
  { code: 'SZ', currencyCode: 'SZL', dialCode: '+268', flag: '🇸🇿', name: 'Eswatini', phoneNumberLengths: [8] },
  { code: 'ET', currencyCode: 'ETB', dialCode: '+251', flag: '🇪🇹', name: 'Ethiopia', phoneNumberLengths: [9] },
  { code: 'GA', currencyCode: 'XAF', dialCode: '+241', flag: '🇬🇦', name: 'Gabon', phoneNumberLengths: [8] },
  { code: 'GM', currencyCode: 'GMD', dialCode: '+220', flag: '🇬🇲', name: 'Gambia', phoneNumberLengths: [7] },
  { code: 'GH', currencyCode: 'GHS', dialCode: '+233', flag: '🇬🇭', name: 'Ghana', phoneNumberLengths: [9] },
  { code: 'GN', currencyCode: 'GNF', dialCode: '+224', flag: '🇬🇳', name: 'Guinea', phoneNumberLengths: [9] },
  { code: 'GW', currencyCode: 'XOF', dialCode: '+245', flag: '🇬🇼', name: 'Guinea-Bissau', phoneNumberLengths: [7] },
  { code: 'KE', currencyCode: 'KES', dialCode: '+254', flag: '🇰🇪', name: 'Kenya', phoneNumberLengths: [9, 10] },
  { code: 'LS', currencyCode: 'LSL', dialCode: '+266', flag: '🇱🇸', name: 'Lesotho', phoneNumberLengths: [8] },
  { code: 'LR', currencyCode: 'LRD', dialCode: '+231', flag: '🇱🇷', name: 'Liberia', phoneNumberLengths: [8, 9] },
  { code: 'LY', currencyCode: 'LYD', dialCode: '+218', flag: '🇱🇾', name: 'Libya', phoneNumberLengths: [9] },
  { code: 'MG', currencyCode: 'MGA', dialCode: '+261', flag: '🇲🇬', name: 'Madagascar', phoneNumberLengths: [9] },
  { code: 'MW', currencyCode: 'MWK', dialCode: '+265', flag: '🇲🇼', name: 'Malawi', phoneNumberLengths: [9] },
  { code: 'ML', currencyCode: 'XOF', dialCode: '+223', flag: '🇲🇱', name: 'Mali', phoneNumberLengths: [8] },
  { code: 'MR', currencyCode: 'MRU', dialCode: '+222', flag: '🇲🇷', name: 'Mauritania', phoneNumberLengths: [8] },
  { code: 'MU', currencyCode: 'MUR', dialCode: '+230', flag: '🇲🇺', name: 'Mauritius', phoneNumberLengths: [8] },
  { code: 'MA', currencyCode: 'MAD', dialCode: '+212', flag: '🇲🇦', name: 'Morocco', phoneNumberLengths: [9] },
  { code: 'MZ', currencyCode: 'MZN', dialCode: '+258', flag: '🇲🇿', name: 'Mozambique', phoneNumberLengths: [9] },
  { code: 'NA', currencyCode: 'NAD', dialCode: '+264', flag: '🇳🇦', name: 'Namibia', phoneNumberLengths: [9] },
  { code: 'NE', currencyCode: 'XOF', dialCode: '+227', flag: '🇳🇪', name: 'Niger', phoneNumberLengths: [8] },
  { code: 'NG', currencyCode: 'NGN', dialCode: '+234', flag: '🇳🇬', name: 'Nigeria', phoneNumberLengths: [10] },
  { code: 'RW', currencyCode: 'RWF', dialCode: '+250', flag: '🇷🇼', name: 'Rwanda', phoneNumberLengths: [9] },
  { code: 'ST', currencyCode: 'STN', dialCode: '+239', flag: '🇸🇹', name: 'Sao Tome and Principe', phoneNumberLengths: [7] },
  { code: 'SN', currencyCode: 'XOF', dialCode: '+221', flag: '🇸🇳', name: 'Senegal', phoneNumberLengths: [9] },
  { code: 'SC', currencyCode: 'SCR', dialCode: '+248', flag: '🇸🇨', name: 'Seychelles', phoneNumberLengths: [7] },
  { code: 'SL', currencyCode: 'SLE', dialCode: '+232', flag: '🇸🇱', name: 'Sierra Leone', phoneNumberLengths: [8] },
  { code: 'SO', currencyCode: 'SOS', dialCode: '+252', flag: '🇸🇴', name: 'Somalia', phoneNumberLengths: [8, 9] },
  { code: 'ZA', currencyCode: 'ZAR', dialCode: '+27', flag: '🇿🇦', name: 'South Africa', phoneNumberLengths: [9] },
  { code: 'SS', currencyCode: 'SSP', dialCode: '+211', flag: '🇸🇸', name: 'South Sudan', phoneNumberLengths: [9] },
  { code: 'SD', currencyCode: 'SDG', dialCode: '+249', flag: '🇸🇩', name: 'Sudan', phoneNumberLengths: [9] },
  { code: 'TZ', currencyCode: 'TZS', dialCode: '+255', flag: '🇹🇿', name: 'Tanzania', phoneNumberLengths: [9] },
  { code: 'TG', currencyCode: 'XOF', dialCode: '+228', flag: '🇹🇬', name: 'Togo', phoneNumberLengths: [8] },
  { code: 'TN', currencyCode: 'TND', dialCode: '+216', flag: '🇹🇳', name: 'Tunisia', phoneNumberLengths: [8] },
  { code: 'UG', currencyCode: 'UGX', dialCode: '+256', flag: '🇺🇬', name: 'Uganda', phoneNumberLengths: [9] },
  { code: 'ZM', currencyCode: 'ZMW', dialCode: '+260', flag: '🇿🇲', name: 'Zambia', phoneNumberLengths: [9] },
  { code: 'ZW', currencyCode: 'USD', dialCode: '+263', flag: '🇿🇼', name: 'Zimbabwe', phoneNumberLengths: [9] },
];

export const africanCountryOptions = africanCountries
  .map((country) => ({
    label: `${country.flag} ${country.name}`,
    value: country.name,
  }))
  .sort((left, right) => left.value.localeCompare(right.value));

export const africanDialCodeOptions = africanCountries
  .map((country) => ({
    label: `${country.flag} ${country.dialCode}`,
    value: country.dialCode,
  }))
  .sort(
    (left, right) =>
      Number.parseInt(left.value.replace('+', ''), 10) -
      Number.parseInt(right.value.replace('+', ''), 10)
  );
