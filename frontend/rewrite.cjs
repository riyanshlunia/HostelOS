const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Capitalize Havenly
code = code.replace(/havenly<span>\.<\/span>/g, 'Havenly<span>.</span>');
code = code.replace(/<span className="brand-name">havenly<span>\.<\/span><\/span>/g, '<span className="brand-name">Havenly<span>.</span></span>');

// 2. Auth Page rewrite for signup/forgot password
const authPageStart = code.indexOf('function AuthPage');
const authPageEnd = code.indexOf('// ─── Main App');
const authPageOld = code.substring(authPageStart, authPageEnd);

const authPageNew = `function AuthPage({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '')
    const pass = String(form.get('password') || '')
    setError(''); setMsg('')
    
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (mode === 'signin') {
        if (email === 'priya@havenly.in' && pass === 'demo1234') onLogin()
        else setError('Invalid credentials. Try priya@havenly.in / demo1234')
      } else if (mode === 'signup') {
        setMode('signin')
        setMsg('Account created successfully. Please sign in.')
      } else if (mode === 'forgot') {
        setMode('signin')
        setMsg('Password reset link sent to your email.')
      }
    }, 900)
  }

  return (
    <div className="auth-shell">
      <motion.div className="auth-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
        <div className="auth-brand">
          <div className="brand-mark"><Sparkles size={16} strokeWidth={2.5} /></div>
          <span className="brand-name">Havenly<span>.</span></span>
        </div>
        <div className="auth-heading">
          <h1>{mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}</h1>
          <p>{mode === 'signin' ? 'Sign in to your property workspace' : mode === 'signup' ? 'Join Havenly to manage your properties' : 'Enter your email to receive a reset link'}</p>
        </div>
        {mode === 'signin' && (
          <div className="auth-demo-hint">
            <ShieldCheck size={13} />
            <span>Demo — <strong>priya@havenly.in</strong> / <strong>demo1234</strong></span>
          </div>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <span>Email address</span>
            <input name="email" type="email" defaultValue={mode==='signin'?"priya@havenly.in":""} placeholder="you@example.com" autoComplete="email" required />
          </div>
          {mode !== 'forgot' && (
            <div className="form-field">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span>Password</span>
                {mode === 'signin' && <button type="button" className="forgot-link" onClick={() => {setMode('forgot'); setError(''); setMsg('');}} style={{color:'var(--text-3)', fontSize:11}}>Forgot?</button>}
              </div>
              <div className="password-wrap">
                <input name="password" type={showPass ? 'text' : 'password'} defaultValue={mode==='signin'?"demo1234":""} placeholder="••••••••" autoComplete="current-password" required />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}
          {error && <div className="auth-error"><AlertCircle size={13} />{error}</div>}
          {msg && <div className="auth-success" style={{display:'flex',gap:6,color:'var(--accent)',fontSize:12,padding:'10px 12px',background:'var(--accent-dim)',borderRadius:8,border:'1px solid rgba(16,185,129,0.2)'}}><CheckCircle2 size={13} />{msg}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <><Lock size={14} />{mode === 'signin' ? 'Sign in to workspace' : mode === 'signup' ? 'Create account' : 'Send reset link'}</>}
          </button>
        </form>
        <div className="auth-footer" style={{marginTop:24, textAlign:'center', fontSize:12, color:'var(--text-3)'}}>
          {mode === 'signin' ? (
            <>Don't have an account? <button type="button" onClick={() => {setMode('signup'); setError(''); setMsg('');}} style={{color:'var(--text)', fontWeight:500}}>Sign up</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => {setMode('signin'); setError(''); setMsg('');}} style={{color:'var(--text)', fontWeight:500}}>Sign in</button></>
          )}
        </div>
      </motion.div>
    </div>
  )
}

`;
code = code.replace(authPageOld, authPageNew);

// 3. Search Bar conditional & Export generic function
const exportCode = `
  const exportToCSV = () => {
    const data = activeView === 'residents' ? residents 
               : activeView === 'complaints' ? complaints 
               : activeView === 'payments' ? payments 
               : activeView === 'visitors' ? visitors : null;
    if (!data || !data.length) return notify('Nothing to export in this view', 'error');
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => typeof v === 'string' ? \`"\${v.replace(/"/g, '""')}"\` : v).join(',')).join('\\n');
    const blob = new Blob([headers + '\\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = \`\${activeView}-export.csv\`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    notify(\`Exported \${activeView} successfully\`);
  }
`;

code = code.replace("const notify = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })", "const notify = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })\n" + exportCode);

code = code.replace(/<div className="search-box">/g, '{activeView !== \'overview\' && <div className="search-box">');
code = code.replace(/<kbd>⌘K<\/kbd>\s*<\/div>/g, '<kbd>⌘K</kbd></div>}');

// Export onClick in components
code = code.replace(/onClick=\{\(\) => \{\}\}>Export report/g, 'onClick={exportToCSV}>Export report');
code = code.replace(/onClick=\{\(\)=>\{\}\}>Export/g, 'onClick={exportToCSV}>Export');

