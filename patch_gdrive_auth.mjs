import fs from 'fs';

let code = fs.readFileSync('src/components/DatabaseBackupModal.tsx', 'utf8');

// 1. Add onUpdateUser to props
code = code.replace(
  "  onLogActivity?: (action: string, title: string, details: string, status?: 'success' | 'warning' | 'danger' | 'info') => void;\n}",
  "  onLogActivity?: (action: string, title: string, details: string, status?: 'success' | 'warning' | 'danger' | 'info') => void;\n  onUpdateUser?: (user: AppUser) => void;\n}"
);

// 2. Destructure onUpdateUser
code = code.replace(
  "  onLogActivity,\n}) => {",
  "  onLogActivity,\n  onUpdateUser,\n}) => {"
);

// 3. Add state pendingGoogleUser
code = code.replace(
  "  const [gDriveFeedback, setGDriveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);",
  "  const [gDriveFeedback, setGDriveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);\n  const [pendingGoogleUser, setPendingGoogleUser] = useState<FirebaseUser | null>(null);"
);

// 4. Update handleSignInGoogleDrive
const oldHandleSignIn = `  const handleSignInGoogleDrive = async () => {
    setIsSigningInGDrive(true);
    setGDriveFeedback(null);
    try {
      const { user } = await signInWithGoogle();
      setGDriveUser(user);
      setIsGDriveSignedIn(true);
      setGDriveFeedback({ type: 'success', message: \`تم الاتصال بحساب Google بنجاح (\${user.email})\` });
      await loadGDriveFiles();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setGDriveFeedback({
        type: 'error',
        message: err?.message || 'فشل تسجيل الدخول باستخدام حساب Google. تأكد من السماح بالنوافذ المنبثقة.',
      });
    } finally {
      setIsSigningInGDrive(false);
    }
  };`;

const newHandleSignIn = `  const handleSignInGoogleDrive = async () => {
    setIsSigningInGDrive(true);
    setGDriveFeedback(null);
    try {
      const { user } = await signInWithGoogle();
      
      if (!activeUser?.email) {
        if (onUpdateUser && activeUser) {
          onUpdateUser({ ...activeUser, email: user.email || '' });
        }
        setGDriveUser(user);
        setIsGDriveSignedIn(true);
        setGDriveFeedback({ type: 'success', message: \`تم الاتصال بحساب Google بنجاح وتم تسجيل البريد (\${user.email}) في بياناتك\` });
        await loadGDriveFiles();
      } else if (activeUser.email.toLowerCase() !== user.email?.toLowerCase()) {
        setPendingGoogleUser(user);
      } else {
        setGDriveUser(user);
        setIsGDriveSignedIn(true);
        setGDriveFeedback({ type: 'success', message: \`تم الاتصال بحساب Google بنجاح (\${user.email})\` });
        await loadGDriveFiles();
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setGDriveFeedback({
        type: 'error',
        message: err?.message || 'فشل تسجيل الدخول باستخدام حساب Google. تأكد من السماح بالنوافذ المنبثقة.',
      });
    } finally {
      setIsSigningInGDrive(false);
    }
  };`;

code = code.replace(oldHandleSignIn, newHandleSignIn);

// 5. Add UI for pendingGoogleUser
const uiCode = `
      {/* Pending Google User Confirmation Modal */}
      {pendingGoogleUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="font-bold text-lg">تحذير: اختلاف البريد الإلكتروني</h3>
            </div>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              حساب Google الذي قمت بتسجيل الدخول به (<span className="font-bold text-white dir-ltr inline-block">{pendingGoogleUser.email}</span>) 
              يختلف عن البريد الإلكتروني المسجل في بياناتك (<span className="font-bold text-white dir-ltr inline-block">{activeUser?.email}</span>).
            </p>
            <p className="text-sm text-slate-300 mb-6">
              هل تريد المتابعة وتحديث بريدك الإلكتروني المسجل ليكون مطابقاً لهذا الحساب؟ سيتم إضافة هذا البريد إلى بياناتك.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  signOutGoogle();
                  setPendingGoogleUser(null);
                  setGDriveFeedback({ type: 'error', message: 'تم إلغاء عملية الربط لاختلاف البريد الإلكتروني.' });
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition text-sm"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onUpdateUser && activeUser) {
                    onUpdateUser({ ...activeUser, email: pendingGoogleUser.email || '' });
                  }
                  setGDriveUser(pendingGoogleUser);
                  setIsGDriveSignedIn(true);
                  setGDriveFeedback({ type: 'success', message: \`تم الاتصال بحساب Google وتحديث بريدك بنجاح (\${pendingGoogleUser.email})\` });
                  setPendingGoogleUser(null);
                  await loadGDriveFiles();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition text-sm shadow-lg shadow-amber-600/20"
              >
                المتابعة والتحديث
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  "{/* Modal Footer */}",
  uiCode + "\n        {/* Modal Footer */}"
);

fs.writeFileSync('src/components/DatabaseBackupModal.tsx', code);

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  "onRestoreDatabase={handleRestoreDatabase}",
  "onRestoreDatabase={handleRestoreDatabase}\n          onUpdateUser={handleUpdateUser}"
);
fs.writeFileSync('src/App.tsx', appCode);

console.log('done');
