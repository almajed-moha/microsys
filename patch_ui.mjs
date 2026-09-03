import fs from 'fs';
let code = fs.readFileSync('src/components/DatabaseBackupModal.tsx', 'utf8');

const oldUI = `              {/* Scope Selector */}
              {isMasterUser && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>نطاق التصدير للنسخة الاحتياطية:</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportScope('full')}
                      className={\`p-3 rounded-xl border text-right transition flex items-start gap-2.5 \${
                        selectedExportNetworkId === 'all'
                          ? 'bg-indigo-950/60 border-indigo-500/80 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }\`}
                    >
                      <div className={\`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center \${selectedExportNetworkId === 'all' ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600'}\`}>
                        {selectedExportNetworkId === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">قاعدة بيانات النظام بالكامل (SaaS Master)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">يشمل كافة الشبكات، المستخدمين، نقاط البيع، الفواتير والحسابات</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportScope('current')}
                      className={\`p-3 rounded-xl border text-right transition flex items-start gap-2.5 \${
                        selectedExportNetworkId !== 'all'
                          ? 'bg-indigo-950/60 border-indigo-500/80 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }\`}
                    >
                      <div className={\`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center \${selectedExportNetworkId !== 'all' ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600'}\`}>
                        {selectedExportNetworkId !== 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">الشبكة الحالية فقط ({networkDisplayName})</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">تصدير مخصص للبيانات المرتبطة بهذه الشبكة فقط</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}`;

const newUI = `              {/* Scope Selector */}
              {isMasterUser ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>نطاق النسخ الاحتياطي:</span>
                  </label>
                  <select
                    value={selectedExportNetworkId}
                    onChange={(e) => setSelectedExportNetworkId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="all">قاعدة بيانات النظام بالكامل (الافتراضي)</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>شبكة مخصصة: {t.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="mt-0.5"><Database className="w-5 h-5 text-indigo-400" /></div>
                  <div>
                    <h4 className="text-indigo-300 font-bold text-sm">نسخ احتياطي للشبكة</h4>
                    <p className="text-xs text-indigo-200/70 mt-1">
                      سيتم إنشاء نسخة احتياطية آمنة تحتوي على كافة بيانات شبكتك الحالية ({currentTenant?.name || settings.networkName}) فقط.
                    </p>
                  </div>
                </div>
              )}`;

code = code.replace(oldUI, newUI);
fs.writeFileSync('src/components/DatabaseBackupModal.tsx', code);
console.log('done');
