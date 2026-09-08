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
    items.push({ id: data.id, username: data.username, phone: data.phone, password: data.password, role: data.role, networkId: data.networkId });
  });
  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
}
run();
