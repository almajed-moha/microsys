const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    console.log('Users found:', items.length);
    console.log(items.map(i => i.username));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
