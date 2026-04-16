import { Team, Match } from './types';

export const TEAMS_2022: Team[] = [
  { id: 'qatar', name: 'Qatar', flag: '🇶🇦', group: 'A' },
  { id: 'ecuador', name: 'Ecuador', flag: '🇪🇨', group: 'A' },
  { id: 'senegal', name: 'Senegal', flag: '🇸🇳', group: 'A' },
  { id: 'netherlands', name: 'Países Bajos', flag: '🇳🇱', group: 'A' },
  
  { id: 'england', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'B' },
  { id: 'iran', name: 'Irán', flag: '🇮🇷', group: 'B' },
  { id: 'usa', name: 'EE. UU.', flag: '🇺🇸', group: 'B' },
  { id: 'wales', name: 'Gales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', group: 'B' },

  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', group: 'C' },
  { id: 'saudi', name: 'Arabia Saudita', flag: '🇸🇦', group: 'C' },
  { id: 'mexico', name: 'México', flag: '🇲🇽', group: 'C' },
  { id: 'poland', name: 'Polonia', flag: '🇵🇱', group: 'C' },
  { id: 'france', name: 'Francia', flag: '🇫🇷', group: 'D' },
  { id: 'australia', name: 'Australia', flag: '🇦🇺', group: 'D' },
  { id: 'denmark', name: 'Dinamarca', flag: '🇩🇰', group: 'D' },
  { id: 'tunisia', name: 'Túnez', flag: '🇹🇳', group: 'D' },

  { id: 'spain', name: 'España', flag: '🇪🇸', group: 'E' },
  { id: 'germany', name: 'Alemania', flag: '🇩🇪', group: 'E' },
  { id: 'japan', name: 'Japón', flag: '🇯🇵', group: 'E' },
  { id: 'costarica', name: 'Costa Rica', flag: '🇨🇷', group: 'E' },

  { id: 'belgium', name: 'Bélgica', flag: '🇧🇪', group: 'F' },
  { id: 'canada_22', name: 'Canadá', flag: '🇨🇦', group: 'F' },
  { id: 'morocco', name: 'Marruecos', flag: '🇲🇦', group: 'F' },
  { id: 'croatia', name: 'Croacia', flag: '🇭🇷', group: 'F' },

  { id: 'brazil', name: 'Brasil', flag: '🇧🇷', group: 'G' },
  { id: 'serbia', name: 'Serbia', flag: '🇷🇸', group: 'G' },
  { id: 'switzerland', name: 'Suiza', flag: '🇨🇭', group: 'G' },
  { id: 'cameroon', name: 'Camerún', flag: '🇨🇲', group: 'G' },

  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', group: 'H' },
  { id: 'ghana', name: 'Ghana', flag: '🇬🇭', group: 'H' },
  { id: 'uruguay_22', name: 'Uruguay', flag: '🇺🇾', group: 'H' },
  { id: 'south_korea', name: 'Corea del Sur', flag: '🇰🇷', group: 'H' },
];