// 4. Auto updates effect
const effectCode = `
  useEffect(() => {
    if (!authed) return;
    const timer = setInterval(() => {
      const events = [
        'Visitor scanned QR code at Northside Gate',
        'New payment received: ₹18,500 from Aarav Mehta',
        'Maintenance updated CMP-1048 to In Progress',
        'Kitchen reported lunch is ready'
      ];
      notify(events[Math.floor(Math.random() * events.length)]);
    }, 45000); // every 45s for demo
    return () => clearInterval(timer);
  }, [authed]);
`;
code = code.replace("const navigate = (view: View) => { setActiveView(view); setSidebarOpen(false); setSearch('') }", "const navigate = (view: View) => { setActiveView(view); setSidebarOpen(false); setSearch('') }\n" + effectCode);

// 5. Pass exportToCSV to views that use it
code = code.replace(/<Overview onNavigate=\{navigate\} residents=\{residents\} complaints=\{complaints\} payments=\{payments\} \/>/g, '<Overview onNavigate={navigate} residents={residents} complaints={complaints} payments={payments} exportToCSV={exportToCSV} />');
code = code.replace(/<ResidentsView residents=\{residents\} search=\{search\} onAdd=\{\(\) => setModal\('resident'\)\} onEdit=\{r => \{ setEditTarget\(r\); setModal\('editResident'\) \}\} onDelete=\{deleteResident\} \/>/g, '<ResidentsView residents={residents} search={search} onAdd={() => setModal(\'resident\')} onEdit={r => { setEditTarget(r); setModal(\'editResident\') }} onDelete={deleteResident} exportToCSV={exportToCSV} />');
code = code.replace(/<ComplaintsView complaints=\{complaints\} search=\{search\} onAdd=\{\(\) => setModal\('complaint'\)\} onUpdate=\{updateComplaint\} onDelete=\{deleteComplaint\} \/>/g, '<ComplaintsView complaints={complaints} search={search} onAdd={() => setModal(\'complaint\')} onUpdate={updateComplaint} onDelete={deleteComplaint} exportToCSV={exportToCSV} />');
code = code.replace(/<PaymentsView payments=\{payments\} onAdd=\{\(\) => setModal\('payment'\)\} onDelete=\{deletePayment\} \/>/g, '<PaymentsView payments={payments} onAdd={() => setModal(\'payment\')} onDelete={deletePayment} exportToCSV={exportToCSV} />');

code = code.replace(/function Overview\(\{ onNavigate, residents, complaints, payments \}:/g, 'function Overview({ onNavigate, residents, complaints, payments, exportToCSV }:');
code = code.replace(/\{ onNavigate:\(v:View\)=>void; residents:Resident\[\]; complaints:Complaint\[\]; payments:Payment\[\] \}/g, '{ onNavigate:(v:View)=>void; residents:Resident[]; complaints:Complaint[]; payments:Payment[]; exportToCSV?:()=>void }');

code = code.replace(/function ResidentsView\(\{ residents, search, onAdd, onEdit, onDelete \}:/g, 'function ResidentsView({ residents, search, onAdd, onEdit, onDelete, exportToCSV }:');
code = code.replace(/\{ residents:Resident\[\]; search:string; onAdd:\(\)=>void; onEdit:\(r:Resident\)=>void; onDelete:\(id:string,name:string\)=>void \}/g, '{ residents:Resident[]; search:string; onAdd:()=>void; onEdit:(r:Resident)=>void; onDelete:(id:string,name:string)=>void; exportToCSV?:()=>void }');

code = code.replace(/function ComplaintsView\(\{ complaints, search, onAdd, onUpdate, onDelete \}:/g, 'function ComplaintsView({ complaints, search, onAdd, onUpdate, onDelete, exportToCSV }:');
code = code.replace(/\{ complaints:Complaint\[\]; search:string; onAdd:\(\)=>void; onUpdate:\(id:string,s:Complaint\['status'\]\)=>void; onDelete:\(id:string\)=>void \}/g, '{ complaints:Complaint[]; search:string; onAdd:()=>void; onUpdate:(id:string,s:Complaint[\'status\'])=>void; onDelete:(id:string)=>void; exportToCSV?:()=>void }');

code = code.replace(/function PaymentsView\(\{ payments, onAdd, onDelete \}:/g, 'function PaymentsView({ payments, onAdd, onDelete, exportToCSV }:');
code = code.replace(/\{ payments:Payment\[\]; onAdd:\(\)=>void; onDelete:\(id:string\)=>void \}/g, '{ payments:Payment[]; onAdd:()=>void; onDelete:(id:string)=>void; exportToCSV?:()=>void }');

// 6. QR Code button in VisitorsView
code = code.replace(/<Btn icon=\{<Plus size=\{16\}\/>\} onClick=\{onAdd\}>Pre-register visitor<\/Btn>/g, '<Btn variant="secondary" icon={<QrCode size={15}/>} onClick={() => alert(\'QR Pass generated for today\')}>Generate QR Pass</Btn><Btn icon={<Plus size={16}/>} onClick={onAdd}>Pre-register visitor</Btn>');
code = code.replace(/<Btn icon=\{<Plus size=\{16\}\/>\} onClick=\{onAdd\}>Add visitor<\/Btn>/g, '<Btn variant="secondary" icon={<QrCode size={15}/>} onClick={() => alert(\'QR Pass generated for today\')}>Generate QR Pass</Btn><Btn icon={<Plus size={16}/>} onClick={onAdd}>Add visitor</Btn>');

fs.writeFileSync('src/App.tsx', code);
