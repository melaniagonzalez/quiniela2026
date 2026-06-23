import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig as any);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

async function run() {
  const mauUid = 'p_6G64T_1780702913160'; // MAU
  const gabyUid = 'p_6G64T_1780779267328'; // GABY

  const mauSnap = await getDocs(collection(db, "users", mauUid, "predictions"));
  const gabySnap = await getDocs(collection(db, "users", gabyUid, "predictions"));

  const mauPreds = mauSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  const gabyPreds = gabySnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  console.log(`MAU predictions count: ${mauPreds.length}`);
  console.log(`GABY predictions count: ${gabyPreds.length}`);

  let identicalCount = 0;
  let differentCount = 0;
  let missingCount = 0;

  mauPreds.forEach(mPred => {
    const matchId = mPred.matchId || mPred.id;
    const gPred = gabyPreds.find(p => (p.matchId || p.id) === matchId);

    if (!gPred) {
      missingCount++;
      return;
    }

    const homeEqual = mPred.homeScore === gPred.homeScore;
    const awayEqual = mPred.awayScore === gPred.awayScore;

    if (homeEqual && awayEqual) {
      identicalCount++;
    } else {
      differentCount++;
      if (differentCount <= 10) {
        console.log(`Diff in ${matchId}: MAU=${mPred.homeScore}-${mPred.awayScore}, GABY=${gPred.homeScore}-${gPred.awayScore}`);
      }
    }
  });

  console.log(`\nComparison Results:`);
  console.log(`- Identical Predictions: ${identicalCount}`);
  console.log(`- Different Predictions: ${differentCount}`);
  console.log(`- Missing in GABY: ${missingCount}`);

  process.exit(0);
}

run().catch(console.error);
