// Country calling codes, used by the dialer to work out which country a typed
// international number belongs to, and to let people pick a default country.
// [ISO 3166-1 alpha-2 (lowercase), calling code digits, English name].
// Where several countries share a code (+1, +7) the first entry is the one
// shown by default; longer codes (e.g. +1242 Bahamas) win when typed.
export const CALLING_CODES: [string, string, string][] = [
  ["us", "1", "United States"],
  ["ca", "1", "Canada"],
  ["ru", "7", "Russia"],
  ["kz", "7", "Kazakhstan"],
  ["eg", "20", "Egypt"],
  ["za", "27", "South Africa"],
  ["gr", "30", "Greece"],
  ["nl", "31", "Netherlands"],
  ["be", "32", "Belgium"],
  ["fr", "33", "France"],
  ["es", "34", "Spain"],
  ["hu", "36", "Hungary"],
  ["it", "39", "Italy"],
  ["ro", "40", "Romania"],
  ["ch", "41", "Switzerland"],
  ["at", "43", "Austria"],
  ["gb", "44", "United Kingdom"],
  ["dk", "45", "Denmark"],
  ["se", "46", "Sweden"],
  ["no", "47", "Norway"],
  ["pl", "48", "Poland"],
  ["de", "49", "Germany"],
  ["pe", "51", "Peru"],
  ["mx", "52", "Mexico"],
  ["cu", "53", "Cuba"],
  ["ar", "54", "Argentina"],
  ["br", "55", "Brazil"],
  ["cl", "56", "Chile"],
  ["co", "57", "Colombia"],
  ["ve", "58", "Venezuela"],
  ["my", "60", "Malaysia"],
  ["au", "61", "Australia"],
  ["id", "62", "Indonesia"],
  ["ph", "63", "Philippines"],
  ["nz", "64", "New Zealand"],
  ["sg", "65", "Singapore"],
  ["th", "66", "Thailand"],
  ["jp", "81", "Japan"],
  ["kr", "82", "South Korea"],
  ["vn", "84", "Vietnam"],
  ["cn", "86", "China"],
  ["tr", "90", "Turkey"],
  ["in", "91", "India"],
  ["pk", "92", "Pakistan"],
  ["af", "93", "Afghanistan"],
  ["lk", "94", "Sri Lanka"],
  ["mm", "95", "Myanmar"],
  ["ir", "98", "Iran"],
  ["ss", "211", "South Sudan"],
  ["ma", "212", "Morocco"],
  ["dz", "213", "Algeria"],
  ["tn", "216", "Tunisia"],
  ["ly", "218", "Libya"],
  ["gm", "220", "Gambia"],
  ["sn", "221", "Senegal"],
  ["mr", "222", "Mauritania"],
  ["ml", "223", "Mali"],
  ["gn", "224", "Guinea"],
  ["ci", "225", "Côte d'Ivoire"],
  ["bf", "226", "Burkina Faso"],
  ["ne", "227", "Niger"],
  ["tg", "228", "Togo"],
  ["bj", "229", "Benin"],
  ["mu", "230", "Mauritius"],
  ["lr", "231", "Liberia"],
  ["sl", "232", "Sierra Leone"],
  ["gh", "233", "Ghana"],
  ["ng", "234", "Nigeria"],
  ["td", "235", "Chad"],
  ["cf", "236", "Central African Republic"],
  ["cm", "237", "Cameroon"],
  ["cv", "238", "Cape Verde"],
  ["st", "239", "São Tomé and Príncipe"],
  ["gq", "240", "Equatorial Guinea"],
  ["ga", "241", "Gabon"],
  ["cg", "242", "Congo"],
  ["cd", "243", "DR Congo"],
  ["ao", "244", "Angola"],
  ["gw", "245", "Guinea-Bissau"],
  ["sc", "248", "Seychelles"],
  ["sd", "249", "Sudan"],
  ["rw", "250", "Rwanda"],
  ["et", "251", "Ethiopia"],
  ["so", "252", "Somalia"],
  ["dj", "253", "Djibouti"],
  ["ke", "254", "Kenya"],
  ["tz", "255", "Tanzania"],
  ["ug", "256", "Uganda"],
  ["bi", "257", "Burundi"],
  ["mz", "258", "Mozambique"],
  ["zm", "260", "Zambia"],
  ["mg", "261", "Madagascar"],
  ["re", "262", "Réunion"],
  ["zw", "263", "Zimbabwe"],
  ["na", "264", "Namibia"],
  ["mw", "265", "Malawi"],
  ["ls", "266", "Lesotho"],
  ["bw", "267", "Botswana"],
  ["sz", "268", "Eswatini"],
  ["km", "269", "Comoros"],
  ["er", "291", "Eritrea"],
  ["aw", "297", "Aruba"],
  ["fo", "298", "Faroe Islands"],
  ["gl", "299", "Greenland"],
  ["pt", "351", "Portugal"],
  ["lu", "352", "Luxembourg"],
  ["ie", "353", "Ireland"],
  ["is", "354", "Iceland"],
  ["al", "355", "Albania"],
  ["mt", "356", "Malta"],
  ["cy", "357", "Cyprus"],
  ["fi", "358", "Finland"],
  ["bg", "359", "Bulgaria"],
  ["lt", "370", "Lithuania"],
  ["lv", "371", "Latvia"],
  ["ee", "372", "Estonia"],
  ["md", "373", "Moldova"],
  ["am", "374", "Armenia"],
  ["by", "375", "Belarus"],
  ["ad", "376", "Andorra"],
  ["mc", "377", "Monaco"],
  ["sm", "378", "San Marino"],
  ["ua", "380", "Ukraine"],
  ["rs", "381", "Serbia"],
  ["me", "382", "Montenegro"],
  ["xk", "383", "Kosovo"],
  ["hr", "385", "Croatia"],
  ["si", "386", "Slovenia"],
  ["ba", "387", "Bosnia and Herzegovina"],
  ["mk", "389", "North Macedonia"],
  ["cz", "420", "Czechia"],
  ["sk", "421", "Slovakia"],
  ["li", "423", "Liechtenstein"],
  ["fk", "500", "Falkland Islands"],
  ["bz", "501", "Belize"],
  ["gt", "502", "Guatemala"],
  ["sv", "503", "El Salvador"],
  ["hn", "504", "Honduras"],
  ["ni", "505", "Nicaragua"],
  ["cr", "506", "Costa Rica"],
  ["pa", "507", "Panama"],
  ["ht", "509", "Haiti"],
  ["gp", "590", "Guadeloupe"],
  ["bo", "591", "Bolivia"],
  ["gy", "592", "Guyana"],
  ["ec", "593", "Ecuador"],
  ["gf", "594", "French Guiana"],
  ["py", "595", "Paraguay"],
  ["mq", "596", "Martinique"],
  ["sr", "597", "Suriname"],
  ["uy", "598", "Uruguay"],
  ["cw", "599", "Curaçao"],
  ["tl", "670", "Timor-Leste"],
  ["bn", "673", "Brunei"],
  ["nr", "674", "Nauru"],
  ["pg", "675", "Papua New Guinea"],
  ["to", "676", "Tonga"],
  ["sb", "677", "Solomon Islands"],
  ["vu", "678", "Vanuatu"],
  ["fj", "679", "Fiji"],
  ["pw", "680", "Palau"],
  ["ck", "682", "Cook Islands"],
  ["ws", "685", "Samoa"],
  ["ki", "686", "Kiribati"],
  ["nc", "687", "New Caledonia"],
  ["tv", "688", "Tuvalu"],
  ["pf", "689", "French Polynesia"],
  ["mh", "692", "Marshall Islands"],
  ["fm", "691", "Micronesia"],
  ["kp", "850", "North Korea"],
  ["hk", "852", "Hong Kong"],
  ["mo", "853", "Macau"],
  ["kh", "855", "Cambodia"],
  ["la", "856", "Laos"],
  ["bd", "880", "Bangladesh"],
  ["tw", "886", "Taiwan"],
  ["ps", "970", "Palestine"],
  ["lb", "961", "Lebanon"],
  ["jo", "962", "Jordan"],
  ["sy", "963", "Syria"],
  ["iq", "964", "Iraq"],
  ["kw", "965", "Kuwait"],
  ["sa", "966", "Saudi Arabia"],
  ["ye", "967", "Yemen"],
  ["om", "968", "Oman"],
  ["ae", "971", "United Arab Emirates"],
  ["il", "972", "Israel"],
  ["bh", "973", "Bahrain"],
  ["qa", "974", "Qatar"],
  ["bt", "975", "Bhutan"],
  ["mn", "976", "Mongolia"],
  ["np", "977", "Nepal"],
  ["tj", "992", "Tajikistan"],
  ["tm", "993", "Turkmenistan"],
  ["az", "994", "Azerbaijan"],
  ["ge", "995", "Georgia"],
  ["kg", "996", "Kyrgyzstan"],
  ["uz", "998", "Uzbekistan"],
  ["mv", "960", "Maldives"],
  ["bs", "1242", "Bahamas"],
  ["bb", "1246", "Barbados"],
  ["ai", "1264", "Anguilla"],
  ["ag", "1268", "Antigua and Barbuda"],
  ["vg", "1284", "British Virgin Islands"],
  ["vi", "1340", "U.S. Virgin Islands"],
  ["ky", "1345", "Cayman Islands"],
  ["bm", "1441", "Bermuda"],
  ["gd", "1473", "Grenada"],
  ["tc", "1649", "Turks and Caicos"],
  ["ms", "1664", "Montserrat"],
  ["mp", "1670", "Northern Mariana Islands"],
  ["gu", "1671", "Guam"],
  ["as", "1684", "American Samoa"],
  ["sx", "1721", "Sint Maarten"],
  ["lc", "1758", "Saint Lucia"],
  ["dm", "1767", "Dominica"],
  ["vc", "1784", "Saint Vincent"],
  ["pr", "1787", "Puerto Rico"],
  ["pr", "1939", "Puerto Rico"],
  ["do", "1809", "Dominican Republic"],
  ["do", "1829", "Dominican Republic"],
  ["do", "1849", "Dominican Republic"],
  ["tt", "1868", "Trinidad and Tobago"],
  ["kn", "1869", "Saint Kitts and Nevis"],
  ["jm", "1876", "Jamaica"],
];

