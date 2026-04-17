export interface Team {
  id: string;
  name: string;
  flag: string;
  group: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  group: string;
  stadium?: string;
  matchday?: number;
  status?: string;
  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
}

export interface Prediction {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface GroupStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}
