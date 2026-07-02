const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs, doc } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Searching for Esteban in current users...");
  const usersSnap = await getDocs(collection(db, "users"));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const estebans = users.filter(u => 
    (u.displayName || '').toLowerCase().includes('esteban') || 
    (u.name || '').toLowerCase().includes('esteban')
  );

  console.log(`Found ${estebans.length} Esteban(s):`);
  for (const est of estebans) {
    console.log(`- ID: ${est.id} | Name: ${est.displayName} | LeagueId: ${est.leagueId}`);
    
    // Fetch his current active predictions
    const pSnap = await getDocs(collection(db, "users", est.id, "predictions"));
    const pList = pSnap.docs.map(d => ({ matchId: d.id, ...d.data() }));
    console.log(`  Current active predictions: ${pList.length}`);
    pList.forEach(p => {
      console.log(`    * Match ${p.matchId}: ${p.homeScore} - ${p.awayScore}`);
    });
  }

  console.log("\nSearching in Backups...");
  const backupsSnap = await getDocs(collection(db, "backups"));
  const backups = backupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found ${backups.length} total backups.`);

  // Find backup close to June 29, 2026
  backups.forEach(b => {
    console.log(`- Backup ID: ${b.id} | Label: ${b.label} | CreatedAt: ${b.createdAt}`);
    const snap = b.snapshot || {};
    const bUsers = snap.users || [];
    const bPreds = snap.predictions || [];

    const estInBackup = bUsers.filter(u => 
      (u.displayName || '').toLowerCase().includes('esteban') || 
      (u.name || '').toLowerCase().includes('esteban') ||
      u.id === 'p_6L2E5_1780890664093' // known ID
    );

    if (estInBackup.length > 0) {
      console.log(`  Found Esteban in backup!`);
      estInBackup.forEach(est => {
        console.log(`    User: ${est.displayName} (${est.id})`);
        const hisPreds = bPreds.filter(p => p.userId === est.id);
        console.log(`    Predictions count: ${hisPreds.length}`);
        hisPreds.forEach(p => {
          console.log(`      * Match ${p.matchId}: ${p.homeScore} - ${p.awayScore}`);
        });
      });
    }
  });

  process.exit(0);
}

run().catch(console.error);
