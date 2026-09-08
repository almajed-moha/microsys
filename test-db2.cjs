const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const snap = await getDocs(collection(db, 'users'));
  const items = [];
  snap.forEach(d => items.push(d.data()));
  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
}
run();
