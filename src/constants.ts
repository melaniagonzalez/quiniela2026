import { Team, Match } from './types';

export const TEAMS: Team[] = [
  // Group A
  { id: 'usa', name: 'Estados Unidos', flag: '🇺🇸', group: 'A' },
  { id: 'mex', name: 'México', flag: '🇲🇽', group: 'A' },
  { id: 'can', name: 'Canadá', flag: '🇨🇦', group: 'A' },
  { id: 'pan', name: 'Panamá', flag: '🇵🇦', group: 'A' },
  
  // Group B
  { id: 'arg', name: 'Argentina', flag: '🇦🇷', group: 'B' },
  { id: 'bra', name: 'Brasil', flag: '🇧🇷', group: 'B' },
  { id: 'uru', name: 'Uruguay', flag: '🇺🇾', group: 'B' },
  { id: 'col', name: 'Colombia', flag: '🇨🇴', group: 'B' },

  // Group C
  { id: 'fra', name: 'Francia', flag: '🇫🇷', group: 'C' },
  { id: 'esp', name: 'España', flag: '🇪🇸', group: 'C' },
  { id: 'eng', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'C' },
  { id: 'ger', name: 'Alemania', flag: '🇩🇪', group: 'C' },

  // Group D
  { id: 'jpn', name: 'Japón', flag: '🇯🇵', group: 'D' },
  { id: 'kor', name: 'Corea del Sur', flag: '🇰🇷', group: 'D' },
  { id: 'aus', name: 'Australia', flag: '🇦🇺', group: 'D' },
  { id: 'sau', name: 'Arabia Saudita', flag: '🇸🇦', group: 'D' },

  // Group E
  { id: 'ita', name: 'Italia', flag: '🇮🇹', group: 'E' },
  { id: 'ned', name: 'Países Bajos', flag: '🇳🇱', group: 'E' },
  { id: 'bel', name: 'Bélgica', flag: '🇧🇪', group: 'E' },
  { id: 'cro', name: 'Croacia', flag: '🇭🇷', group: 'E' },

  // Group F
  { id: 'mar', name: 'Marruecos', flag: '🇲🇦', group: 'F' },
  { id: 'por', name: 'Portugal', flag: '🇵🇹', group: 'F' },
  { id: 'swi', name: 'Suiza', flag: '🇨🇭', group: 'F' },
  { id: 'den', name: 'Dinamarca', flag: '🇩🇰', group: 'F' },

  // Group G
  { id: 'sen', name: 'Senegal', flag: '🇸🇳', group: 'G' },
  { id: 'ecu', name: 'Ecuador', flag: '🇪🇨', group: 'G' },
  { id: 'nig', name: 'Nigeria', flag: '🇳🇬', group: 'G' },
  { id: 'egy', name: 'Egipto', flag: '🇪🇬', group: 'G' },

  // Group H
  { id: 'chi', name: 'Chile', flag: '🇨🇱', group: 'H' },
  { id: 'per', name: 'Perú', flag: '🇵🇪', group: 'H' },
  { id: 'par', name: 'Paraguay', flag: '🇵🇾', group: 'H' },
  { id: 'ven', name: 'Venezuela', flag: '🇻🇪', group: 'H' },
];

