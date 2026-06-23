import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig as any);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

async function run() {
  const usersSnap = await getDocs(collection(db, "users"));
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() as any }));

  const chicsUsers = users.filter(u => u.leagueId === '6G64T' && u.isParticipant);
  console.log(`Found ${chicsUsers.length} participants in league CHICS (6G64T):`);
  chicsUsers.forEach(u => {
    console.log(`- ${u.displayName} (${u.uid}): Points=${u.totalPoints}, CreatedAt=${u.createdAt || 'N/A'}`);
  });

  // Let's load predictions for ALL of them and compare them
  const allPreds: { [uid: string]: any[] } = {};
  for (const u of chicsUsers) {
    const snap = await getDocs(collection(db, "users", u.uid, "predictions"));
    allPreds[u.uid] = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    console.log(`  Loaded ${allPreds[u.uid].length} predictions for ${u.displayName}`);
  }

  // Compare every pair to see if any are highly identical
  console.log("\nChecking for identical predictions between players in CHICS:");
  for (let i = 0; i < chicsUsers.length; i++) {
    for (let j = i + 1; j < chicsUsers.length; j++) {
      const u1 = chicsUsers[i];
      const u2 = chicsUsers[j];
      const preds1 = allPreds[u1.uid];
      const preds2 = allPreds[u2.uid];

      let matching = 0;
      preds1.forEach(p1 => {
        const id = p1.matchId || p1.id;
        const p2 = preds2.find(p => (p.matchId || p.id) === id);
        if (p2 && p1.homeScore === p2.homeScore && p1.awayScore === p2.awayScore) {
          matching++;
        }
      });

      const totalComp = Math.min(preds1.length, preds2.length);
      const pct = totalComp > 0 ? (matching / totalComp) * 100 : 0;
      if (pct > 80) {
        console.log(`⚠️ HIGH SIMILARITY: ${u1.displayName} and ${u2.displayName} are ${pct.toFixed(1)}% identical (${matching}/${totalComp} matches)`);
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
