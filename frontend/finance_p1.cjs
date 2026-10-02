const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add 'finance' to View type
code = code.replace(
  "type View = 'overview' | 'residents' | 'rooms' | 'complaints' | 'payments' | 'visitors' | 'mess' | 'notices'",
  "type View = 'overview' | 'residents' | 'rooms' | 'complaints' | 'payments' | 'visitors' | 'mess' | 'notices' | 'finance'"
);

// 2. Extend Visitor type with checkoutTime and phone
code = code.replace(
  "type Visitor = {\n  id: string; name: string; resident: string; purpose: string; property: string\n  time: string; status: 'Expected' | 'Checked in' | 'Checked out'; initials: string\n}",
  "type Visitor = {\n  id: string; name: string; resident: string; purpose: string; property: string\n  time: string; checkoutTime?: string; phone?: string; status: 'Expected' | 'Checked in' | 'Checked out'; initials: string\n}"
);

// 3. Update navGroups — add Finance in a new Analytics group
code = code.replace(
  `  { label: 'Operations', items: [\n    { id: 'complaints' as View, label: 'Complaints', icon: Wrench, alert: true },\n    { id: 'payments' as View, label: 'Payments', icon: CreditCard },\n    { id: 'visitors' as View, label: 'Visitors', icon: DoorOpen },\n    { id: 'mess' as View, label: 'Mess & meals', icon: UtensilsCrossed },\n    { id: 'notices' as View, label: 'Notices', icon: Megaphone },\n  ]},\n]`,
  `  { label: 'Operations', items: [\n    { id: 'complaints' as View, label: 'Complaints', icon: Wrench, alert: true },\n    { id: 'payments' as View, label: 'Payments', icon: CreditCard },\n    { id: 'visitors' as View, label: 'Visitors', icon: DoorOpen },\n    { id: 'mess' as View, label: 'Mess & meals', icon: UtensilsCrossed },\n    { id: 'notices' as View, label: 'Notices', icon: Megaphone },\n  ]},\n  { label: 'Analytics', items: [\n    { id: 'finance' as View, label: 'Finance', icon: TrendingUp },\n  ]},\n]`
);

// 4. Add checkoutTime to seed visitors
code = code.replace(
  "{ id: 'v1', name: 'Nisha Mehta', resident: 'Aarav Mehta · A-203', purpose: 'Family visit', property: 'Northside House', time: 'Today, 6:30 PM', status: 'Expected', initials: 'NM' },",
  "{ id: 'v1', name: 'Nisha Mehta', resident: 'Aarav Mehta · A-203', purpose: 'Family visit', property: 'Northside House', time: 'Today, 6:30 PM', checkoutTime: 'Today, 9:00 PM', phone: '+91 98765 11111', status: 'Expected', initials: 'NM' },"
);
code = code.replace(
  "{ id: 'v2', name: 'Aditya Rao', resident: 'Diya Sharma · B-105', purpose: 'Friend', property: 'Northside House', time: 'Today, 5:00 PM', status: 'Checked in', initials: 'AR' },",
  "{ id: 'v2', name: 'Aditya Rao', resident: 'Diya Sharma · B-105', purpose: 'Friend', property: 'Northside House', time: 'Today, 5:00 PM', checkoutTime: 'Today, 7:00 PM', phone: '+91 99887 22222', status: 'Checked in', initials: 'AR' },"
);
code = code.replace(
  "{ id: 'v3', name: 'Sanjay Iyer', resident: 'Meera Iyer · A-110', purpose: 'Delivery', property: 'Northside House', time: 'Today, 3:45 PM', status: 'Checked out', initials: 'SI' },",
  "{ id: 'v3', name: 'Sanjay Iyer', resident: 'Meera Iyer · A-110', purpose: 'Delivery', property: 'Northside House', time: 'Today, 3:45 PM', checkoutTime: 'Today, 4:30 PM', phone: '+91 91234 33333', status: 'Checked out', initials: 'SI' },"
);
code = code.replace(
  "{ id: 'v4', name: 'Ananya Bose', resident: 'Tara Menon · C-208', purpose: 'Family visit', property: 'Lakeview Co-living', time: 'Tomorrow, 11:00 AM', status: 'Expected', initials: 'AB' },",
  "{ id: 'v4', name: 'Ananya Bose', resident: 'Tara Menon · C-208', purpose: 'Family visit', property: 'Lakeview Co-living', time: 'Tomorrow, 11:00 AM', checkoutTime: 'Tomorrow, 2:00 PM', phone: '+91 88776 44444', status: 'Expected', initials: 'AB' },"
);

// 5. Add TrendingUp, TrendingDown, IndianRupee, PieChart icons import
code = code.replace(
  "  Menu, MessageSquare, MoreHorizontal, Plus, Printer, QrCode, ReceiptText,",
  "  IndianRupee, Menu, MessageSquare, MoreHorizontal, Plus, Printer, QrCode, ReceiptText,"
);
code = code.replace(
  "  Wrench, X, Eye, EyeOff, Building2, Pencil, CalendarDays,",
  "  TrendingUp, TrendingDown, Wrench, X, Eye, EyeOff, Building2, Pencil, CalendarDays,"
);

fs.writeFileSync('src/App.tsx', code);
console.log('Phase 1 done - types, nav, seed data, imports updated');