export const MATCHES_2022: (Match & { actualHomeScore: number, actualAwayScore: number })[] = [
  // Jornada 1
  { id: '2022_m1', homeTeamId: 'qatar', awayTeamId: 'ecuador', date: '2022-11-20T16:00:00Z', group: 'A', stadium: 'Al Bayt', actualHomeScore: 0, actualAwayScore: 2, matchday: 1 },
  { id: '2022_m2', homeTeamId: 'senegal', awayTeamId: 'netherlands', date: '2022-11-21T16:00:00Z', group: 'A', stadium: 'Al Thumama', actualHomeScore: 0, actualAwayScore: 2, matchday: 1 },
  { id: '2022_m5', homeTeamId: 'england', awayTeamId: 'iran', date: '2022-11-21T13:00:00Z', group: 'B', stadium: 'Khalifa International', actualHomeScore: 6, actualAwayScore: 2, matchday: 1 },
  { id: '2022_m6', homeTeamId: 'usa', awayTeamId: 'wales', date: '2022-11-21T19:00:00Z', group: 'B', stadium: 'Ahmad bin Ali', actualHomeScore: 1, actualAwayScore: 1, matchday: 1 },
  { id: '2022_m7', homeTeamId: 'argentina', awayTeamId: 'saudi', date: '2022-11-22T10:00:00Z', group: 'C', stadium: 'Lusail', actualHomeScore: 1, actualAwayScore: 2, matchday: 1 },
  { id: '2022_m8', homeTeamId: 'mexico', awayTeamId: 'poland', date: '2022-11-22T16:00:00Z', group: 'C', stadium: 'Stadium 974', actualHomeScore: 0, actualAwayScore: 0, matchday: 1 },
  { id: '2022_m17', homeTeamId: 'france', awayTeamId: 'australia', date: '2022-11-22T19:00:00Z', group: 'D', stadium: 'Al Janoub', actualHomeScore: 4, actualAwayScore: 1, matchday: 1 },
  { id: '2022_m18', homeTeamId: 'denmark', awayTeamId: 'tunisia', date: '2022-11-22T13:00:00Z', group: 'D', stadium: 'Education City', actualHomeScore: 0, actualAwayScore: 0, matchday: 1 },
  { id: '2022_m19', homeTeamId: 'spain', awayTeamId: 'costarica', date: '2022-11-23T16:00:00Z', group: 'E', stadium: 'Al Thumama', actualHomeScore: 7, actualAwayScore: 0, matchday: 1 },
  { id: '2022_m20', homeTeamId: 'germany', awayTeamId: 'japan', date: '2022-11-23T13:00:00Z', group: 'E', stadium: 'Khalifa International', actualHomeScore: 1, actualAwayScore: 2, matchday: 1 },
  { id: '2022_m21', homeTeamId: 'belgium', awayTeamId: 'canada_22', date: '2022-11-23T19:00:00Z', group: 'F', stadium: 'Ahmad bin Ali', actualHomeScore: 1, actualAwayScore: 0, matchday: 1 },
  { id: '2022_m22', homeTeamId: 'morocco', awayTeamId: 'croatia', date: '2022-11-23T10:00:00Z', group: 'F', stadium: 'Al Bayt', actualHomeScore: 0, actualAwayScore: 0, matchday: 1 },
  { id: '2022_m23', homeTeamId: 'brazil', awayTeamId: 'serbia', date: '2022-11-24T19:00:00Z', group: 'G', stadium: 'Lusail', actualHomeScore: 2, actualAwayScore: 0, matchday: 1 },
  { id: '2022_m24', homeTeamId: 'switzerland', awayTeamId: 'cameroon', date: '2022-11-24T10:00:00Z', group: 'G', stadium: 'Al Janoub', actualHomeScore: 1, actualAwayScore: 0, matchday: 1 },
  { id: '2022_m25', homeTeamId: 'portugal', awayTeamId: 'ghana', date: '2022-11-24T16:00:00Z', group: 'H', stadium: 'Stadium 974', actualHomeScore: 3, actualAwayScore: 2, matchday: 1 },
  { id: '2022_m26', homeTeamId: 'uruguay_22', awayTeamId: 'korea', date: '2022-11-24T13:00:00Z', group: 'H', stadium: 'Education City', actualHomeScore: 0, actualAwayScore: 0, matchday: 1 },
  
  // Jornada 2
  { id: '2022_m3', homeTeamId: 'qatar', awayTeamId: 'senegal', date: '2022-11-25T13:00:00Z', group: 'A', stadium: 'Al Thumama', actualHomeScore: 1, actualAwayScore: 3, matchday: 2 },
  { id: '2022_m4', homeTeamId: 'netherlands', awayTeamId: 'ecuador', date: '2022-11-25T16:00:00Z', group: 'A', stadium: 'Khalifa International', actualHomeScore: 1, actualAwayScore: 1, matchday: 2 },
  { id: '2022_m27', homeTeamId: 'england', awayTeamId: 'usa', date: '2022-11-25T19:00:00Z', group: 'B', stadium: 'Al Bayt', actualHomeScore: 0, actualAwayScore: 0, matchday: 2 },
  { id: '2022_m28', homeTeamId: 'wales', awayTeamId: 'iran', date: '2022-11-25T10:00:00Z', group: 'B', stadium: 'Ahmad bin Ali', actualHomeScore: 0, actualAwayScore: 2, matchday: 2 },
  { id: '2022_m29', homeTeamId: 'argentina', awayTeamId: 'mexico', date: '2022-11-26T19:00:00Z', group: 'C', stadium: 'Lusail', actualHomeScore: 2, actualAwayScore: 0, matchday: 2 },
  { id: '2022_m30', homeTeamId: 'poland', awayTeamId: 'saudi', date: '2022-11-26T13:00:00Z', group: 'C', stadium: 'Education City', actualHomeScore: 2, actualAwayScore: 0, matchday: 2 },
  { id: '2022_m31', homeTeamId: 'france', awayTeamId: 'denmark', date: '2022-11-26T16:00:00Z', group: 'D', stadium: 'Stadium 974', actualHomeScore: 2, actualAwayScore: 1, matchday: 2 },
  { id: '2022_m32', homeTeamId: 'tunisia', awayTeamId: 'australia', date: '2022-11-26T10:00:00Z', group: 'D', stadium: 'Al Janoub', actualHomeScore: 0, actualAwayScore: 1, matchday: 2 },
  { id: '2022_m33', homeTeamId: 'spain', awayTeamId: 'germany', date: '2022-11-27T19:00:00Z', group: 'E', stadium: 'Al Bayt', actualHomeScore: 1, actualAwayScore: 1, matchday: 2 },
  { id: '2022_m34', homeTeamId: 'japan', awayTeamId: 'costarica', date: '2022-11-27T10:00:00Z', group: 'E', stadium: 'Ahmad bin Ali', actualHomeScore: 0, actualAwayScore: 1, matchday: 2 },
  { id: '2022_m35', homeTeamId: 'belgium', awayTeamId: 'morocco', date: '2022-11-27T13:00:00Z', group: 'F', stadium: 'Al Thumama', actualHomeScore: 0, actualAwayScore: 2, matchday: 2 },
  { id: '2022_m36', homeTeamId: 'croatia', awayTeamId: 'canada_22', date: '2022-11-27T16:00:00Z', group: 'F', stadium: 'Khalifa International', actualHomeScore: 4, actualAwayScore: 1, matchday: 2 },
  { id: '2022_m37', homeTeamId: 'brazil', awayTeamId: 'switzerland', date: '2022-11-28T16:00:00Z', group: 'G', stadium: 'Stadium 974', actualHomeScore: 1, actualAwayScore: 0, matchday: 2 },
  { id: '2022_m38', homeTeamId: 'cameroon', awayTeamId: 'serbia', date: '2022-11-28T10:00:00Z', group: 'G', stadium: 'Al Janoub', actualHomeScore: 3, actualAwayScore: 3, matchday: 2 },
  { id: '2022_m39', homeTeamId: 'portugal', awayTeamId: 'uruguay_22', date: '2022-11-28T19:00:00Z', group: 'H', stadium: 'Lusail', actualHomeScore: 2, actualAwayScore: 0, matchday: 2 },
  { id: '2022_m40', homeTeamId: 'south_korea', awayTeamId: 'ghana', date: '2022-11-28T13:00:00Z', group: 'H', stadium: 'Education City', actualHomeScore: 2, actualAwayScore: 3, matchday: 2 },
  
  // Jornada 3
  { id: '2022_m9', homeTeamId: 'ecuador', awayTeamId: 'senegal', date: '2022-11-29T15:00:00Z', group: 'A', stadium: 'Khalifa International', actualHomeScore: 1, actualAwayScore: 2, matchday: 3 },
  { id: '2022_m10', homeTeamId: 'netherlands', awayTeamId: 'qatar', date: '2022-11-29T15:00:00Z', group: 'A', stadium: 'Al Bayt', actualHomeScore: 2, actualAwayScore: 0, matchday: 3 },
  { id: '2022_m41', homeTeamId: 'iran', awayTeamId: 'usa', date: '2022-11-29T19:00:00Z', group: 'B', stadium: 'Al Thumama', actualHomeScore: 0, actualAwayScore: 1, matchday: 3 },
  { id: '2022_m42', homeTeamId: 'wales', awayTeamId: 'england', date: '2022-11-29T19:00:00Z', group: 'B', stadium: 'Ahmad bin Ali', actualHomeScore: 0, actualAwayScore: 3, matchday: 3 },
  { id: '2022_m43', homeTeamId: 'poland', awayTeamId: 'argentina', date: '2022-11-30T19:00:00Z', group: 'C', stadium: 'Stadium 974', actualHomeScore: 0, actualAwayScore: 2, matchday: 3 },
  { id: '2022_m44', homeTeamId: 'saudi', awayTeamId: 'mexico', date: '2022-11-30T19:00:00Z', group: 'C', stadium: 'Lusail', actualHomeScore: 1, actualAwayScore: 2, matchday: 3 },
  { id: '2022_m45', homeTeamId: 'tunisia', awayTeamId: 'france', date: '2022-11-30T15:00:00Z', group: 'D', stadium: 'Education City', actualHomeScore: 1, actualAwayScore: 0, matchday: 3 },
  { id: '2022_m46', homeTeamId: 'australia', awayTeamId: 'denmark', date: '2022-11-30T15:00:00Z', group: 'D', stadium: 'Al Janoub', actualHomeScore: 1, actualAwayScore: 0, matchday: 3 },
  { id: '2022_m47', homeTeamId: 'japan', awayTeamId: 'spain', date: '2022-12-01T19:00:00Z', group: 'E', stadium: 'Khalifa International', actualHomeScore: 2, actualAwayScore: 1, matchday: 3 },
  { id: '2022_m48', homeTeamId: 'costarica', awayTeamId: 'germany', date: '2022-12-01T19:00:00Z', group: 'E', stadium: 'Al Bayt', actualHomeScore: 2, actualAwayScore: 4, matchday: 3 },
  { id: '2022_m49', homeTeamId: 'croatia', awayTeamId: 'belgium', date: '2022-12-01T15:00:00Z', group: 'F', stadium: 'Ahmad bin Ali', actualHomeScore: 0, actualAwayScore: 0, matchday: 3 },
  { id: '2022_m50', homeTeamId: 'canada_22', awayTeamId: 'morocco', date: '2022-12-01T15:00:00Z', group: 'F', stadium: 'Al Thumama', actualHomeScore: 1, actualAwayScore: 2, matchday: 3 },
  { id: '2022_m51', homeTeamId: 'cameroon', awayTeamId: 'brazil', date: '2022-12-02T19:00:00Z', group: 'G', stadium: 'Lusail', actualHomeScore: 1, actualAwayScore: 0, matchday: 3 },
  { id: '2022_m52', homeTeamId: 'serbia', awayTeamId: 'switzerland', date: '2022-12-02T19:00:00Z', group: 'G', stadium: 'Stadium 974', actualHomeScore: 2, actualAwayScore: 3, matchday: 3 },
  { id: '2022_m53', homeTeamId: 'south_korea', awayTeamId: 'portugal', date: '2022-12-02T15:00:00Z', group: 'H', stadium: 'Education City', actualHomeScore: 2, actualAwayScore: 1, matchday: 3 },
  { id: '2022_m54', homeTeamId: 'ghana', awayTeamId: 'uruguay_22', date: '2022-12-02T15:00:00Z', group: 'H', stadium: 'Al Janoub', actualHomeScore: 0, actualAwayScore: 2, matchday: 3 },
  
  // Jornada 4 (Octavos)
  { id: '2022_m11', homeTeamId: 'netherlands', awayTeamId: 'usa', date: '2022-12-03T15:00:00Z', group: 'Octavos', stadium: 'Khalifa International', actualHomeScore: 3, actualAwayScore: 1, matchday: 4 },
  { id: '2022_m12', homeTeamId: 'argentina', awayTeamId: 'australia', date: '2022-12-03T19:00:00Z', group: 'Octavos', stadium: 'Ahmad bin Ali', actualHomeScore: 2, actualAwayScore: 1, matchday: 4 },
  { id: '2022_m55', homeTeamId: 'france', awayTeamId: 'poland', date: '2022-12-04T15:00:00Z', group: 'Octavos', stadium: 'Al Thumama', actualHomeScore: 3, actualAwayScore: 1, matchday: 4 },
  { id: '2022_m56', homeTeamId: 'england', awayTeamId: 'senegal', date: '2022-12-04T19:00:00Z', group: 'Octavos', stadium: 'Al Bayt', actualHomeScore: 3, actualAwayScore: 0, matchday: 4 },
  { id: '2022_m57', homeTeamId: 'japan', awayTeamId: 'croatia', date: '2022-12-05T15:00:00Z', group: 'Octavos', stadium: 'Al Janoub', actualHomeScore: 1, actualAwayScore: 1, matchday: 4 },
  { id: '2022_m58', homeTeamId: 'brazil', awayTeamId: 'south_korea', date: '2022-12-05T19:00:00Z', group: 'Octavos', stadium: 'Stadium 974', actualHomeScore: 4, actualAwayScore: 1, matchday: 4 },
  { id: '2022_m59', homeTeamId: 'morocco', awayTeamId: 'spain', date: '2022-12-06T15:00:00Z', group: 'Octavos', stadium: 'Education City', actualHomeScore: 0, actualAwayScore: 0, matchday: 4 },
  { id: '2022_m60', homeTeamId: 'portugal', awayTeamId: 'switzerland', date: '2022-12-06T19:00:00Z', group: 'Octavos', stadium: 'Lusail', actualHomeScore: 6, actualAwayScore: 1, matchday: 4 },
  
  // Jornada 5 (Cuartos)
  { id: '2022_m13', homeTeamId: 'netherlands', awayTeamId: 'argentina', date: '2022-12-09T19:00:00Z', group: 'Cuartos', stadium: 'Lusail', actualHomeScore: 2, actualAwayScore: 2, matchday: 5 },
  { id: '2022_m14', homeTeamId: 'england', awayTeamId: 'france', date: '2022-12-10T19:00:00Z', group: 'Cuartos', stadium: 'Al Bayt', actualHomeScore: 1, actualAwayScore: 2, matchday: 5 },
  { id: '2022_m61', homeTeamId: 'croatia', awayTeamId: 'brazil', date: '2022-12-09T15:00:00Z', group: 'Cuartos', stadium: 'Education City', actualHomeScore: 1, actualAwayScore: 1, matchday: 5 },
  { id: '2022_m62', homeTeamId: 'morocco', awayTeamId: 'portugal', date: '2022-12-10T15:00:00Z', group: 'Cuartos', stadium: 'Al Thumama', actualHomeScore: 1, actualAwayScore: 0, matchday: 5 },
  
  // Jornada 6 (Semifinal)
  { id: '2022_m15', homeTeamId: 'argentina', awayTeamId: 'croatia', date: '2022-12-13T19:00:00Z', group: 'Semifinal', stadium: 'Lusail', actualHomeScore: 3, actualAwayScore: 0, matchday: 6 },
  { id: '2022_m63', homeTeamId: 'france', awayTeamId: 'morocco', date: '2022-12-14T19:00:00Z', group: 'Semifinal', stadium: 'Al Bayt', actualHomeScore: 2, actualAwayScore: 0, matchday: 6 },
  
  // Jornada 7 (Tercer Lugar + Final)
  { id: '2022_m64', homeTeamId: 'croatia', awayTeamId: 'morocco', date: '2022-12-17T15:00:00Z', group: 'Tercer Lugar', stadium: 'Khalifa International', actualHomeScore: 2, actualAwayScore: 1, matchday: 7 },
  { id: '2022_m16', homeTeamId: 'argentina', awayTeamId: 'france', date: '2022-12-18T15:00:00Z', group: 'Final', stadium: 'Lusail', actualHomeScore: 3, actualAwayScore: 3, matchday: 7 },
];
