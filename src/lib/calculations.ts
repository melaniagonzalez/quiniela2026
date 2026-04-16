import { Match, Prediction, GroupStanding, Team } from '../types';

export function calculateStandings(teams: Team[], matches: Match[], predictions: Prediction[]): GroupStanding[] {
  const standings: Record<string, GroupStanding> = {};

  teams.forEach(team => {
    standings[team.id] = {
      teamId: team.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    };
  });

  predictions.forEach(pred => {
    if (pred.homeScore === null || pred.awayScore === null) return;

    const match = matches.find(m => m.id === pred.matchId);
    if (!match) return;

    const home = standings[match.homeTeamId];
    const away = standings[match.awayTeamId];

    if (!home || !away) return;

    home.played++;
    away.played++;
    home.gf += pred.homeScore;
    home.ga += pred.awayScore;
    away.gf += pred.awayScore;
    away.ga += pred.homeScore;

    if (pred.homeScore > pred.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (pred.homeScore < pred.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;
  });

  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
}
