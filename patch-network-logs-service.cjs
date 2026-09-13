const fs = require('fs');
let code = fs.readFileSync('src/services/networkLogsService.ts', 'utf8');

if (!code.includes('incrementDailyNetworkLog')) {
  const importMatch = code.match(/import \{.*\} from 'firebase\/firestore';/);
  if (importMatch) {
    let imports = importMatch[0];
    if (!imports.includes('increment')) {
      imports = imports.replace('}', ', increment, getDoc }');
      code = code.replace(importMatch[0], imports);
    }
  }

  code += `
export const incrementDailyNetworkLog = async (date: string, downDelta: number, upDelta: number): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, date);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, {
      id: date,
      date: date,
      downloadBytes: downDelta,
      uploadBytes: upDelta,
      totalBytes: downDelta + upDelta,
      createdAt: serverTimestamp(),
      notes: 'تسجيل تلقائي مستمر'
    });
  } else {
    await setDoc(docRef, {
      downloadBytes: increment(downDelta),
      uploadBytes: increment(upDelta),
      totalBytes: increment(downDelta + upDelta),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
};
`;
  fs.writeFileSync('src/services/networkLogsService.ts', code);
}
