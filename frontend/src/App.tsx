import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight,
  BedDouble, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, CreditCard,
  Download, DoorOpen, Filter, LayoutDashboard, Lock, LogOut, MapPin, Megaphone,
  IndianRupee, Menu, MessageSquare, MoreHorizontal, Plus, Printer, QrCode, ReceiptText,
  Search, ShieldCheck, SlidersHorizontal, Sparkles, Trash2,
  UserRoundPlus, Users, UtensilsCrossed, Utensils, Coffee, Cookie, Soup,
  TrendingUp, TrendingDown, Wrench, X, Eye, EyeOff, Building2, Pencil, CalendarDays,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────
type View = 'overview' | 'residents' | 'rooms' | 'complaints' | 'payments' | 'visitors' | 'mess' | 'notices' | 'finance'
type Tone = 'mint' | 'blue' | 'orange' | 'purple' | 'pink' | 'yellow'
type ModalType = 'resident' | 'editResident' | 'complaint' | 'notice' | 'payment' | 'visitor' | 'qrpass' | 'room' | 'editMenu' | null

type Resident = {
  id: string; name: string; initials: string; room: string; property: string
  status: 'Active' | 'Notice period' | 'Pending' | 'Checked out'
  lease: string; amount: string; phone: string; tone: Tone
}
type Complaint = {
  id: string; title: string; resident: string; room: string; category: string
  priority: 'High' | 'Medium' | 'Low'; status: 'Open' | 'In progress' | 'Resolved'
  age: string; assignee: string
}
type Visitor = {
  id: string; name: string; resident: string; purpose: string; property: string
  time: string; checkoutTime?: string; phone?: string; status: 'Expected' | 'Checked in' | 'Checked out'; initials: string
}
type Notice = {
  id: string; title: string; excerpt: string; audience: string; author: string
  date: string; read: string; priority: 'Important' | 'General' | 'Event'; color: string
}
type Room = {
  id: string; name: string; floor: string; type: string; occupied: number
  capacity: number; status: 'Good' | 'Maintenance' | 'Cleaning'; residents: string[]; accent: string
}
type Payment = {
  id: string; resident: string; invoice: string; date: string
  method: string; amount: number; status: 'Paid' | 'Due' | 'Overdue'
  initials: string; tone: Tone
}
type MenuItem = { meal: string; time: string; items: string; icon: ReactNode; tag?: string }

// ─── Nav ──────────────────────────────────────────────────────────────────────
const navGroups = [
  { label: 'Workspace', items: [
    { id: 'overview' as View, label: 'Overview', icon: LayoutDashboard },
    { id: 'residents' as View, label: 'Residents', icon: Users },
    { id: 'rooms' as View, label: 'Rooms & beds', icon: BedDouble },
  ]},
  { label: 'Operations', items: [
    { id: 'complaints' as View, label: 'Complaints', icon: Wrench, alert: true },
    { id: 'payments' as View, label: 'Payments', icon: CreditCard },
    { id: 'visitors' as View, label: 'Visitors', icon: DoorOpen },
    { id: 'mess' as View, label: 'Mess & meals', icon: UtensilsCrossed },
    { id: 'notices' as View, label: 'Notices', icon: Megaphone },
  ]},
  { label: 'Analytics', items: [
    { id: 'finance' as View, label: 'Finance', icon: TrendingUp },
  ]},
]

const avatarTones: Record<Tone, string> = {
  mint: 'avatar-mint', blue: 'avatar-blue', orange: 'avatar-orange',
  purple: 'avatar-purple', pink: 'avatar-pink', yellow: 'avatar-yellow',
}
const tones: Tone[] = ['mint', 'blue', 'orange', 'purple', 'pink', 'yellow']

