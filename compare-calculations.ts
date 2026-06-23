import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { MATCHES } from './src/constants';

const app = initializeApp(firebaseConfig as any);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

function calculatePoints(preds: any[], matches: any[]) {
  let totalPoints = 0;
  let correctResults = 0;
  let correctWinners = 0;

  preds.forEach(pred => {
    const matchId = pred.matchId || pred.id;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    // Check if finished
    const isFinished = ['FINISHED', 'FT', 'AWARDED'].includes(match.status || '') || (new Date(match.date) < new Date());
    if (!isFinished) return;

    const homeRes = match.actualHomeScore;
    const awayRes = match.actualAwayScore;
    if (homeRes === null || awayRes === null) return;

    if (pred.homeScore === homeRes && pred.awayScore === awayRes) {
      totalPoints += 3;
      correctResults++;
    } else {
      const predResult = Math.sign(pred.homeScore - pred.awayScore);
      const actualResult = Math.sign(homeRes - awayRes);
      if (predResult === actualResult) {
        totalPoints += 1;
        correctWinners++;
      }
    }
  });

  return { totalPoints, correctResults, correctWinners };
}

async function run() {
  const compSnap = await getDoc(doc(db, "competitions", "WC"));
  const dbMatches = compSnap.data()?.matches || [];

  const mauUid = 'p_6G64T_1780702913160'; // MAU
  const gabyUid = 'p_6G64T_1780779267328'; // GABY

  const mauSnap = await getDocs(collection(db, "users", mauUid, "predictions"));
  const gabySnap = await getDocs(collection(db, "users", gabyUid, "predictions"));

  const mauPreds = mauSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  const gabyPreds = gabySnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  console.log("--- MAU ---");
  const mauCalcDB = calculatePoints(mauPreds, dbMatches);
  const mauCalcLocal = calculatePoints(mauPreds, MATCHES);
  console.log(`Using DB Matches (46 finished):`);
  console.log(`  Points: ${mauCalcDB.totalPoints}, Results: ${mauCalcDB.correctResults}, Winners: ${mauCalcDB.correctWinners}`);
  console.log(`Using Local MATCHES constants:`);
  console.log(`  Points: ${mauCalcLocal.totalPoints}, Results: ${mauCalcLocal.correctResults}, Winners: ${mauCalcLocal.correctWinners}`);

  console.log("\n--- GABY ---");
  const gabyCalcDB = calculatePoints(gabyPreds, dbMatches);
  const gabyCalcLocal = calculatePoints(gabyPreds, MATCHES);
  console.log(`Using DB Matches (46 finished):`);
  console.log(`  Points: ${gabyCalcDB.totalPoints}, Results: ${gabyCalcDB.correctResults}, Winners: ${gabyCalcDB.correctWinners}`);
  console.log(`Using Local MATCHES constants:`);
  console.log(`  Points: ${gabyCalcLocal.totalPoints}, Results: ${gabyCalcLocal.localScore !== undefined ? '?' : gabyCalcLocal.totalPoints}, Results: ${gabyCalcLocal.correctResults}, Winners: ${gabyCalcLocal.correctWinners}`);

  process.exit(0);
}

run().catch(console.error);