export const MATCHES: Match[] = [
  // Jornada 1 (16 partidos)
  { id: 'm1', homeTeamId: 'usa', awayTeamId: 'mex', date: '2026-06-11T18:00:00Z', group: 'A', stadium: 'Azteca', matchday: 1 },
  { id: 'm2', homeTeamId: 'can', awayTeamId: 'pan', date: '2026-06-11T20:00:00Z', group: 'A', stadium: 'BC Place', matchday: 1 },
  { id: 'm5', homeTeamId: 'arg', awayTeamId: 'bra', date: '2026-06-12T18:00:00Z', group: 'B', stadium: 'Hard Rock Stadium', matchday: 1 },
  { id: 'm6', homeTeamId: 'uru', awayTeamId: 'col', date: '2026-06-12T20:00:00Z', group: 'B', stadium: 'Mercedes-Benz Stadium', matchday: 1 },
  { id: 'm9', homeTeamId: 'fra', awayTeamId: 'esp', date: '2026-06-13T18:00:00Z', group: 'C', stadium: 'MetLife Stadium', matchday: 1 },
  { id: 'm10', homeTeamId: 'eng', awayTeamId: 'ger', date: '2026-06-13T20:00:00Z', group: 'C', stadium: 'SoFi Stadium', matchday: 1 },
  { id: 'm13', homeTeamId: 'jpn', awayTeamId: 'kor', date: '2026-06-14T18:00:00Z', group: 'D', stadium: 'AT&T Stadium', matchday: 1 },
  { id: 'm14', homeTeamId: 'aus', awayTeamId: 'sau', date: '2026-06-14T20:00:00Z', group: 'D', stadium: 'NRG Stadium', matchday: 1 },
  { id: 'm17', homeTeamId: 'ita', awayTeamId: 'ned', date: '2026-06-15T18:00:00Z', group: 'E', stadium: 'Levi\'s Stadium', matchday: 1 },
  { id: 'm18', homeTeamId: 'bel', awayTeamId: 'cro', date: '2026-06-15T20:00:00Z', group: 'E', stadium: 'Lumen Field', matchday: 1 },
  { id: 'm21', homeTeamId: 'mar', awayTeamId: 'por', date: '2026-06-16T18:00:00Z', group: 'F', stadium: 'Lincoln Financial Field', matchday: 1 },
  { id: 'm22', homeTeamId: 'swi', awayTeamId: 'den', date: '2026-06-16T20:00:00Z', group: 'F', stadium: 'Gillette Stadium', matchday: 1 },
  { id: 'm25', homeTeamId: 'sen', awayTeamId: 'ecu', date: '2026-06-17T18:00:00Z', group: 'G', stadium: 'Arrowhead Stadium', matchday: 1 },
  { id: 'm26', homeTeamId: 'nig', awayTeamId: 'egy', date: '2026-06-17T20:00:00Z', group: 'G', stadium: 'Bank of America Stadium', matchday: 1 },
  { id: 'm29', homeTeamId: 'chi', awayTeamId: 'per', date: '2026-06-18T18:00:00Z', group: 'H', stadium: 'MetLife Stadium', matchday: 1 },
  { id: 'm30', homeTeamId: 'par', awayTeamId: 'ven', date: '2026-06-18T20:00:00Z', group: 'H', stadium: 'Hard Rock Stadium', matchday: 1 },

  // Jornada 2 (16 partidos)
  { id: 'm3', homeTeamId: 'usa', awayTeamId: 'can', date: '2026-06-20T18:00:00Z', group: 'A', stadium: 'SoFi Stadium', matchday: 2 },
  { id: 'm4', homeTeamId: 'mex', awayTeamId: 'pan', date: '2026-06-20T20:00:00Z', group: 'A', stadium: 'MetLife Stadium', matchday: 2 },
  { id: 'm7', homeTeamId: 'arg', awayTeamId: 'uru', date: '2026-06-21T18:00:00Z', group: 'B', stadium: 'AT&T Stadium', matchday: 2 },
  { id: 'm8', homeTeamId: 'bra', awayTeamId: 'col', date: '2026-06-21T20:00:00Z', group: 'B', stadium: 'NRG Stadium', matchday: 2 },
  { id: 'm11', homeTeamId: 'fra', awayTeamId: 'eng', date: '2026-06-22T18:00:00Z', group: 'C', stadium: 'Hard Rock Stadium', matchday: 2 },
  { id: 'm12', homeTeamId: 'esp', awayTeamId: 'ger', date: '2026-06-22T20:00:00Z', group: 'C', stadium: 'Mercedes-Benz Stadium', matchday: 2 },
  { id: 'm15', homeTeamId: 'jpn', awayTeamId: 'aus', date: '2026-06-23T18:00:00Z', group: 'D', stadium: 'Levi\'s Stadium', matchday: 2 },
  { id: 'm16', homeTeamId: 'kor', awayTeamId: 'sau', date: '2026-06-23T20:00:00Z', group: 'D', stadium: 'Lumen Field', matchday: 2 },
  { id: 'm19', homeTeamId: 'ita', awayTeamId: 'bel', date: '2026-06-24T18:00:00Z', group: 'E', stadium: 'Lincoln Financial Field', matchday: 2 },
  { id: 'm20', homeTeamId: 'ned', awayTeamId: 'cro', date: '2026-06-24T20:00:00Z', group: 'E', stadium: 'Gillette Stadium', matchday: 2 },
  { id: 'm23', homeTeamId: 'mar', awayTeamId: 'swi', date: '2026-06-25T18:00:00Z', group: 'F', stadium: 'Arrowhead Stadium', matchday: 2 },
  { id: 'm24', homeTeamId: 'por', awayTeamId: 'den', date: '2026-06-25T20:00:00Z', group: 'F', stadium: 'Bank of America Stadium', matchday: 2 },
  { id: 'm27', homeTeamId: 'sen', awayTeamId: 'nig', date: '2026-06-26T18:00:00Z', group: 'G', stadium: 'MetLife Stadium', matchday: 2 },
  { id: 'm28', homeTeamId: 'ecu', awayTeamId: 'egy', date: '2026-06-26T20:00:00Z', group: 'G', stadium: 'Hard Rock Stadium', matchday: 2 },
  { id: 'm31', homeTeamId: 'chi', awayTeamId: 'par', date: '2026-06-27T18:00:00Z', group: 'H', stadium: 'SoFi Stadium', matchday: 2 },
  { id: 'm32', homeTeamId: 'per', awayTeamId: 'ven', date: '2026-06-27T20:00:00Z', group: 'H', stadium: 'MetLife Stadium', matchday: 2 },

  // Jornada 3 (16 partidos)
  { id: 'm33', homeTeamId: 'usa', awayTeamId: 'pan', date: '2026-06-30T18:00:00Z', group: 'A', stadium: 'Azteca', matchday: 3 },
  { id: 'm34', homeTeamId: 'mex', awayTeamId: 'can', date: '2026-06-30T18:00:00Z', group: 'A', stadium: 'BC Place', matchday: 3 },
  { id: 'm35', homeTeamId: 'arg', awayTeamId: 'col', date: '2026-07-01T18:00:00Z', group: 'B', stadium: 'Hard Rock Stadium', matchday: 3 },
  { id: 'm36', homeTeamId: 'bra', awayTeamId: 'uru', date: '2026-07-01T18:00:00Z', group: 'B', stadium: 'Mercedes-Benz Stadium', matchday: 3 },
  { id: 'm37', homeTeamId: 'fra', awayTeamId: 'ger', date: '2026-07-02T18:00:00Z', group: 'C', stadium: 'MetLife Stadium', matchday: 3 },
  { id: 'm38', homeTeamId: 'esp', awayTeamId: 'eng', date: '2026-07-02T18:00:00Z', group: 'C', stadium: 'SoFi Stadium', matchday: 3 },
  { id: 'm39', homeTeamId: 'jpn', awayTeamId: 'sau', date: '2026-07-03T18:00:00Z', group: 'D', stadium: 'AT&T Stadium', matchday: 3 },
  { id: 'm40', homeTeamId: 'kor', awayTeamId: 'aus', date: '2026-07-03T18:00:00Z', group: 'D', stadium: 'NRG Stadium', matchday: 3 },
  { id: 'm41', homeTeamId: 'ita', awayTeamId: 'cro', date: '2026-07-04T18:00:00Z', group: 'E', stadium: 'Levi\'s Stadium', matchday: 3 },
  { id: 'm42', homeTeamId: 'bel', awayTeamId: 'ned', date: '2026-07-04T18:00:00Z', group: 'E', stadium: 'Lumen Field', matchday: 3 },
  { id: 'm43', homeTeamId: 'mar', awayTeamId: 'den', date: '2026-07-05T18:00:00Z', group: 'F', stadium: 'Lincoln Financial Field', matchday: 3 },
  { id: 'm44', homeTeamId: 'por', awayTeamId: 'swi', date: '2026-07-05T18:00:00Z', group: 'F', stadium: 'Gillette Stadium', matchday: 3 },
  { id: 'm45', homeTeamId: 'sen', awayTeamId: 'egy', date: '2026-07-06T18:00:00Z', group: 'G', stadium: 'Arrowhead Stadium', matchday: 3 },
  { id: 'm46', homeTeamId: 'nig', awayTeamId: 'ecu', date: '2026-07-06T18:00:00Z', group: 'G', stadium: 'Bank of America Stadium', matchday: 3 },
  { id: 'm47', homeTeamId: 'chi', awayTeamId: 'ven', date: '2026-07-07T18:00:00Z', group: 'H', stadium: 'MetLife Stadium', matchday: 3 },
  { id: 'm48', homeTeamId: 'per', awayTeamId: 'par', date: '2026-07-07T18:00:00Z', group: 'H', stadium: 'Hard Rock Stadium', matchday: 3 },

  // Eliminatorias (Ejemplos)
  { id: 'm49', homeTeamId: 'usa', awayTeamId: 'bra', date: '2026-07-10T18:00:00Z', group: 'Octavos', stadium: 'Azteca', matchday: 4 },
  { id: 'm50', homeTeamId: 'arg', awayTeamId: 'fra', date: '2026-07-11T18:00:00Z', group: 'Octavos', stadium: 'MetLife Stadium', matchday: 4 },
  { id: 'm51', homeTeamId: 'esp', awayTeamId: 'ita', date: '2026-07-12T18:00:00Z', group: 'Octavos', stadium: 'SoFi Stadium', matchday: 4 },
  { id: 'm52', homeTeamId: 'eng', awayTeamId: 'ned', date: '2026-07-13T18:00:00Z', group: 'Octavos', stadium: 'Hard Rock Stadium', matchday: 4 },
  
  { id: 'm57', homeTeamId: 'usa', awayTeamId: 'arg', date: '2026-07-15T18:00:00Z', group: 'Cuartos', stadium: 'AT&T Stadium', matchday: 5 },
  { id: 'm58', homeTeamId: 'esp', awayTeamId: 'eng', date: '2026-07-16T18:00:00Z', group: 'Cuartos', stadium: 'NRG Stadium', matchday: 5 },

  { id: 'm61', homeTeamId: 'usa', awayTeamId: 'esp', date: '2026-07-19T18:00:00Z', group: 'Semifinal', stadium: 'Mercedes-Benz Stadium', matchday: 6 },
  { id: 'm62', homeTeamId: 'arg', awayTeamId: 'eng', date: '2026-07-20T18:00:00Z', group: 'Semifinal', stadium: 'Hard Rock Stadium', matchday: 6 },

  { id: 'm63', homeTeamId: 'esp', awayTeamId: 'eng', date: '2026-07-23T18:00:00Z', group: 'Tercer Lugar', stadium: 'MetLife Stadium', matchday: 7 },
  { id: 'm64', homeTeamId: 'usa', awayTeamId: 'arg', date: '2026-07-24T18:00:00Z', group: 'Final', stadium: 'MetLife Stadium', matchday: 7 },
];