// ─── Seed data ───────────────────────────────────────────────────────────────
const initialResidents: Resident[] = [
  { id: 'r1', name: 'Aarav Mehta', initials: 'AM', room: 'A-203 · B2', property: 'Northside House', status: 'Active', lease: 'Apr 2024 — Mar 2025', amount: '₹18,500', phone: '+91 98765 43210', tone: 'mint' },
  { id: 'r2', name: 'Diya Sharma', initials: 'DS', room: 'B-105 · B1', property: 'Northside House', status: 'Active', lease: 'Jun 2024 — May 2025', amount: '₹16,800', phone: '+91 99887 12004', tone: 'purple' },
  { id: 'r3', name: 'Kabir Nair', initials: 'KN', room: 'C-301 · B3', property: 'Lakeview Co-living', status: 'Notice period', lease: 'Jan 2024 — Dec 2024', amount: '₹21,000', phone: '+91 98470 88742', tone: 'orange' },
  { id: 'r4', name: 'Meera Iyer', initials: 'MI', room: 'A-110 · B1', property: 'Northside House', status: 'Active', lease: 'Aug 2024 — Jul 2025', amount: '₹17,500', phone: '+91 98950 34421', tone: 'blue' },
  { id: 'r5', name: 'Rohan Kapoor', initials: 'RK', room: 'D-202 · B2', property: 'The Brick House', status: 'Pending', lease: 'Starts 15 Sep 2024', amount: '₹19,200', phone: '+91 98100 77231', tone: 'pink' },
  { id: 'r6', name: 'Tara Menon', initials: 'TM', room: 'C-208 · B2', property: 'Lakeview Co-living', status: 'Active', lease: 'Mar 2024 — Feb 2025', amount: '₹22,500', phone: '+91 97460 22009', tone: 'yellow' },
]
const initialComplaints: Complaint[] = [
  { id: 'CMP-1048', title: 'Water pressure is low in bathroom', resident: 'Aarav Mehta', room: 'A-203', category: 'Plumbing', priority: 'High', status: 'Open', age: '12 min ago', assignee: 'Unassigned' },
  { id: 'CMP-1047', title: 'AC making unusual noise', resident: 'Tara Menon', room: 'C-208', category: 'Appliances', priority: 'Medium', status: 'In progress', age: '2 hours ago', assignee: 'Ravi K.' },
  { id: 'CMP-1046', title: 'Wi-Fi keeps disconnecting', resident: 'Diya Sharma', room: 'B-105', category: 'Internet', priority: 'Medium', status: 'In progress', age: 'Yesterday', assignee: 'Tech team' },
  { id: 'CMP-1045', title: 'Replace desk lamp', resident: 'Meera Iyer', room: 'A-110', category: 'Furniture', priority: 'Low', status: 'Resolved', age: 'Yesterday', assignee: 'Ravi K.' },
  { id: 'CMP-1044', title: 'Kitchen sink drain blocked', resident: 'Yash Verma', room: 'D-204', category: 'Plumbing', priority: 'High', status: 'Open', age: '2 days ago', assignee: 'Unassigned' },
]
const initialVisitors: Visitor[] = [
  { id: 'v1', name: 'Nisha Mehta', resident: 'Aarav Mehta · A-203', purpose: 'Family visit', property: 'Northside House', time: 'Today, 6:30 PM', checkoutTime: 'Today, 9:00 PM', phone: '+91 98765 11111', status: 'Expected', initials: 'NM' },
  { id: 'v2', name: 'Aditya Rao', resident: 'Diya Sharma · B-105', purpose: 'Friend', property: 'Northside House', time: 'Today, 5:00 PM', checkoutTime: 'Today, 7:00 PM', phone: '+91 99887 22222', status: 'Checked in', initials: 'AR' },
  { id: 'v3', name: 'Sanjay Iyer', resident: 'Meera Iyer · A-110', purpose: 'Delivery', property: 'Northside House', time: 'Today, 3:45 PM', checkoutTime: 'Today, 4:30 PM', phone: '+91 91234 33333', status: 'Checked out', initials: 'SI' },
  { id: 'v4', name: 'Ananya Bose', resident: 'Tara Menon · C-208', purpose: 'Family visit', property: 'Lakeview Co-living', time: 'Tomorrow, 11:00 AM', checkoutTime: 'Tomorrow, 2:00 PM', phone: '+91 88776 44444', status: 'Expected', initials: 'AB' },
]
const initialNotices: Notice[] = [
  { id: 'n1', title: 'Annual fire safety inspection', excerpt: 'Our quarterly safety inspection is scheduled for Friday, 20 September. Please keep common areas clear.', audience: 'All residents', author: 'Priya Nair', date: 'Today, 09:24', read: '86% read', priority: 'Important', color: 'notice-coral' },
  { id: 'n2', title: 'Community dinner · September edition', excerpt: 'Join us on the rooftop this Saturday for an open-air dinner with your neighbours.', audience: 'Northside House', author: 'Community team', date: 'Yesterday', read: '72% read', priority: 'Event', color: 'notice-violet' },
  { id: 'n3', title: 'Updated quiet hours policy', excerpt: 'A gentle reminder that quiet hours are from 10:30 PM to 7:00 AM every day.', audience: 'All residents', author: 'Priya Nair', date: '12 Sep 2024', read: '98% read', priority: 'General', color: 'notice-blue' },
]
const initialRooms: Room[] = [
  { id: 'A-203', name: 'A-203', floor: '2nd floor', type: 'Deluxe twin', occupied: 2, capacity: 2, status: 'Good', residents: ['Aarav Mehta', 'Yash Verma'], accent: 'room-green' },
  { id: 'B-105', name: 'B-105', floor: '1st floor', type: 'Private studio', occupied: 1, capacity: 1, status: 'Good', residents: ['Diya Sharma'], accent: 'room-blue' },
  { id: 'C-208', name: 'C-208', floor: '2nd floor', type: 'Deluxe twin', occupied: 1, capacity: 2, status: 'Maintenance', residents: ['Tara Menon'], accent: 'room-orange' },
  { id: 'A-110', name: 'A-110', floor: '1st floor', type: 'Private studio', occupied: 1, capacity: 1, status: 'Good', residents: ['Meera Iyer'], accent: 'room-purple' },
  { id: 'D-202', name: 'D-202', floor: '2nd floor', type: 'Premium twin', occupied: 1, capacity: 2, status: 'Cleaning', residents: ['Rohan Kapoor'], accent: 'room-pink' },
  { id: 'C-301', name: 'C-301', floor: '3rd floor', type: 'Premium twin', occupied: 2, capacity: 2, status: 'Good', residents: ['Kabir Nair', 'Ananya Bose'], accent: 'room-yellow' },
]
const initialPayments: Payment[] = [
  { id: 'p1', resident: 'Aarav Mehta', invoice: 'INV-2409-018', date: '17 Sep 2024', method: 'UPI', amount: 18500, status: 'Paid', initials: 'AM', tone: 'mint' },
  { id: 'p2', resident: 'Diya Sharma', invoice: 'INV-2409-022', date: '16 Sep 2024', method: 'Bank transfer', amount: 16800, status: 'Paid', initials: 'DS', tone: 'purple' },
  { id: 'p3', resident: 'Tara Menon', invoice: 'INV-2409-027', date: '15 Sep 2024', method: 'Card', amount: 22500, status: 'Paid', initials: 'TM', tone: 'yellow' },
  { id: 'p4', resident: 'Kabir Nair', invoice: 'INV-2409-011', date: '12 Sep 2024', method: '—', amount: 21000, status: 'Overdue', initials: 'KN', tone: 'orange' },
  { id: 'p5', resident: 'Rohan Kapoor', invoice: 'INV-2409-031', date: '10 Sep 2024', method: '—', amount: 19200, status: 'Due', initials: 'RK', tone: 'pink' },
]
const menuItems: MenuItem[] = [
  { meal: 'Breakfast', time: '7:30 — 10:00 AM', items: 'Masala dosa · Coconut chutney · Fresh fruit', icon: <Coffee size={16} />, tag: 'Served' },
  { meal: 'Lunch', time: '12:30 — 2:30 PM', items: 'Dal makhani · Jeera rice · Roti · Salad', icon: <Utensils size={16} />, tag: 'Next up' },
  { meal: 'Snacks', time: '4:30 — 5:30 PM', items: 'Samosa · Masala chai', icon: <Cookie size={16} /> },
  { meal: 'Dinner', time: '7:30 — 10:00 PM', items: 'Paneer tikka · Veg biryani · Raita', icon: <Soup size={16} /> },
]
const occupancyData = [
  { name: 'Apr', occupied: 102, available: 42 }, { name: 'May', occupied: 108, available: 36 },
  { name: 'Jun', occupied: 115, available: 29 }, { name: 'Jul', occupied: 111, available: 33 },
  { name: 'Aug', occupied: 119, available: 25 }, { name: 'Sep', occupied: 124, available: 20 },
]
const revenueData = [
  { name: 'Apr', collected: 18.2, outstanding: 3.4 }, { name: 'May', collected: 19.4, outstanding: 2.8 },
  { name: 'Jun', collected: 20.1, outstanding: 3.1 }, { name: 'Jul', collected: 19.8, outstanding: 2.2 },
  { name: 'Aug', collected: 21.4, outstanding: 2.6 }, { name: 'Sep', collected: 22.8, outstanding: 2.86 },
]

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)
const today = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }: { onLogin: (mode: 'demo' | 'real') => void }) {
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
        if (email === 'priya@havenly.in') {
           if (pass === 'demo1234') onLogin('demo')
           else setError('Invalid password. Use demo1234 for recruiter demo.')
        } else {
           onLogin('real')
        }
      } else if (mode === 'signup') {
        onLogin('real')
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
          <div className="auth-demo-hint" style={{ lineHeight: 1.4, textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span><strong>Recruiters:</strong> Log in with <strong>priya@havenly.in</strong> (pwd: <strong>demo1234</strong>) to view a fully populated dashboard. Or sign up to test a fresh account.</span>
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

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [authed, setAuthed] = useState(false)
  const [userMode, setUserMode] = useState<'demo' | 'real'>('demo')
  const [communityCreated, setCommunityCreated] = useState(false)
  const [communityName, setCommunityName] = useState('Workspace')

  const [activeView, setActiveView] = useState<View>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [residents, setResidents] = useState(initialResidents)
  const [complaints, setComplaints] = useState(initialComplaints)
  const [visitors, setVisitors] = useState(initialVisitors)
  const [notices, setNotices] = useState(initialNotices)
  const [rooms, setRooms] = useState(initialRooms)
  const [payments, setPayments] = useState(initialPayments)
  const [menu, setMenu] = useState(menuItems)
  const [modal, setModal] = useState<ModalType>(null)
  const [editTarget, setEditTarget] = useState<Resident | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  const notify = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const exportToCSV = () => {
    const data = activeView === 'residents' ? residents 
               : activeView === 'complaints' ? complaints 
               : activeView === 'payments' ? payments 
               : activeView === 'visitors' ? visitors : null;
    if (!data || !data.length) return notify('Nothing to export in this view', 'error');
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeView}-export.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    notify(`Exported ${activeView} successfully`);
  }


  const navigate = (view: View) => { setActiveView(view); setSidebarOpen(false); setSearch('') }

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


  // Residents CRUD
  const createResident = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') || 'New resident')
    const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    const tone = tones[residents.length % tones.length]
    const r: Resident = {
      id: `r${Date.now()}`, name, initials,
      room: String(f.get('room') || 'Unassigned'),
      property: String(f.get('property') || 'Northside House'),
      status: 'Pending',
      lease: `Starts ${String(f.get('moveIn') || 'next week')}`,
      amount: `₹${fmt(Number(f.get('amount') || 18500))}`,
      phone: String(f.get('phone') || '—'), tone,
    }
    setResidents(c => [r, ...c])
    setModal(null)
    notify(`${name} added to resident directory`)
  }

  const updateResident = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editTarget) return
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') || editTarget.name)
    const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    const updated: Resident = {
      ...editTarget, name, initials,
      room: String(f.get('room') || editTarget.room),
      property: String(f.get('property') || editTarget.property),
      phone: String(f.get('phone') || editTarget.phone),
      amount: `₹${fmt(Number(f.get('amount') || 18500))}`,
      lease: String(f.get('lease') || editTarget.lease),
      status: f.get('status') as Resident['status'] || editTarget.status,
    }
    setResidents(c => c.map(r => r.id === editTarget.id ? updated : r))
    setModal(null); setEditTarget(null)
    notify(`${name}'s profile updated`)
  }

  const deleteResident = (id: string, name: string) => {
    setResidents(c => c.filter(r => r.id !== id))
    notify(`${name} removed from directory`)
  }

  // Complaints CRUD
  const createComplaint = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const c: Complaint = {
      id: `CMP-${1050 + complaints.length}`,
      title: String(f.get('title') || 'New request'),
      resident: String(f.get('resident') || '—'),
      room: String(f.get('room') || '—'),
      category: String(f.get('category') || 'General'),
      priority: f.get('priority') as Complaint['priority'] || 'Medium',
      status: 'Open', age: 'Just now', assignee: 'Unassigned',
    }
    setComplaints(current => [c, ...current])
    setModal(null)
    notify('Complaint logged and queued for triage')
  }

  const updateComplaint = (id: string, status: Complaint['status']) => {
    setComplaints(c => c.map(item => item.id === id ? { ...item, status } : item))
    notify(`Complaint moved to ${status.toLowerCase()}`)
  }

  const deleteComplaint = (id: string) => {
    setComplaints(c => c.filter(item => item.id !== id))
    notify('Complaint removed')
  }

  // Visitors CRUD
  const createVisitor = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') || 'Visitor')
    const v: Visitor = {
      id: `v${Date.now()}`,
      name,
      initials: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
      resident: String(f.get('resident') || '—'),
      purpose: String(f.get('purpose') || '—'),
      property: String(f.get('property') || 'Northside House'),
      time: String(f.get('time') || 'Today'),
      status: 'Expected',
    }
    setVisitors(c => [v, ...c])
    setModal(null)
    notify(`${name} registered as expected visitor`)
  }

  const updateVisitor = (id: string, status: Visitor['status']) => {
    setVisitors(c => c.map(v => v.id === id ? { ...v, status } : v))
    notify(status === 'Checked in' ? 'Visitor checked in' : 'Visitor status updated')
  }

  const deleteVisitor = (id: string) => {
    setVisitors(c => c.filter(v => v.id !== id))
    notify('Visitor record removed')
  }

  // Notices CRUD
  const createNotice = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const colors = ['notice-coral', 'notice-violet', 'notice-blue']
    const n: Notice = {
      id: `n${Date.now()}`,
      title: String(f.get('title') || 'New notice'),
      excerpt: String(f.get('excerpt') || ''),
      audience: String(f.get('audience') || 'All residents'),
      author: 'Priya Nair', date: 'Just now', read: '0% read',
      priority: f.get('priority') as Notice['priority'] || 'General',
      color: colors[notices.length % colors.length],
    }
    setNotices(c => [n, ...c])
    setModal(null)
    notify('Notice published')
  }

  const deleteNotice = (id: string) => {
    setNotices(c => c.filter(n => n.id !== id))
    notify('Notice removed')
  }

  // Payments CRUD
  const recordPayment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const residentName = String(f.get('resident') || 'Unknown')
    const amount = Number(f.get('amount') || 0)
    const p: Payment = {
      id: `p${Date.now()}`,
      resident: residentName,
      invoice: `INV-${Date.now().toString().slice(-6)}`,
      date: today(),
      method: String(f.get('method') || 'UPI'),
      amount,
      status: 'Paid',
      initials: residentName.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase(),
      tone: tones[payments.length % tones.length],
    }
    setPayments(c => [p, ...c])
    setModal(null)
    notify(`₹${fmt(amount)} recorded from ${residentName}`)
  }

  const deletePayment = (id: string) => {
    setPayments(c => c.filter(p => p.id !== id))
    notify('Payment record removed')
  }

  const addRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = new FormData(e.currentTarget)
    const newRoom: Room = {
      id: `RM-${Date.now()}`,
      number: String(form.get('number')),
      capacity: Number(form.get('capacity')),
      occupied: 0,
      floor: Number(form.get('floor')),
      status: 'Available',
      property: String(form.get('property'))
    }
    setRooms([newRoom, ...rooms]); setModal(null); notify('Room added successfully')
  }

  const editMenu = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = new FormData(e.currentTarget)
    setMenu(menu.map((m, i) => ({ ...m, items: String(form.get(`menu_${i}`)) })))
    setModal(null); notify('Menu updated successfully')
  }

  if (!authed) return <AuthPage onLogin={(mode) => {
    if (mode === 'demo') {
      setResidents(initialResidents); setComplaints(initialComplaints); setVisitors(initialVisitors);
      setNotices(initialNotices); setRooms(initialRooms); setPayments(initialPayments);
      setCommunityName('Workspace')
      setCommunityCreated(true)
    } else {
      setResidents([]); setComplaints([]); setVisitors([]);
      setNotices([]); setRooms([]); setPayments([]);
      setCommunityCreated(false)
    }
    setUserMode(mode)
    setAuthed(true)
  }} />

  if (authed && userMode === 'real' && !communityCreated) {
    return (
      <div className="auth-shell">
        <motion.div className="auth-card" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}}>
          <div className="auth-brand"><span className="brand-name">Havenly<span>.</span></span></div>
          <div className="auth-heading">
            <h1>Welcome to Havenly!</h1>
            <p>Let's set up your new property workspace.</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); setCommunityCreated(true); }}>
            <div className="form-field">
              <span>Community / Property Name</span>
              <input type="text" placeholder="e.g. Sunrise Apartments" required value={communityName} onChange={e=>setCommunityName(e.target.value)} />
            </div>
            <button className="auth-submit" type="submit" style={{marginTop:20}}>Create Workspace</button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-name">Havenly<span>.</span></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navGroups.map(group => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(item => {
                const Icon = item.icon
                const count = item.id === 'complaints' ? complaints.filter(c => c.status === 'Open').length
                  : item.id === 'visitors' ? visitors.filter(v => v.status === 'Expected').length
                  : item.id === 'residents' ? residents.length : 0
                return (
                  <button key={item.id} className={`nav-item ${activeView === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
                    <Icon size={16} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {count > 0 && <span className={`nav-count ${item.alert ? 'nav-count-alert' : ''}`}>{count}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar avatar-blue avatar-sm">PN</div>
            <div className="user-copy"><strong>Priya Nair</strong><span>Property manager</span></div>
            <button className="icon-button" onClick={() => { setAuthed(false) }} title="Sign out"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="breadcrumbs"><span>{communityName}</span><ArrowRight size={13} /><strong>{viewTitle(activeView)}</strong></div>
          </div>
          <div className="topbar-actions">
            {['residents', 'complaints', 'visitors'].includes(activeView) && <div className="search-box">
              <Search size={15} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" aria-label="Search" />
              <kbd>⌘K</kbd></div>}
            {userMode === 'demo' && <div className="live-pill"><span className="live-dot live" />Demo mode</div>}
            <div className="topbar-avatar">{userMode === 'demo' ? 'PN' : 'You'}</div>
          </div>
        </header>

        <main className="content">
          <AnimatePresence mode="wait">
            {activeView === 'overview' && <motion.div key="overview" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><Overview onNavigate={navigate} residents={residents} complaints={complaints} payments={payments} exportToCSV={exportToCSV} /></motion.div>}
            {activeView === 'residents' && <motion.div key="residents" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><ResidentsView residents={residents} search={search} onAdd={() => setModal('resident')} onEdit={r => { setEditTarget(r); setModal('editResident') }} onDelete={deleteResident} exportToCSV={exportToCSV} /></motion.div>}
            {activeView === 'rooms' && <motion.div key="rooms" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><RoomsView rooms={rooms} notify={notify} setRooms={setRooms} onAdd={() => setModal('room')} /></motion.div>}
            {activeView === 'complaints' && <motion.div key="complaints" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><ComplaintsView complaints={complaints} search={search} onAdd={() => setModal('complaint')} onUpdate={updateComplaint} onDelete={deleteComplaint} exportToCSV={exportToCSV} /></motion.div>}
            {activeView === 'payments' && <motion.div key="payments" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><PaymentsView payments={payments} onAdd={() => setModal('payment')} onDelete={deletePayment} exportToCSV={exportToCSV} /></motion.div>}
            {activeView === 'visitors' && <motion.div key="visitors" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><VisitorsView visitors={visitors} search={search} onAdd={() => setModal('visitor')} onUpdate={updateVisitor} onDelete={deleteVisitor} onQR={() => setModal('qrpass')} /></motion.div>}
            {activeView === 'mess' && <motion.div key="mess" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><MessView menu={menu} notify={notify} onEdit={() => setModal('editMenu')} /></motion.div>}
            {activeView === 'notices' && <motion.div key="notices" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><NoticesView notices={notices} onAdd={() => setModal('notice')} onDelete={deleteNotice} /></motion.div>}
            {activeView === 'finance' && <motion.div key="finance" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={{duration:0.28,ease:'easeOut'}}><FinanceView payments={payments} residents={residents} /></motion.div>}
            {modal === 'room' && <Modal title="Add room" onClose={() => setModal(null)}><RoomForm onSubmit={addRoom} onCancel={() => setModal(null)}/></Modal>}
          {modal === 'editMenu' && <Modal title="Edit menu" onClose={() => setModal(null)}><MenuForm menu={menu} onSubmit={editMenu} onCancel={() => setModal(null)}/></Modal>}
        </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {sidebarOpen && <motion.button initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close overlay" />}
        {modal === 'resident' && <ModalWrap title="Add resident" subtitle="Create a new resident profile." onClose={() => setModal(null)}><ResidentForm residents={[]} onSubmit={createResident} onCancel={() => setModal(null)} /></ModalWrap>}
        {modal === 'editResident' && editTarget && <ModalWrap title="Edit resident" subtitle="Update resident details." onClose={() => { setModal(null); setEditTarget(null) }}><ResidentForm residents={[]} defaultValues={editTarget} onSubmit={updateResident} onCancel={() => { setModal(null); setEditTarget(null) }} /></ModalWrap>}
        {modal === 'complaint' && <ModalWrap title="Log a complaint" subtitle="Record a new maintenance or service request." onClose={() => setModal(null)}><ComplaintForm residents={residents} onSubmit={createComplaint} onCancel={() => setModal(null)} /></ModalWrap>}
        {modal === 'notice' && <ModalWrap title="Publish a notice" subtitle="Broadcast an update to residents." onClose={() => setModal(null)}><NoticeForm onSubmit={createNotice} onCancel={() => setModal(null)} /></ModalWrap>}
        {modal === 'payment' && <ModalWrap title="Record a payment" subtitle="Log a rent or fee payment." onClose={() => setModal(null)}><PaymentForm residents={residents} onSubmit={recordPayment} onCancel={() => setModal(null)} /></ModalWrap>}
        {modal === 'visitor' && <ModalWrap title="Register visitor" subtitle="Pre-register an expected visitor." onClose={() => setModal(null)}><VisitorForm residents={residents} onSubmit={createVisitor} onCancel={() => setModal(null)} /></ModalWrap>}

        {modal === 'qrpass' && (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <motion.div className="modal-card" style={{ maxWidth: 460, textAlign: 'center' }} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: 18 }}>Generate Visitor QR Pass</h2>
                  <p>Guest scans this to self-register at gate</p>
                </div>
                <button className="modal-close" onClick={() => setModal(null)}><X size={16}/></button>
              </div>
              <div style={{ padding: '20px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{ padding: 16, background: '#fff', borderRadius: 12, display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                  <QRCodeSVG value={`${window.location.origin}/self-check-in.html`} size={180} level="H" includeMargin={false} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', textAlign: 'left', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><QrCode size={12} style={{ color: 'var(--accent)' }}/><strong style={{ color: 'var(--text)', fontSize: 11 }}>Scan URL</strong></div>
                  <code style={{ fontSize: 10, color: 'var(--accent)', wordBreak: 'break-all' }}>{window.location.origin}/self-check-in.html</code>
                  <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.6 }}>
                    Guest scans → opens mobile form → fills name, phone, host &amp; ID → submits → <strong style={{ color: 'var(--accent)' }}>gate pass issued instantly</strong>.
                  </div>
                </div>
              </div>
              <div className="form-actions" style={{ justifyContent: 'center' }}>
                <Btn variant="secondary" onClick={() => setModal(null)}>Close</Btn>
                <Btn variant="primary" icon={<Printer size={14}/>} onClick={() => {
                  const checkInUrl = `${window.location.origin}/self-check-in.html`;
                  const w = window.open('', '_blank', 'width=430,height=580');
                  if (w) {
                    w.document.write('<html><head><title>Havenly Visitor Pass</title><style>body{font-family:sans-serif;padding:32px;text-align:center;background:#fff;color:#111}h2{font-size:20px;margin-bottom:6px}p.sub{color:#666;font-size:13px;margin-bottom:20px}img{display:block;margin:0 auto 16px;border-radius:8px}code{font-size:11px;color:#10b981;word-break:break-all;display:block;margin-top:8px}footer{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px}@media print{button{display:none}}</style></head><body><h2>Havenly Visitor Gate Pass</h2><p class="sub">Scan QR to self check-in at the gate</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(checkInUrl) + '" width="220" height="220"/><code>' + checkInUrl + '</code><footer>Issued by Havenly Property Management &bull; Valid for today only<br/>Present this pass + a valid photo ID at the gate</footer><script>window.onload=function(){window.print()}<\/script></body></html>');
                    w.document.close();
                  }
                  notify('QR Pass sent to printer');
                }}>Print Pass</Btn>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (

          <motion.div initial={{opacity:0,y:48,scale:0.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:24,scale:0.92}} className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
            {toast.type === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} aria-label="Dismiss"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function viewTitle(v: View) {
  return ({overview:'Overview',residents:'Residents',rooms:'Rooms & beds',complaints:'Complaints',payments:'Payments',visitors:'Visitors',mess:'Mess & meals',notices:'Notices'})[v]
}
function Btn({ children, variant='primary', icon, onClick, type='button', danger }:
  { children:ReactNode; variant?:'primary'|'secondary'|'ghost'; icon?:ReactNode; onClick?:()=>void; type?:'button'|'submit'; danger?:boolean }) {
  return <button type={type} className={`button button-${variant}${danger ? ' button-danger' : ''}`} onClick={onClick}>{icon}{children}</button>
}
function PageHeader({ eyebrow, title, description, children }:
  { eyebrow?:string; title:string; description:string; children?:ReactNode }) {
  return (
    <div className="page-header">
      <div><div className="eyebrow">{eyebrow||'Operations'}</div><h1>{title}</h1><p>{description}</p></div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}
function MiniStat({ icon, label, value, detail, tone }:
  { icon:ReactNode; label:string; value:string; detail:string; tone:string }) {
  return <div className="mini-stat"><div className={`mini-stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}
function StatusBadge({ status }:{ status:string }) {
  const n = status.toLowerCase().replaceAll(' ','-')
  return <span className={`status-badge status-${n}`}><i />{status}</span>
}
function EmptyState({ title, detail }:{ title:string; detail:string }) {
  return <div className="empty-state"><AlertCircle size={28} /><strong>{title}</strong><span>{detail}</span></div>
}
function ModalWrap({ title, subtitle, onClose, children }:
  { title:string; subtitle:string; onClose:()=>void; children:ReactNode }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="modal-backdrop">
      <motion.div initial={{opacity:0,y:16,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.97}} transition={{duration:0.22,ease:'easeOut'}} className="modal-card">
        <div className="modal-header">
          <div><h2>{title}</h2><p>{subtitle}</p></div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
function ChartTooltip({ active, payload, label }: { active?:boolean; payload?:Array<{name:string;value:number;color:string}>; label?:string }) {
  if (!active||!payload?.length) return null
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map(i=><span key={i.name}><i style={{background:i.color}} />{i.name}: {i.value}</span>)}</div>
}
function StatCard({ label,value,change,note,icon,tone,down=false }:
  { label:string;value:string;change:string;note:string;icon:ReactNode;tone:string;down?:boolean }) {
  return (
    <div className="stat-card">
      <div className="stat-top"><span className={`stat-icon ${tone}`}>{icon}</span></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        <span className={`change ${down?'change-down':''}`}>{down?<ArrowDownRight size={12}/>:<ArrowUpRight size={12}/>}{change}</span>
        <span>{note}</span>
      </div>
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ onNavigate, residents, complaints, payments, exportToCSV }:
  { onNavigate:(v:View)=>void; residents:Resident[]; complaints:Complaint[]; payments:Payment[]; exportToCSV?:()=>void }) {
  const activity = [
    { icon: UserRoundPlus, title: 'New resident added', detail: residents[0]?.name + ' · ' + residents[0]?.room, time: 'Just now', tone: 'green' },
    { icon: CreditCard, title: 'Payment recorded', detail: '₹' + fmt(payments[0]?.amount||0) + ' from ' + payments[0]?.resident, time: '42 min ago', tone: 'blue' },
    { icon: Wrench, title: 'Complaint assigned', detail: complaints[1]?.id + ' · ' + complaints[1]?.category, time: '2 hours ago', tone: 'orange' },
    { icon: Megaphone, title: 'Notice published', detail: 'Annual fire safety inspection', time: '3 hours ago', tone: 'purple' },
  ]
  const openComplaints = complaints.filter(c => c.status === 'Open').length
  const totalPaid = payments.filter(p => p.status === 'Paid').reduce((a,p) => a + p.amount, 0)
  return (
    <div className="view-stack">
      <PageHeader eyebrow="Tuesday, 17 September 2024" title="Good morning, Priya" description="Here's the pulse of your community today.">
        <Btn variant="secondary" icon={<Download size={15} />} onClick={exportToCSV}>Export report</Btn>
        <Btn icon={<Plus size={16} />} onClick={() => onNavigate('residents')}>Add resident</Btn>
      </PageHeader>

      <section className="hero-strip">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={13} /> Good things happen here</div>
          <h2>Your community is <em>thriving.</em></h2>
          <p>Occupancy is up 6.4% this month and collections are ahead of target.</p>
          <button onClick={() => onNavigate('rooms')}>View occupancy <ArrowRight size={14} /></button>
        </div>
        <div className="hero-illustration"><div className="sun-orb" /><div className="hill hill-one" /><div className="hill hill-two" /><div className="hero-house house-one"><span /><i /><b /></div><div className="hero-house house-two"><span /><i /><b /></div><div className="hero-tree"><span /><i /></div></div>
      </section>

      <div className="stats-grid">
        <StatCard label="Total occupancy" value="86.1%" change="6.4%" note="vs last month" icon={<BedDouble size={17}/>} tone="stat-green" />
        <StatCard label="Active residents" value={String(residents.filter(r=>r.status==='Active').length)} change="8" note="this month" icon={<Users size={17}/>} tone="stat-blue" />
        <StatCard label="Collected" value={"₹"+fmt(totalPaid)} change="4.2%" note="this month" icon={<CircleDollarSign size={17}/>} tone="stat-orange" />
        <StatCard label="Open complaints" value={String(openComplaints)} change={String(openComplaints)} note="need attention" icon={<Wrench size={17}/>} tone="stat-purple" down={openComplaints > 0} />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header"><div><h3>Occupancy overview</h3><p>Bed utilization across all properties</p></div></div>
          <div className="chart-legend"><span><i className="legend-dot" />Occupied</span><span><i className="legend-dot pale" />Available</span><strong>124 <small>/ 144 beds</small></strong></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height={220}><AreaChart data={occupancyData} margin={{top:10,right:4,left:-22,bottom:0}}><defs><linearGradient id="oFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.22}/><stop offset="100%" stopColor="#10b981" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#2a2a2a"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#555',fontSize:11}} dy={8}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#555',fontSize:10}} domain={[0,150]} ticks={[0,50,100,150]}/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="occupied" name="Occupied" stroke="#10b981" strokeWidth={2.5} fill="url(#oFill)" activeDot={{r:4,fill:'#10b981',stroke:'#000',strokeWidth:2}}/></AreaChart></ResponsiveContainer></div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h3>Action center</h3><p>Needs your attention</p></div><span className="attention-badge">{openComplaints + 4} open</span></div>
          <div className="action-list">
            <button className="action-item" onClick={() => onNavigate('complaints')}><div className="action-icon action-orange"><Wrench size={16}/></div><div><strong>{openComplaints} high priority complaints</strong><span>Review and assign staff</span></div><ArrowRight size={14} className="action-arrow"/></button>
            <button className="action-item" onClick={() => onNavigate('payments')}><div className="action-icon action-blue"><CreditCard size={16}/></div><div><strong>Overdue payments</strong><span>₹{fmt(payments.filter(p=>p.status==='Overdue').reduce((a,p)=>a+p.amount,0))} outstanding</span></div><ArrowRight size={14} className="action-arrow"/></button>
            <button className="action-item" onClick={() => onNavigate('residents')}><div className="action-icon action-purple"><UserRoundPlus size={16}/></div><div><strong>{residents.filter(r=>r.status==='Pending').length} pending move-ins</strong><span>Documents to review</span></div><ArrowRight size={14} className="action-arrow"/></button>
            <button className="action-item" onClick={() => onNavigate('visitors')}><div className="action-icon action-green"><DoorOpen size={16}/></div><div><strong>Expected visitors today</strong><span>Next at 6:30 PM</span></div><ArrowRight size={14} className="action-arrow"/></button>
          </div>
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel">
          <div className="panel-header"><div><h3>Property performance</h3><p>Occupancy by location</p></div></div>
          <div className="property-table">
            <div className="table-head"><span>Property</span><span>Occupancy</span><span>Collection</span><span>Trend</span></div>
            {[{name:'Northside House',loc:'Koramangala, BLR',occ:'92%',col:'₹12.4L',trend:'8.2%',t:'green'},{name:'Lakeview Co-living',loc:'Hitech City, HYD',occ:'81%',col:'₹7.8L',trend:'4.6%',t:'blue'},{name:'The Brick House',loc:'Viman Nagar, PNE',occ:'76%',col:'₹5.2L',trend:'2.1%',t:'orange'}].map(p=>(
              <div className="property-row" key={p.name}>
                <div className="property-name"><span className={`property-avatar ${p.t}`}>{p.name[0]}</span><span><strong>{p.name}</strong><small><MapPin size={10}/>{p.loc}</small></span></div>
                <strong>{p.occ}</strong><strong>{p.col}</strong><span className="trend-up"><ArrowUpRight size={12}/>{p.trend}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h3>Recent activity</h3><p>Latest updates</p></div></div>
          <div className="activity-list">
            {activity.map(item=>(
              <div className="activity-item" key={item.title}>
                <div className={`activity-icon activity-${item.tone}`}><item.icon size={14}/></div>
                <div><strong>{item.title}</strong><span>{item.detail}</span></div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// ─── Residents View ───────────────────────────────────────────────────────────
function ResidentsView({ residents, search, onAdd, onEdit, onDelete, exportToCSV }:
  { residents:Resident[]; search:string; onAdd:()=>void; onEdit:(r:Resident)=>void; onDelete:(id:string,name:string)=>void; exportToCSV?:()=>void }) {
  const [filter, setFilter] = useState('All')
  const filtered = useMemo(() =>
    residents.filter(r => `${r.name} ${r.room} ${r.property}`.toLowerCase().includes(search.toLowerCase()) && (filter==='All'||r.status===filter)),
    [residents,search,filter])
  return (
    <div className="view-stack">
      <PageHeader eyebrow="Community directory" title="Residents" description="One calm place for every resident relationship.">
        <Btn variant="secondary" icon={<Download size={15}/>} onClick={exportToCSV}>Export</Btn>
        <Btn icon={<Plus size={16}/>} onClick={onAdd}>Add resident</Btn>
      </PageHeader>
      <section className="mini-stat-row">
        <MiniStat icon={<Users size={15}/>} label="Active" value={String(residents.filter(r=>r.status==='Active').length)} detail="Currently residing" tone="green"/>
        <MiniStat icon={<UserRoundPlus size={15}/>} label="Pending" value={String(residents.filter(r=>r.status==='Pending').length)} detail="Awaiting move-in" tone="blue"/>
        <MiniStat icon={<Clock3 size={15}/>} label="Notice period" value={String(residents.filter(r=>r.status==='Notice period').length)} detail="Vacating soon" tone="orange"/>
        <MiniStat icon={<ShieldCheck size={15}/>} label="Total" value={String(residents.length)} detail="All residents" tone="purple"/>
      </section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="filter-tabs">
            {['All','Active','Pending','Notice period','Checked out'].map(s=>(
              <button key={s} className={filter===s?'selected':''} onClick={()=>setFilter(s)}>{s}<span>{residents.filter(r=>s==='All'||r.status===s).length}</span></button>
            ))}
          </div>
          <div className="toolbar-actions"><button className="filter-button"><Filter size={14}/> Filters</button><button className="icon-button"><SlidersHorizontal size={15}/></button></div>
        </div>
        <div className="data-table">
          <div className="data-row table-head"><span>Resident</span><span>Room</span><span>Lease</span><span>Rent</span><span>Status</span><span /></div>
          {filtered.map(r=>(
            <div className="data-row" key={r.id}>
              <div className="resident-cell"><div className={`avatar ${avatarTones[r.tone]}`}>{r.initials}</div><span><strong>{r.name}</strong><small>{r.phone}</small></span></div>
              <span className="room-cell"><BedDouble size={13}/>{r.room}</span>
              <span className="muted-text">{r.lease}</span>
              <strong style={{fontFamily:'Geist Mono,monospace',fontSize:'12px'}}>{r.amount}</strong>
              <StatusBadge status={r.status}/>
              <div style={{display:'flex',gap:'4px',justifyContent:'flex-end'}}>
                <button className="icon-button" onClick={()=>onEdit(r)} title="Edit"><Pencil size={14}/></button>
                <button className="icon-button" style={{color:'var(--red)'}} onClick={()=>onDelete(r.id,r.name)} title="Delete"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
          {filtered.length===0 && <EmptyState title="No residents found" detail="Try adjusting search or filter."/>}
        </div>
        <div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of {residents.length}</span></div>
      </section>
    </div>
  )
}

// ─── Rooms View ───────────────────────────────────────────────────────────────
function RoomsView({ rooms, notify, setRooms, onAdd }:
  { rooms:Room[]; notify:(m:string)=>void; setRooms:React.Dispatch<React.SetStateAction<Room[]>>; onAdd:()=>void }) {
  const [f, setF] = useState('All rooms')
  const shown = rooms.filter(r => f==='All rooms'||r.status===f)
  const toggle = (id:string) => {
    setRooms(c=>c.map(r=>r.id===id?{...r,status:r.status==='Maintenance'?'Good':'Maintenance'}:r))
    notify('Room status updated')
  }
  return (
    <div className="view-stack">
      <PageHeader eyebrow="Inventory & allocation" title="Rooms & beds" description="Know what's available and ready at a glance.">
        <Btn icon={<Plus size={16}/>} onClick={onAdd}>Add room</Btn>
      </PageHeader>
      <section className="room-overview">
        <div className="room-overview-card">
          <div className="room-ring"><div><strong>86%</strong><span>occupied</span></div></div>
          <div><span className="eyebrow">Portfolio occupancy</span><h3>124 <small>/ 144 beds</small></h3><p><span className="trend-up"><ArrowUpRight size={12}/>6.4%</span> from last month</p></div>
        </div>
        <div className="room-quick">
          <MiniStat icon={<CheckCircle2 size={15}/>} label="Ready" value={String(rooms.filter(r=>r.status==='Good').length)} detail="Move-in ready" tone="green"/>
          <MiniStat icon={<Wrench size={15}/>} label="Maintenance" value={String(rooms.filter(r=>r.status==='Maintenance').length)} detail="Being serviced" tone="orange"/>
          <MiniStat icon={<DoorOpen size={15}/>} label="Total rooms" value={String(rooms.length)} detail="Across all floors" tone="blue"/>
        </div>
      </section>
      <div className="section-heading">
        <div><h2>Room inventory</h2><p>Click a status to filter.</p></div>
        <div className="filter-tabs compact">
          {['All rooms','Good','Maintenance','Cleaning'].map(s=>(
            <button key={s} className={f===s?'selected':''} onClick={()=>setF(s)}>{s==='All rooms'?'All':s}</button>
          ))}
        </div>
      </div>
      <div className="room-grid">
        {shown.map(room=>(
          <article className="room-card" key={room.id}>
            <div className={`room-card-top ${room.accent}`}>
              <div><span className="room-label">{room.floor}</span><h3>{room.name}</h3><span className="room-type">{room.type}</span></div>
            </div>
            <div className="room-card-body">
              <div className="room-status-line"><StatusBadge status={room.status}/><span>{room.occupied}/{room.capacity} beds</span></div>
              <div className="bed-row">
                {Array.from({length:room.capacity}).map((_,i)=>(
                  <div className={`bed-chip ${i<room.occupied?'occupied':''}`} key={i}>
                    <BedDouble size={13}/><span>{i<room.residents.length?room.residents[i].split(' ')[0]:'Open'}</span>
                  </div>
                ))}
              </div>
              <div className="room-card-footer">
                <span><ShieldCheck size={13}/> KYC verified</span>
                <button onClick={()=>toggle(room.id)}>{room.status==='Maintenance'?'Mark ready':'Mark maintenance'}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ─── Complaints View ──────────────────────────────────────────────────────────
function ComplaintsView({ complaints, search, onAdd, onUpdate, onDelete, exportToCSV }:
  { complaints:Complaint[]; search:string; onAdd:()=>void; onUpdate:(id:string,s:Complaint['status'])=>void; onDelete:(id:string)=>void; exportToCSV?:()=>void }) {
  const [filter, setFilter] = useState('All')
  const filtered = complaints.filter(c =>
    `${c.title} ${c.resident} ${c.id}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter==='All'||c.status===filter))
  const count = (s:string) => complaints.filter(c=>c.status===s).length
  return (
    <div className="view-stack">
      <PageHeader eyebrow="Resident experience" title="Complaints" description="Resolve small things before they become big things.">
        <Btn variant="secondary" icon={<Download size={15}/>} onClick={exportToCSV}>Export</Btn>
        <Btn icon={<Plus size={16}/>} onClick={onAdd}>Log complaint</Btn>
      </PageHeader>
      <section className="mini-stat-row">
        <MiniStat icon={<AlertCircle size={15}/>} label="Open" value={String(count('Open'))} detail="Need attention" tone="orange"/>
        <MiniStat icon={<Clock3 size={15}/>} label="In progress" value={String(count('In progress'))} detail="Being resolved" tone="blue"/>
        <MiniStat icon={<CheckCircle2 size={15}/>} label="Resolved" value={String(count('Resolved'))} detail="This period" tone="green"/>
        <MiniStat icon={<MessageSquare size={15}/>} label="Total" value={String(complaints.length)} detail="All complaints" tone="purple"/>
      </section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="filter-tabs">
            {['All','Open','In progress','Resolved'].map(s=>(
              <button key={s} className={filter===s?'selected':''} onClick={()=>setFilter(s)}>{s} <span>{s==='All'?complaints.length:count(s)}</span></button>
            ))}
          </div>
          <div className="toolbar-actions"><button className="filter-button"><Filter size={14}/> Filter</button></div>
        </div>
        <div className="complaint-list">
          {filtered.map(item=>(
            <div className="complaint-row" key={item.id}>
              <div className={`priority-bar priority-${item.priority.toLowerCase()}`}/>
              <div className="complaint-main">
                <div className="complaint-heading"><strong>{item.title}</strong><span className={`priority-pill priority-${item.priority.toLowerCase()}`}>{item.priority}</span></div>
                <div className="complaint-meta"><span>{item.id}</span><span>{item.category}</span><span>{item.resident} · {item.room}</span><span>{item.age}</span></div>
              </div>
              <div className="complaint-assignee"><span>Assigned to</span><strong>{item.assignee}</strong></div>
              <select className={`complaint-status-select status-${item.status.toLowerCase().replaceAll(' ','-')}`} value={item.status} onChange={e=>onUpdate(item.id,e.target.value as Complaint['status'])}>
                <option>Open</option><option>In progress</option><option>Resolved</option>
              </select>
              <button className="icon-button" style={{color:'var(--red)'}} onClick={()=>onDelete(item.id)} title="Delete"><Trash2 size={14}/></button>
            </div>
          ))}
          {filtered.length===0 && <EmptyState title="No complaints found" detail="Try a different filter."/>}
        </div>
      </section>
    </div>
  )
}

// ─── Payments View ────────────────────────────────────────────────────────────
function PaymentsView({ payments, onAdd, onDelete, exportToCSV }:
  { payments:Payment[]; onAdd:()=>void; onDelete:(id:string)=>void; exportToCSV?:()=>void }) {
  const paid = payments.filter(p=>p.status==='Paid')
  const overdue = payments.filter(p=>p.status==='Overdue')
  const due = payments.filter(p=>p.status==='Due')
  const totalPaid = paid.reduce((a,p)=>a+p.amount,0)
  const totalOverdue = overdue.reduce((a,p)=>a+p.amount,0)
  return (
    <div className="view-stack">
      <PageHeader eyebrow="Finance & collections" title="Payments" description="Clear numbers, fewer follow-ups, healthier cash flow.">
        <Btn variant="secondary" icon={<Download size={15}/>} onClick={exportToCSV}>Export</Btn>
        <Btn icon={<Plus size={16}/>} onClick={onAdd}>Record payment</Btn>
      </PageHeader>
      <section className="mini-stat-row">
        <MiniStat icon={<CircleDollarSign size={15}/>} label="Collected" value={"₹"+fmt(totalPaid)} detail={`${paid.length} payments`} tone="green"/>
        <MiniStat icon={<Clock3 size={15}/>} label="Outstanding" value={"₹"+fmt(totalOverdue)} detail={`${overdue.length} overdue`} tone="orange"/>
        <MiniStat icon={<ReceiptText size={15}/>} label="Due this month" value={String(due.length)} detail="Pending invoices" tone="blue"/>
        <MiniStat icon={<ArrowUpRight size={15}/>} label="Total billed" value={"₹"+fmt(payments.reduce((a,p)=>a+p.amount,0))} detail="All time" tone="purple"/>
      </section>
      <div className="dashboard-grid payments-grid">
        <section className="panel">
          <div className="panel-header"><div><h3>Collections</h3><p>Collected vs outstanding (₹)</p></div></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData} barGap={6} margin={{top:8,right:4,left:-18,bottom:0}}>
                <CartesianGrid vertical={false} stroke="#2a2a2a"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#555',fontSize:11}} dy={8}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill:'#555',fontSize:10}} ticks={[0,10,20,30]}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4,4,0,0]} barSize={16}/>
                <Bar dataKey="outstanding" name="Outstanding" fill="#333" radius={[4,4,0,0]} barSize={16}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h3>Payment health</h3><p>Invoice breakdown</p></div></div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie data={[{name:'Paid',value:paid.length||1},{name:'Due',value:due.length||0},{name:'Overdue',value:overdue.length||0}]} innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value" stroke="none">
                  <Cell fill="#10b981"/><Cell fill="#f59e0b"/><Cell fill="#ef4444"/>
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><strong>₹{fmt(payments.reduce((a,p)=>a+p.amount,0))}</strong><span>total billed</span></div>
          </div>
          <div className="health-legend">
            <span><i className="legend-dot"/>Paid <strong>{paid.length}</strong></span>
            <span><i className="legend-dot yellow"/>Due <strong>{due.length}</strong></span>
            <span><i className="legend-dot red"/>Overdue <strong>{overdue.length}</strong></span>
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-header table-section-header"><div><h3>Transactions</h3><p>All recorded payments</p></div></div>
        <div className="data-table payments-table">
          <div className="data-row table-head"><span>Resident</span><span>Invoice</span><span>Date</span><span>Method</span><span>Amount</span><span>Status</span><span /></div>
          {payments.map((p,i)=>(
            <div className="data-row" key={p.id}>
              <div className="resident-cell"><div className={`avatar ${avatarTones[p.tone]}`}>{p.initials}</div><strong>{p.resident}</strong></div>
              <span className="muted-text">{p.invoice}</span>
              <span className="muted-text">{p.date}</span>
              <span className="muted-text">{p.method}</span>
              <strong style={{fontFamily:'Geist Mono,monospace'}}>₹{fmt(p.amount)}</strong>
              <StatusBadge status={p.status}/>
              <button className="icon-button" style={{color:'var(--red)'}} onClick={()=>onDelete(p.id)} title="Delete"><Trash2 size={14}/></button>
            </div>
          ))}
          {payments.length===0 && <EmptyState title="No payments yet" detail="Record a payment to get started."/>}
        </div>
      </section>
    </div>
  )
}

// ─── Visitors View ────────────────────────────────────────────────────────────
function VisitorsView({ visitors, search, onAdd, onUpdate, onDelete, onQR }:
  { visitors:Visitor[]; search:string; onAdd:()=>void; onUpdate:(id:string,s:Visitor['status'])=>void; onDelete:(id:string)=>void; onQR?:()=>void }) {
  return (
    <div className="view-stack">
      <PageHeader eyebrow="Access & security" title="Visitors" description="Pre-register and manage guest access seamlessly.">
        <Btn variant="secondary" icon={<QrCode size={15}/>} onClick={onQR}>Generate QR Pass</Btn>
        <Btn icon={<Plus size={16}/>} onClick={onAdd}>Register visitor</Btn>
      </PageHeader>
      <section className="visitor-hero">
        <div style={{position:'relative',zIndex:2}}>
          <div className="hero-kicker" style={{color:'var(--blue)'}}><Building2 size={13}/> Gate management</div>
          <h2>Know who's <em style={{color:'var(--blue)'}}>coming in.</em></h2>
          <p>Pre-register guests for fast check-in at the front desk.</p>
        </div>
        <div className="visitor-graphic">
          <div className="qr-card"><QrCode size={32}/><span>SCAN TO CHECK IN</span></div>
          <div className="visitor-ring ring-one"/><div className="visitor-ring ring-two"/>
        </div>
      </section>
      <section className="mini-stat-row">
        <MiniStat icon={<CalendarDays size={15}/>} label="Expected today" value={String(visitors.filter(v=>v.status==='Expected').length)} detail="Pre-registered" tone="blue"/>
        <MiniStat icon={<CheckCircle2 size={15}/>} label="Checked in" value={String(visitors.filter(v=>v.status==='Checked in').length)} detail="Currently inside" tone="green"/>
        <MiniStat icon={<DoorOpen size={15}/>} label="Checked out" value={String(visitors.filter(v=>v.status==='Checked out').length)} detail="Left premises" tone="orange"/>
        <MiniStat icon={<Users size={15}/>} label="Total visitors" value={String(visitors.length)} detail="All records" tone="purple"/>
      </section>
      <section className="panel table-panel">
        <div className="data-table visitor-table">
          <div className="data-row table-head"><span>Visitor</span><span>Host resident</span><span>Purpose</span><span>Time</span><span>Status</span><span /></div>
          {visitors.map(v=>(
            <div className="data-row" key={v.id}>
              <div className="resident-cell"><div className="avatar avatar-blue">{v.initials}</div><strong>{v.name}</strong></div>
              <span className="muted-text">{v.resident}</span>
              <span className="muted-text">{v.purpose}</span>
              <span className="muted-text" style={{fontFamily:'Geist Mono,monospace',fontSize:'10px'}}>{v.time}</span>
              <StatusBadge status={v.status}/>
              <div className="visitor-actions">
                {v.status==='Expected' && <button className="small-action" onClick={()=>onUpdate(v.id,'Checked in')}>Check in</button>}
                {v.status==='Checked in' && <button className="small-action" onClick={()=>onUpdate(v.id,'Checked out')}>Check out</button>}
                <button className="icon-button" style={{color:'var(--red)'}} onClick={()=>onDelete(v.id)} title="Delete"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
          {visitors.length===0 && <EmptyState title="No visitors" detail="Register a visitor to get started."/>}
        </div>
      </section>
    </div>
  )
}

// ─── Finance View ─────────────────────────────────────────────────────────────
function FinanceView({ payments, residents }: { payments: Payment[]; residents: Resident[] }) {
  const paid = payments.filter(p => p.status === 'Paid').reduce((a, p) => a + p.amount, 0);
  const due = payments.filter(p => p.status === 'Due').reduce((a, p) => a + p.amount, 0);
  const overdue = payments.filter(p => p.status === 'Overdue').reduce((a, p) => a + p.amount, 0);
  const total = paid + due + overdue;
  const fmt = (n: number) => n >= 100000 ? `${(n/100000).toFixed(1)}L` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);

  const monthlyData = [
    { month: 'Apr', collected: 68000, target: 82000, expenses: 24000 },
    { month: 'May', collected: 75000, target: 82000, expenses: 27000 },
    { month: 'Jun', collected: 71000, target: 82000, expenses: 22000 },
    { month: 'Jul', collected: 82000, target: 82000, expenses: 31000 },
    { month: 'Aug', collected: 79000, target: 82000, expenses: 28000 },
    { month: 'Sep', collected: paid, target: 82000, expenses: 19400 },
  ];

  const categoryData = [
    { name: 'Rent', value: Math.round(paid * 0.78), color: '#10b981' },
    { name: 'Utilities', value: Math.round(paid * 0.12), color: '#3b82f6' },
    { name: 'Mess fees', value: Math.round(paid * 0.07), color: '#f59e0b' },
    { name: 'Other', value: Math.round(paid * 0.03), color: '#8b5cf6' },
  ];

  const expenseItems = [
    { label: 'Maintenance & repairs', amount: 8400, pct: 43 },
    { label: 'Utilities (electricity, water)', amount: 5800, pct: 30 },
    { label: 'Cleaning & housekeeping', amount: 3200, pct: 16 },
    { label: 'Internet & connectivity', amount: 2000, pct: 10 },
  ];

  return (
    <div className="view-stack">
      <PageHeader eyebrow="Finance & analytics" title="Finance overview" description="Revenue tracking, expense breakdown, and collection health.">
        <Btn variant="secondary" icon={<Download size={15}/>} onClick={() => {
          const rows = payments.map(p => `${p.resident},${p.invoice},${p.date},${p.amount},${p.method},${p.status}`).join('\n');
          const blob = new Blob([`Resident,Invoice,Date,Amount,Method,Status\n${rows}`], { type: 'text/csv' });
          const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'finance-report.csv' });
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }}>Export report</Btn>
      </PageHeader>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top"><span className="stat-icon stat-green"><IndianRupee size={15}/></span></div>
          <div className="stat-label">Total collected</div>
          <div className="stat-value">₹{fmt(paid)}</div>
          <div className="stat-foot"><span className="change"><TrendingUp size={10}/>+12.4%</span><span>vs last month</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><span className="stat-icon stat-orange"><Clock3 size={15}/></span></div>
          <div className="stat-label">Pending / due</div>
          <div className="stat-value">₹{fmt(due)}</div>
          <div className="stat-foot"><span style={{color:'var(--amber)'}}>Due this cycle</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><span className="stat-icon stat-purple"><TrendingDown size={15}/></span></div>
          <div className="stat-label">Overdue</div>
          <div className="stat-value">₹{fmt(overdue)}</div>
          <div className="stat-foot"><span className="change change-down"><TrendingDown size={10}/>{payments.filter(p=>p.status==='Overdue').length} residents</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><span className="stat-icon stat-blue"><CircleDollarSign size={15}/></span></div>
          <div className="stat-label">Collection rate</div>
          <div className="stat-value">{total > 0 ? Math.round((paid/total)*100) : 0}%</div>
          <div className="stat-foot"><span className="change"><TrendingUp size={10}/>of ₹{fmt(total)} billed</span></div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Revenue vs Target Chart */}
        <section className="panel">
          <div className="panel-header">
            <div><h3>Revenue vs target</h3><p>Monthly collection performance</p></div>
          </div>
          <div className="chart-wrap" style={{ userSelect: 'none' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${Math.round(v/1000)}K`} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{label}</strong>
                    {payload.map((p: {name:string;value:number;color:string}) => <span key={p.name}><i style={{background:p.color}}/>{p.name}: ₹{fmt(p.value)}</span>)}
                  </div>
                ) : null} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="target" name="Target" fill="#1a1a1a" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span><i className="legend-dot"/>Collected</span>
            <span><i className="legend-dot pale"/>Target</span>
            <span><i className="legend-dot red"/>Expenses</span>
            <strong>Net: ₹{fmt(paid - 19400)}</strong><small>this month</small>
          </div>
        </section>

        {/* Revenue breakdown pie */}
        <section className="panel">
          <div className="panel-header"><div><h3>Revenue breakdown</h3><p>By collection category</p></div></div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, userSelect: 'none' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="chart-tooltip">
                    <span key={payload[0].name}><i style={{background:payload[0].payload.color}}/>{payload[0].name}: ₹{fmt(payload[0].value)}</span>
                  </div>
                ) : null} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {categoryData.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <i style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0, display: 'block' }}/>
                <span style={{ flex: 1, color: 'var(--text-2)' }}>{c.name}</span>
                <span style={{ fontFamily: 'Geist Mono,monospace', color: 'var(--text)', fontWeight: 600 }}>₹{fmt(c.value)}</span>
                <span style={{ color: 'var(--text-3)', minWidth: 32, textAlign: 'right' }}>{Math.round((c.value / paid) * 100)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Expenses breakdown */}
      <section className="panel">
        <div className="panel-header"><div><h3>Expense breakdown</h3><p>This month's operating costs</p></div>
          <span style={{ fontFamily: 'Geist Mono,monospace', fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>₹19,400</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
          {expenseItems.map(e => (
            <div key={e.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: 'var(--text-2)', display: 'flex', gap: 6, alignItems: 'center' }}>{e.label}</span>
                <span style={{ fontFamily: 'Geist Mono,monospace', color: 'var(--text)', fontWeight: 600 }}>₹{e.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="progress-track"><i className="red" style={{ width: e.pct + '%', background: '#ef4444' }}/></div>
            </div>
          ))}
        </div>
      </section>

      {/* Payment status table */}
      <section className="panel table-panel">
        <div className="panel-header"><div><h3>Payment ledger</h3><p>All transactions this cycle</p></div></div>
        <div className="data-table payments-table" style={{ marginTop: 12 }}>
          <div className="data-row table-head"><span>Resident</span><span>Invoice</span><span>Amount</span><span>Method</span><span>Date</span><span>Status</span></div>
          {payments.map(p => (
            <div className="data-row" key={p.id}>
              <div className="resident-cell"><div className={`avatar ${avatarTones[p.tone]}`}>{p.initials}</div><strong>{p.resident}</strong></div>
              <span className="muted-text" style={{ fontFamily: 'Geist Mono,monospace', fontSize: 10 }}>{p.invoice}</span>
              <span style={{ fontFamily: 'Geist Mono,monospace', fontWeight: 600 }}>₹{p.amount.toLocaleString('en-IN')}</span>
              <span className="muted-text">{p.method}</span>
              <span className="muted-text">{p.date}</span>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ─── Mess View ─────────────────────────────────────────────────────────────────
function MessView({ menu, notify, onEdit }:{ menu:MenuItem[]; notify:(m:string)=>void; onEdit:()=>void }) {
  const [done, setDone] = useState<string[]>(['Breakfast'])
  const toggle = (meal:string) => {
    setDone(d=>d.includes(meal)?d.filter(x=>x!==meal):[...d,meal])
    notify(done.includes(meal)?meal+' unmarked':meal+' marked as served')
  }
  return (
    <div className="view-stack">
      <PageHeader eyebrow="Dining operations" title="Mess & meals" description="Today's menu and dining attendance at a glance.">
        <Btn icon={<Pencil size={14}/>} onClick={onEdit}>Edit menu</Btn>
      </PageHeader>
      <section className="mess-summary">
        <div className="mess-summary-copy">
          <div className="hero-kicker" style={{color:'var(--amber)'}}><UtensilsCrossed size={13}/> Today's dining</div>
          <h2>Feeding a <em style={{color:'var(--amber)'}}>community.</em></h2>
          <p>78 residents opted in · 62 served so far</p>
          <div className="mess-progress"><span><i style={{width:'79%'}}/></span><strong>79% served</strong><small>· {done.length}/{menu.length} meals done</small></div>
        </div>
        <div className="mess-illustration"><div className="plate"><div className="plate-food food-one"/><div className="plate-food food-two"/><div className="plate-food food-three"/></div><div className="leaf leaf-one"/><div className="leaf leaf-two"/></div>
      </section>
      <div className="menu-grid">
        {menu.map(item=>(
          <div className={`menu-card ${done.includes(item.meal)?'meal-done':''}`} key={item.meal}>
            <button className={`meal-check ${done.includes(item.meal)?'checked':''}`} onClick={()=>toggle(item.meal)}>{done.includes(item.meal)?<CheckCircle2 size={12}/>:null}</button>
            <div className="menu-icon">{item.icon}</div>
            <div className="menu-copy">
              <span>{item.time}</span>
              <h3>{item.meal}</h3>
              <p>{item.items}</p>
              {item.tag && <span className={`meal-tag ${item.tag==='Served'?'served':''}`}>{item.tag==='Served'?<CheckCircle2 size={10}/>:<Clock3 size={10}/>}{item.tag}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid mess-lower">
        <section className="panel">
          <div className="panel-header"><div><h3>Attendance trends</h3><p>Weekly meal participation</p></div></div>
          <div className="attendance-bars">
            {[{label:'Breakfast',pct:84,cls:'green'},{label:'Lunch',pct:91,cls:'blue'},{label:'Dinner',pct:76,cls:'purple'}].map(a=>(
              <div className="attendance-row" key={a.label}>
                <div><span>{a.label}</span><strong>{a.pct}%</strong></div>
                <div className="progress-track"><i className={a.cls} style={{width:a.pct+'%'}}/></div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel feedback-card">
          <div className="panel-header"><div><h3>Resident feedback</h3><p>Latest dining rating</p></div></div>
          <div className="rating"><span>★★★★★</span> 4.8<small style={{fontFamily:'inherit',fontSize:'11px',color:'var(--text-3)',fontWeight:400}}>/5</small></div>
          <blockquote>"The lunch spread today was exceptional. The dal makhani was perfectly spiced and the rotis were served fresh."</blockquote>
          <div className="feedback-author">
            <div className="avatar avatar-purple avatar-xs">TM</div>
            <span><strong>Tara Menon</strong><small>C-208 · Lakeview Co-living</small></span>
          </div>
        </section>
      </div>
    </div>
  )
}

// ─── Notices View ─────────────────────────────────────────────────────────────
function NoticesView({ notices, onAdd, onDelete }:
  { notices:Notice[]; onAdd:()=>void; onDelete:(id:string)=>void }) {
  return (
    <div className="view-stack">
      <PageHeader eyebrow="Community communications" title="Notices" description="Keep residents informed with clear, timely updates.">
        <Btn icon={<Plus size={16}/>} onClick={onAdd}>Publish notice</Btn>
      </PageHeader>
      <div className="notice-summary">
        <div><h2>{notices.length}</h2><p>Active notices</p></div>
        <div style={{display:'flex',flexDirection:'column',gap:'2px'}}><strong style={{fontSize:'13px',color:'var(--text)'}}>Avg. read rate</strong><span style={{fontSize:'11px',color:'var(--text-3)'}}>85.3% across all notices</span></div>
        <div className="read-avatars">{['AM','DS','KN','MI','RK'].map(i=><div key={i} className="avatar avatar-mint avatar-xs">{i}</div>)}</div>
        <button style={{marginLeft:'auto',border:'none',background:'none',color:'var(--accent)',fontSize:'11px',fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'}} onClick={()=>{}}>Manage audience <ArrowRight size={13}/></button>
      </div>
      <div className="notice-grid">
        {notices.map(n=>(
          <div className="notice-card" key={n.id}>
            <div className={`notice-color ${n.color}`}/>
            <div className="notice-card-body">
              <div className="notice-meta">
                <span className={`notice-priority ${n.priority.toLowerCase()}`}>{n.priority}</span>
                <button className="icon-button" style={{color:'var(--red)'}} onClick={()=>onDelete(n.id)} title="Delete"><Trash2 size={13}/></button>
              </div>
              <h3>{n.title}</h3>
              <p>{n.excerpt}</p>
              <div className="notice-footer">
                <span><Users size={11}/>{n.audience}</span><span>{n.read}</span>
              </div>
              <div className="notice-author"><div className="avatar avatar-mint avatar-xs">PN</div><span>{n.author}</span><time>{n.date}</time></div>
            </div>
          </div>
        ))}
        {notices.length===0 && <EmptyState title="No notices" detail="Publish your first notice."/>}
      </div>
    </div>
  )
}

// ─── Forms ────────────────────────────────────────────────────────────────────
function ResidentForm({ residents, defaultValues, onSubmit, onCancel }:
  { residents:Resident[]; defaultValues?:Resident; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onCancel:()=>void }) {
  const isEdit = !!defaultValues
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <div className="form-field"><span>Full name *</span><input name="name" required placeholder="e.g. Aarav Mehta" defaultValue={defaultValues?.name}/></div>
        <div className="form-field"><span>Phone</span><input name="phone" placeholder="+91 98765 43210" defaultValue={defaultValues?.phone}/></div>
        <div className="form-field"><span>Room *</span><input name="room" required placeholder="e.g. A-203 · B1" defaultValue={defaultValues?.room}/></div>
        <div className="form-field"><span>Property *</span>
          <select name="property" defaultValue={defaultValues?.property||'Northside House'}>
            <option>Northside House</option><option>Lakeview Co-living</option><option>The Brick House</option>
          </select>
        </div>
        <div className="form-field"><span>Monthly rent (₹)</span><input name="amount" type="number" placeholder="18500" defaultValue={defaultValues?.amount?.replace(/[^0-9]/g,'')}/></div>
        {isEdit ? (
          <>
            <div className="form-field"><span>Status</span>
              <select name="status" defaultValue={defaultValues?.status}>
                <option>Active</option><option>Pending</option><option>Notice period</option><option>Checked out</option>
              </select>
            </div>
            <div className="form-field" style={{gridColumn:'1/-1'}}><span>Lease period</span><input name="lease" placeholder="Apr 2024 — Mar 2025" defaultValue={defaultValues?.lease}/></div>
          </>
        ) : (
          <div className="form-field"><span>Move-in date</span><input name="moveIn" type="date"/></div>
        )}
      </div>
      <div className="form-actions">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" icon={isEdit ? <Pencil size={14}/> : <Plus size={14}/>}>{isEdit?'Save changes':'Add resident'}</Btn>
      </div>
    </form>
  )
}

function ComplaintForm({ residents, onSubmit, onCancel }:
  { residents:Resident[]; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onCancel:()=>void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-field"><span>Issue title *</span><input name="title" required placeholder="Brief description of the issue"/></div>
      <div className="form-grid">
        <div className="form-field"><span>Reported by *</span>
          <select name="resident">
            {residents.map(r=><option key={r.id}>{r.name}</option>)}
            <option>Other</option>
          </select>
        </div>
        <div className="form-field"><span>Room / Location</span><input name="room" placeholder="e.g. A-203 bathroom"/></div>
        <div className="form-field"><span>Category</span>
          <select name="category"><option>Plumbing</option><option>Electrical</option><option>Internet</option><option>Appliances</option><option>Furniture</option><option>Cleaning</option><option>Security</option><option>General</option></select>
        </div>
        <div className="form-field"><span>Priority</span>
          <select name="priority"><option>Medium</option><option>High</option><option>Low</option></select>
        </div>
        <div className="form-field" style={{gridColumn:'1/-1'}}><span>Assign to staff</span>
          <select name="assignee">
            <option value="Unassigned">— Unassigned —</option>
            <option>Ramesh Kumar (Plumber)</option>
            <option>Sunil Yadav (Electrician)</option>
            <option>Prakash Singh (Maintenance)</option>
            <option>Deepa Nair (Cleaning)</option>
            <option>Mohan Das (Security)</option>
            <option>IT Support Team</option>
          </select>
        </div>
        <div className="form-field" style={{gridColumn:'1/-1'}}><span>Description</span><textarea name="description" rows={3} placeholder="Provide additional details about the issue, when it started, severity…"/></div>
      </div>
      <div className="form-actions">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" icon={<Plus size={14}/>}>Log complaint</Btn>
      </div>
    </form>
  )
}

function NoticeForm({ onSubmit, onCancel }:
  { onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onCancel:()=>void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-field"><span>Title *</span><input name="title" required placeholder="e.g. Scheduled maintenance on Sunday"/></div>
      <div className="form-grid">
        <div className="form-field"><span>Audience</span>
          <select name="audience"><option>All residents</option><option>Northside House</option><option>Lakeview Co-living</option><option>The Brick House</option></select>
        </div>
        <div className="form-field"><span>Priority</span>
          <select name="priority"><option>General</option><option>Important</option><option>Event</option></select>
        </div>
      </div>
      <div className="form-field"><span>Message *</span><textarea name="excerpt" required rows={3} placeholder="Write a clear, concise notice for your residents…"/></div>
      <div className="form-actions">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" icon={<Megaphone size={14}/>}>Publish notice</Btn>
      </div>
    </form>
  )
}

function PaymentForm({ residents, onSubmit, onCancel }:
  { residents:Resident[]; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onCancel:()=>void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <div className="form-field"><span>Resident *</span>
          <select name="resident">
            {residents.map(r=><option key={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-field"><span>Amount (₹) *</span><input name="amount" type="number" required placeholder="18500"/></div>
        <div className="form-field"><span>Payment method</span>
          <select name="method"><option>UPI</option><option>Bank transfer</option><option>Card</option><option>Cash</option></select>
        </div>
        <div className="form-field"><span>Date</span><input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]}/></div>
      </div>
      <div className="form-actions">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" icon={<CreditCard size={14}/>}>Record payment</Btn>
      </div>
    </form>
  )
}

function VisitorForm({ residents, onSubmit, onCancel }:
  { residents:Resident[]; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onCancel:()=>void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <div className="form-field"><span>Visitor name *</span><input name="name" required placeholder="e.g. Rahul Gupta"/></div>
        <div className="form-field"><span>Phone number *</span><input name="phone" type="tel" required placeholder="+91 98765 43210"/></div>
        <div className="form-field"><span>Purpose</span>
          <select name="purpose"><option>Family visit</option><option>Friend</option><option>Delivery</option><option>Official</option><option>Interview</option><option>Other</option></select>
        </div>
        <div className="form-field"><span>ID type</span>
          <select name="idType"><option>Aadhar Card</option><option>Driving Licence</option><option>Passport</option><option>Voter ID</option><option>PAN Card</option></select>
        </div>
        <div className="form-field"><span>ID number</span><input name="idNumber" placeholder="e.g. XXXX-XXXX-1234"/></div>
        <div className="form-field"><span>Vehicle number</span><input name="vehicle" placeholder="e.g. KA-01-AB-1234 (optional)"/></div>
        <div className="form-field"><span>Host resident *</span>
          <select name="resident">
            {residents.map(r=><option key={r.id} value={`${r.name} · ${r.room}`}>{r.name} · {r.room}</option>)}
          </select>
        </div>
        <div className="form-field"><span>Property</span>
          <select name="property"><option>Northside House</option><option>Lakeview Co-living</option><option>The Brick House</option></select>
        </div>
        <div className="form-field"><span>Expected arrival</span><input name="time" type="datetime-local" defaultValue={new Date(Date.now()+30*60000).toISOString().slice(0,16)}/></div>
        <div className="form-field"><span>Notes</span><input name="notes" placeholder="Anything the gate staff should know…"/></div>
      </div>
      <div className="form-actions">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" icon={<UserRoundPlus size={14}/>}>Register visitor</Btn>
      </div>
    </form>
  )
}

function RoomForm({ onSubmit, onCancel }:
  { onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onCancel:()=>void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <div className="form-field"><span>Room number *</span><input name="number" required placeholder="e.g. 204"/></div>
        <div className="form-field"><span>Capacity</span><input name="capacity" type="number" defaultValue={2} min={1}/></div>
        <div className="form-field"><span>Floor</span><input name="floor" type="number" defaultValue={2} min={0}/></div>
        <div className="form-field"><span>Property</span>
          <select name="property"><option>Northside House</option><option>Lakeview Co-living</option><option>The Brick House</option></select>
        </div>
      </div>
      <div className="form-actions">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" icon={<Plus size={14}/>}>Add room</Btn>
      </div>
    </form>
  )
}

function MenuForm({ menu, onSubmit, onCancel }:
  { menu:MenuItem[]; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onCancel:()=>void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <p style={{marginBottom: 16, fontSize:13, color:'var(--text-2)'}}>Update the daily mess menu.</p>
      {menu.map((m, i) => (
        <div className="form-field" key={m.meal} style={{marginBottom: 12}}>
          <span>{m.meal} ({m.time})</span>
          <input name={`menu_${i}`} defaultValue={m.items} required />
        </div>
      ))}
      <div className="form-actions">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" icon={<Pencil size={14}/>}>Save menu</Btn>
      </div>
    </form>
  )
}

export default App   
 