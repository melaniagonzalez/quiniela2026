import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { MATCHES } from './src/constants';

const app = initializeApp(firebaseConfig as any);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

async function run() {
  const compSnap = await getDoc(doc(db, "competitions", "WC"));
  const dbMatches = compSnap.data()?.matches || [];

  console.log(`Analyzing ALL differences between DB (${dbMatches.length} matches) and Local Constants (${MATCHES.length} matches)...`);

  const differences: any[] = [];
  dbMatches.forEach((dbM: any) => {
    const localM = MATCHES.find(m => m.id === dbM.id);
    if (!localM) return;

    const dbHome = dbM.actualHomeScore;
    const dbAway = dbM.actualAwayScore;
    const locHome = localM.actualHomeScore;
    const locAway = localM.actualAwayScore;

    const scoresDiffer = dbHome !== locHome || dbAway !== locAway;
    const statusDiffer = dbM.status !== localM.status;

    if (scoresDiffer || statusDiffer) {
      differences.push({
        id: dbM.id,
        homeTeam: dbM.homeTeamName || localM.homeTeamId,
        awayTeam: dbM.awayTeamName || localM.awayTeamId,
        date: dbM.date,
        dbScore: dbHome !== null ? `${dbHome}-${dbAway}` : "null-null",
        localScore: locHome !== null ? `${locHome}-${locAway}` : "null-null",
        dbStatus: dbM.status,
        localStatus: localM.status
      });
    }
  });

  // Sort differences by date ascending
  differences.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log(`Found ${differences.length} differences:`);
  differences.forEach(d => {
    console.log(`[${d.date}] Match ${d.id} (${d.homeTeam} vs ${d.awayTeam}):`);
    console.log(`  - DB:    Score: ${d.dbScore}, Status: ${d.dbStatus}`);
    console.log(`  - Local: Score: ${d.localScore}, Status: ${d.localStatus}`);
  });

  process.exit(0);
}

run().catch(console.error);
