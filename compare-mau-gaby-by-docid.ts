import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig as any);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

async function run() {
  const mauUid = 'p_6G64T_1780702913160'; // MAU
  const gabyUid = 'p_6G64T_1780779267328'; // GABY

  const mauSnap = await getDocs(collection(db, "users", mauUid, "predictions"));
  const gabySnap = await getDocs(collection(db, "users", gabyUid, "predictions"));

  const mauMap = new Map<string, any>();
  mauSnap.docs.forEach(doc => {
    mauMap.set(doc.id, doc.data());
  });

  const gabyMap = new Map<string, any>();
  gabySnap.docs.forEach(doc => {
    gabyMap.set(doc.id, doc.data());
  });

  console.log("Comparing predictions by Firestore Document ID directly:");
  
  let totalDocs = 0;
  let matchesCount = 0;
  let differences: any[] = [];

  for (const [id, mauData] of mauMap.entries()) {
    totalDocs++;
    const gabyData = gabyMap.get(id);
    if (!gabyData) {
      console.log(`Document ID ${id} exists for MAU but NOT for GABY.`);
      continue;
    }

    const home1 = mauData.homeScore;
    const away1 = mauData.awayScore;
    const home2 = gabyData.homeScore;
    const away2 = gabyData.awayScore;

    if (home1 !== home2 || away1 !== away2) {
      differences.push({
        id,
        mau: `${home1}-${away1}`,
        gaby: `${home2}-${away2}`
      });
    }
  }

  console.log(`Total prediction docs: ${totalDocs}`);
  console.log(`Total differences: ${differences.length}`);
  differences.forEach(d => {
    console.log(`Match ${d.id}: MAU predicted ${d.mau}, GABY predicted ${d.gaby}`);
  });

  // Let's print out what actually happened with their points on June 21, 22, and 23.
  // Wait! The user says:
  // "ellas dos tienen la misma cantidad de puntos en esas 3 fechas del 21,22 y 23 de junio, entonces no entiendo como pasaron de tener 8 pts de diferencia y ahora estan iguales si se supone que hicieron los mismos puntos en esa jornada, en todo caso hubieran seguido tiniendo 8pts de diferencia y ahroa estan iguales. No entiendo"
  
  // Ah!!! The user says:
  // "They had an 8 point difference. If they got the exact same points in this matchday (21, 22, 23 June), they should STILL have an 8-point difference. Why are they equal now?"
  // Wait! Let's check:
  // Did Gaby or Mau have a different points score in the database BEFORE the fix?
  // Let's look at the database. In the database, both of them currently have "totalPoints = 19" in their user document? Or what are their points in the database user document?
  const mauUserSnap = await getDoc(doc(db, "users", mauUid));
  const gabyUserSnap = await getDoc(doc(db, "users", gabyUid));
  
  console.log("\nUser Document Points:");
  console.log(`MAU:  totalPoints=${mauUserSnap.data()?.totalPoints}, correctResults=${mauUserSnap.data()?.correctResults}, correctWinners=${mauUserSnap.data()?.correctWinners}`);
  console.log(`GABY: totalPoints=${gabyUserSnap.data()?.totalPoints}, correctResults=${gabyUserSnap.data()?.correctResults}, correctWinners=${gabyUserSnap.data()?.correctWinners}`);

  process.exit(0);
}

run().catch(console.error);