export type CallingCountry = { iso: string; code: string; name: string; flag: string };

export function flagEmoji(iso: string): string {
  if (!/^[a-z]{2}$/i.test(iso)) return "🌐";
  return String.fromCodePoint(...iso.toUpperCase().split("").map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

const toCountry = ([iso, code, name]: [string, string, string]): CallingCountry => ({ iso, code, name, flag: flagEmoji(iso) });

const BY_CODE = new Map<string, CallingCountry>();
for (const row of CALLING_CODES) if (!BY_CODE.has(row[1])) BY_CODE.set(row[1], toCountry(row));

// Shared codes where naming just one country would be misleading.
const SHARED_NAME: Record<string, string> = { "1": "United States / Canada", "7": "Russia / Kazakhstan" };

/** One entry per country (first calling code), sorted by name — for the picker. */
export const PICKER_COUNTRIES: CallingCountry[] = (() => {
  const seen = new Set<string>();
  const list: CallingCountry[] = [];
  for (const row of CALLING_CODES) {
    if (seen.has(row[0])) continue;
    seen.add(row[0]);
    list.push(toCountry(row));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
})();

export function countryByIso(iso?: string | null): CallingCountry | null {
  if (!iso) return null;
  const row = CALLING_CODES.find(([code]) => code === iso.toLowerCase());
  return row ? toCountry(row) : null;
}

/**
 * Finds the country for an international number as it is being typed
 * ("+2348…", "002348…"), using the longest matching calling code.
 * Returns null for national-format input or while the code is still unknown.
 */
export function matchCallingCode(input: string): CallingCountry | null {
  const trimmed = String(input ?? "").trim();
  let rest: string;
  if (trimmed.startsWith("+")) rest = trimmed.slice(1);
  else if (trimmed.startsWith("00")) rest = trimmed.slice(2);
  else return null;
  const digits = rest.replace(/\D/g, "");
  for (let len = Math.min(4, digits.length); len >= 1; len--) {
    const hit = BY_CODE.get(digits.slice(0, len));
    if (hit) return SHARED_NAME[hit.code] ? { ...hit, name: SHARED_NAME[hit.code] } : hit;
  }
  return null;
}
