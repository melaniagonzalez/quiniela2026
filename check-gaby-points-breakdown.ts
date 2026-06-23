import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { MATCHES } from './src/constants';

const app = initializeApp(firebaseConfig as any);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

async function run() {
  const gabyUid = 'p_6G64T_1780779267328'; // GABY
  const gabySnap = await getDocs(collection(db, "users", gabyUid, "predictions"));
  const gabyPreds = gabySnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  const compSnap = await getDoc(doc(db, "competitions", "WC"));
  const dbMatches = compSnap.data()?.matches || [];

  console.log("Analyzing which matches contributed to Gaby's points...");

  // Let's find all matches where Gaby predicted, which are finished, and calculate points for each matchday!
  // Group by matchday or phase
  const matchdays = {};

  dbMatches.forEach(match => {
    const isFinished = ['FINISHED', 'FT', 'AWARDED'].includes(match.status || '') || (new Date(match.date) < new Date());
    if (!isFinished) return;

    const pred = gabyPreds.find(p => p.matchId === match.id);
    if (!pred || pred.homeScore === null || pred.awayScore === null) return;

    const homeRes = match.actualHomeScore;
    const awayRes = match.actualAwayScore;
    if (homeRes === null || awayRes === null) return;

    let points = 0;
    let type = "incorrect";
    if (pred.homeScore === homeRes && pred.awayScore === awayRes) {
      points = 3;
      type = "exact (3pts)";
    } else {
      const predResult = Math.sign(pred.homeScore - pred.awayScore);
      const actualResult = Math.sign(homeRes - awayRes);
      if (predResult === actualResult) {
        points = 1;
        type = "winner (1pt)";
      }
    }

    const matchday = match.matchday || "other";
    if (!matchdays[matchday]) {
      matchdays[matchday] = [];
    }

    matchdays[matchday].push({
      matchId: match.id,
      home: match.homeTeamName,
      away: match.awayTeamName,
      actual: `${homeRes}-${awayRes}`,
      pred: `${pred.homeScore}-${pred.awayScore}`,
      points,
      type,
      date: match.date
    });
  });

  // Now, let's print the matches grouped by matchday and show sub-totals
  let cumulativePoints = 0;
  let cumulativeResults = 0;
  let cumulativeWinners = 0;

  Object.keys(matchdays).sort((a,b) => Number(a) - Number(b)).forEach(matchday => {
    let dayPoints = 0;
    let dayResults = 0;
    let dayWinners = 0;
    console.log(`\nMatchday ${matchday}:`);
    matchdays[matchday].forEach(m => {
      dayPoints += m.points;
      if (m.points === 3) dayResults++;
      if (m.points === 1) dayWinners++;
      console.log(`  - ${m.home} vs ${m.away}: Actual: ${m.actual}, Pred: ${m.pred} -> ${m.type}`);
    });
    cumulativePoints += dayPoints;
    cumulativeResults += dayResults;
    cumulativeWinners += dayWinners;
    console.log(`  Subtotal points for Matchday ${matchday}: ${dayPoints} (Exact: ${dayResults}, Winner: ${dayWinners})`);
    console.log(`  Cumulative points after Matchday ${matchday}: ${cumulativePoints} (Exact: ${cumulativeResults}, Winner: ${cumulativeWinners})`);
  });

  process.exit(0);
}

run().catch(console.error);
