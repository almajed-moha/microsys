const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const snap = await getDocs(collection(db, 'users'));
  const items = [];
  snap.forEach(d => {
    const data = d.data();
    if (!data.username) {
      console.log('MISSING USERNAME:', data);
    }
    items.push(data);
  });
  console.log('Total users:', items.length);
  process.exit(0);
}
run();
