export type FixedHoliday = {
  localDate: string;
  name: string;
  region: 'HK';
  source: 'official';
};

export const HK_FIXED_HOLIDAYS_2026: FixedHoliday[] = [
  { localDate: '2026-01-01', name: 'New Year’s Day', region: 'HK', source: 'official' },
  { localDate: '2026-02-17', name: 'Lunar New Year’s Day', region: 'HK', source: 'official' },
  { localDate: '2026-02-18', name: 'Second Day of Lunar New Year', region: 'HK', source: 'official' },
  { localDate: '2026-02-19', name: 'Third Day of Lunar New Year', region: 'HK', source: 'official' },
  { localDate: '2026-04-03', name: 'Good Friday', region: 'HK', source: 'official' },
  { localDate: '2026-04-04', name: 'Day Following Good Friday', region: 'HK', source: 'official' },
  { localDate: '2026-04-06', name: 'Day Following Ching Ming Festival', region: 'HK', source: 'official' },
  { localDate: '2026-04-07', name: 'Day Following Easter Monday', region: 'HK', source: 'official' },
  { localDate: '2026-05-01', name: 'Labour Day', region: 'HK', source: 'official' },
  { localDate: '2026-05-25', name: 'Day Following the Birthday of the Buddha', region: 'HK', source: 'official' },
  { localDate: '2026-06-19', name: 'Tuen Ng Festival', region: 'HK', source: 'official' },
  { localDate: '2026-07-01', name: 'HKSAR Establishment Day', region: 'HK', source: 'official' },
  { localDate: '2026-09-26', name: 'Day Following Chinese Mid-Autumn Festival', region: 'HK', source: 'official' },
  { localDate: '2026-10-01', name: 'National Day', region: 'HK', source: 'official' },
  { localDate: '2026-10-19', name: 'Day Following Chung Yeung Festival', region: 'HK', source: 'official' },
  { localDate: '2026-12-25', name: 'Christmas Day', region: 'HK', source: 'official' },
  { localDate: '2026-12-26', name: 'First Weekday After Christmas Day', region: 'HK', source: 'official' },
];

export function getFixedHoliday(localDate: string) {
  return HK_FIXED_HOLIDAYS_2026.find(item => item.localDate === localDate);
}

export function listUpcomingFixedHolidays(fromLocalDate: string) {
  return HK_FIXED_HOLIDAYS_2026.filter(item => item.localDate >= fromLocalDate);
}
