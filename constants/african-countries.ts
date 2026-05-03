export type AfricanCountry = {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
  phoneNumberLengths: number[];
};

export const africanCountries: AfricanCountry[] = [
  { code: 'DZ', dialCode: '+213', flag: '🇩🇿', name: 'Algeria', phoneNumberLengths: [9] },
  { code: 'AO', dialCode: '+244', flag: '🇦🇴', name: 'Angola', phoneNumberLengths: [9] },
  { code: 'BJ', dialCode: '+229', flag: '🇧🇯', name: 'Benin', phoneNumberLengths: [8] },
  { code: 'BW', dialCode: '+267', flag: '🇧🇼', name: 'Botswana', phoneNumberLengths: [8] },
  { code: 'BF', dialCode: '+226', flag: '🇧🇫', name: 'Burkina Faso', phoneNumberLengths: [8] },
  { code: 'BI', dialCode: '+257', flag: '🇧🇮', name: 'Burundi', phoneNumberLengths: [8] },
  { code: 'CV', dialCode: '+238', flag: '🇨🇻', name: 'Cabo Verde', phoneNumberLengths: [7] },
  { code: 'CM', dialCode: '+237', flag: '🇨🇲', name: 'Cameroon', phoneNumberLengths: [9] },
  { code: 'CF', dialCode: '+236', flag: '🇨🇫', name: 'Central African Republic', phoneNumberLengths: [8] },
  { code: 'TD', dialCode: '+235', flag: '🇹🇩', name: 'Chad', phoneNumberLengths: [8] },
  { code: 'KM', dialCode: '+269', flag: '🇰🇲', name: 'Comoros', phoneNumberLengths: [7] },
  { code: 'CD', dialCode: '+243', flag: '🇨🇩', name: 'Democratic Republic of the Congo', phoneNumberLengths: [9] },
  { code: 'CG', dialCode: '+242', flag: '🇨🇬', name: 'Republic of the Congo', phoneNumberLengths: [9] },
  { code: 'CI', dialCode: '+225', flag: '🇨🇮', name: "Cote d'Ivoire", phoneNumberLengths: [10] },
  { code: 'DJ', dialCode: '+253', flag: '🇩🇯', name: 'Djibouti', phoneNumberLengths: [8] },
  { code: 'EG', dialCode: '+20', flag: '🇪🇬', name: 'Egypt', phoneNumberLengths: [10] },
  { code: 'GQ', dialCode: '+240', flag: '🇬🇶', name: 'Equatorial Guinea', phoneNumberLengths: [9] },
  { code: 'ER', dialCode: '+291', flag: '🇪🇷', name: 'Eritrea', phoneNumberLengths: [7] },
  { code: 'SZ', dialCode: '+268', flag: '🇸🇿', name: 'Eswatini', phoneNumberLengths: [8] },
  { code: 'ET', dialCode: '+251', flag: '🇪🇹', name: 'Ethiopia', phoneNumberLengths: [9] },
  { code: 'GA', dialCode: '+241', flag: '🇬🇦', name: 'Gabon', phoneNumberLengths: [8] },
  { code: 'GM', dialCode: '+220', flag: '🇬🇲', name: 'Gambia', phoneNumberLengths: [7] },
  { code: 'GH', dialCode: '+233', flag: '🇬🇭', name: 'Ghana', phoneNumberLengths: [9] },
  { code: 'GN', dialCode: '+224', flag: '🇬🇳', name: 'Guinea', phoneNumberLengths: [9] },
  { code: 'GW', dialCode: '+245', flag: '🇬🇼', name: 'Guinea-Bissau', phoneNumberLengths: [7] },
  { code: 'KE', dialCode: '+254', flag: '🇰🇪', name: 'Kenya', phoneNumberLengths: [9, 10] },
  { code: 'LS', dialCode: '+266', flag: '🇱🇸', name: 'Lesotho', phoneNumberLengths: [8] },
  { code: 'LR', dialCode: '+231', flag: '🇱🇷', name: 'Liberia', phoneNumberLengths: [8, 9] },
  { code: 'LY', dialCode: '+218', flag: '🇱🇾', name: 'Libya', phoneNumberLengths: [9] },
  { code: 'MG', dialCode: '+261', flag: '🇲🇬', name: 'Madagascar', phoneNumberLengths: [9] },
  { code: 'MW', dialCode: '+265', flag: '🇲🇼', name: 'Malawi', phoneNumberLengths: [9] },
  { code: 'ML', dialCode: '+223', flag: '🇲🇱', name: 'Mali', phoneNumberLengths: [8] },
  { code: 'MR', dialCode: '+222', flag: '🇲🇷', name: 'Mauritania', phoneNumberLengths: [8] },
  { code: 'MU', dialCode: '+230', flag: '🇲🇺', name: 'Mauritius', phoneNumberLengths: [8] },
  { code: 'MA', dialCode: '+212', flag: '🇲🇦', name: 'Morocco', phoneNumberLengths: [9] },
  { code: 'MZ', dialCode: '+258', flag: '🇲🇿', name: 'Mozambique', phoneNumberLengths: [9] },
  { code: 'NA', dialCode: '+264', flag: '🇳🇦', name: 'Namibia', phoneNumberLengths: [9] },
  { code: 'NE', dialCode: '+227', flag: '🇳🇪', name: 'Niger', phoneNumberLengths: [8] },
  { code: 'NG', dialCode: '+234', flag: '🇳🇬', name: 'Nigeria', phoneNumberLengths: [10] },
  { code: 'RW', dialCode: '+250', flag: '🇷🇼', name: 'Rwanda', phoneNumberLengths: [9] },
  { code: 'ST', dialCode: '+239', flag: '🇸🇹', name: 'Sao Tome and Principe', phoneNumberLengths: [7] },
  { code: 'SN', dialCode: '+221', flag: '🇸🇳', name: 'Senegal', phoneNumberLengths: [9] },
  { code: 'SC', dialCode: '+248', flag: '🇸🇨', name: 'Seychelles', phoneNumberLengths: [7] },
  { code: 'SL', dialCode: '+232', flag: '🇸🇱', name: 'Sierra Leone', phoneNumberLengths: [8] },
  { code: 'SO', dialCode: '+252', flag: '🇸🇴', name: 'Somalia', phoneNumberLengths: [8, 9] },
  { code: 'ZA', dialCode: '+27', flag: '🇿🇦', name: 'South Africa', phoneNumberLengths: [9] },
  { code: 'SS', dialCode: '+211', flag: '🇸🇸', name: 'South Sudan', phoneNumberLengths: [9] },
  { code: 'SD', dialCode: '+249', flag: '🇸🇩', name: 'Sudan', phoneNumberLengths: [9] },
  { code: 'TZ', dialCode: '+255', flag: '🇹🇿', name: 'Tanzania', phoneNumberLengths: [9] },
  { code: 'TG', dialCode: '+228', flag: '🇹🇬', name: 'Togo', phoneNumberLengths: [8] },
  { code: 'TN', dialCode: '+216', flag: '🇹🇳', name: 'Tunisia', phoneNumberLengths: [8] },
  { code: 'UG', dialCode: '+256', flag: '🇺🇬', name: 'Uganda', phoneNumberLengths: [9] },
  { code: 'ZM', dialCode: '+260', flag: '🇿🇲', name: 'Zambia', phoneNumberLengths: [9] },
  { code: 'ZW', dialCode: '+263', flag: '🇿🇼', name: 'Zimbabwe', phoneNumberLengths: [9] },
];

export const africanCountryOptions = africanCountries.map((country) => ({
  label: `${country.flag} ${country.name}`,
  value: country.name,
})).sort((left, right) => left.value.localeCompare(right.value));

export const africanDialCodeOptions = africanCountries.map((country) => ({
  label: `${country.flag} ${country.dialCode}`,
  value: country.dialCode,
})).sort(
  (left, right) =>
    Number.parseInt(left.value.replace('+', ''), 10) - Number.parseInt(right.value.replace('+', ''), 10)
);
