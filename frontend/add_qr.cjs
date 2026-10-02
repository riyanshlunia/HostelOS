const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { QRCodeSVG } from 'qrcode.react'")) {
    code = code.replace("import { motion, AnimatePresence } from 'framer-motion'", "import { QRCodeSVG } from 'qrcode.react'\nimport { motion, AnimatePresence } from 'framer-motion'");
}

code = code.replace("type ModalType = 'resident' | 'editResident' | 'complaint' | 'notice' | 'payment' | 'visitor' | null", "type ModalType = 'resident' | 'editResident' | 'complaint' | 'notice' | 'payment' | 'visitor' | 'qrpass' | null");

code = code.replace("function VisitorsView({ visitors, onAdd, onUpdate, onDelete }:\n  { visitors:Visitor[]; onAdd:()=>void; onUpdate:(id:string,s:Visitor['status'])=>void; onDelete:(id:string)=>void }) {", "function VisitorsView({ visitors, search, onAdd, onUpdate, onDelete, onQR }:\n  { visitors:Visitor[]; search:string; onAdd:()=>void; onUpdate:(id:string,s:Visitor['status'])=>void; onDelete:(id:string)=>void; onQR?:()=>void }) {");

code = code.replace("<Btn variant=\"secondary\" icon={<QrCode size={15}/>} onClick={() => alert('QR Pass generated for today')}>Generate QR Pass</Btn>", "<Btn variant=\"secondary\" icon={<QrCode size={15}/>} onClick={onQR}>Generate QR Pass</Btn>");

code = code.replace("{activeView === 'visitors' && <motion.div key=\"visitors\" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><VisitorsView visitors={visitors} onAdd={() => setModal('visitor')} onUpdate={updateVisitor} onDelete={deleteVisitor} /></motion.div>}", "{activeView === 'visitors' && <motion.div key=\"visitors\" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><VisitorsView visitors={visitors} search={search} onAdd={() => setModal('visitor')} onUpdate={updateVisitor} onDelete={deleteVisitor} onQR={() => setModal('qrpass')} /></motion.div>}");

const qrModal = `
        {modal === 'qrpass' && (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <motion.div className="modal-card" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div>
                  <h2 style={{ fontSize: 20 }}>Self Check-in Pass</h2>
                  <p>Scan to register</p>
                </div>
                <button className="modal-close" onClick={() => setModal(null)}><X size={16}/></button>
              </div>
              <div style={{ padding: '32px 0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{ padding: 16, background: '#fff', borderRadius: 12, display: 'inline-block' }}>
                  <QRCodeSVG value="https://havenly.in/self-check-in" size={200} level="H" includeMargin={false} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, padding: '0 20px' }}>
                  Guests can scan this QR code at the front desk to enter their details, host name, and ID proof. <br/><br/>
                  <strong style={{color: 'var(--text)'}}>Real-world usage:</strong> The scanned link opens a mobile-friendly web app. Once submitted, the visitor auto-appears on your dashboard!
                </div>
              </div>
              <div className="form-actions" style={{ justifyContent: 'center', borderTop: 'none', paddingTop: 0 }}>
                <Btn variant="primary" icon={<CheckCircle2 size={15}/>} onClick={() => { setToast({ msg: 'QR Pass printed successfully', type: 'success' }); setModal(null); }}>Print Pass</Btn>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
`;

code = code.replace(`      </AnimatePresence>\n\n      <AnimatePresence>\n        {toast && (`, qrModal);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx updated!');
