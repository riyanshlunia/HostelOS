const fs = require('fs');

let css = fs.readFileSync('src/styles.css', 'utf-8');

// A mapping of light colors to dark mode counterparts
const colorMap = {
  '#f7faf8': '#09090b', // app bg
  '#11241e': '#000000', // sidebar bg
  '#1f2e29': '#fafafa', // main text
  '#e6eeea': '#27272a', // line
  '#d8e4de': '#3f3f46', // line-dark
  '#fff': '#111111', // panel bg
  '#ffffff': '#111111',
  'rgba(255,255,255,.82)': 'rgba(10,10,10,.82)',
  '#2b795d': '#10b981', // primary button
  '#235f4a': '#059669', // primary hover
  '#52675e': '#a1a1aa', // secondary text
  '#dfe9e4': '#27272a', // secondary border
  '#f9fcfa': '#18181b', // secondary hover
  '#dfeee6': '#18181b', // hero strip bg
  '#d9eee4': '#09090b',
  '#eaf5e9': '#18181b',
  '#e5f0ec': '#27272a',
  '#2b4c3f': '#fafafa', // hero heading
  '#4da17e': '#34d399', // hero em
  '#759184': '#a1a1aa', // hero p
  '#f5f8f6': '#18181b', // search box bg
  '#edf2ef': '#27272a', // search box border
  '#9aa9a1': '#71717a', // search icon
  '#e1e9e5': '#3f3f46', // kbd border
  '#f0f4f2': '#27272a', // table borders
  '#2e4138': '#fafafa', // panel header
  '#97a59e': '#a1a1aa',
  '#2b3e36': '#fafafa', // stat value
  '#87968f': '#a1a1aa', // stat label
  '#4caf8b': '#10b981', // green chart
  '#cbded6': '#18181b', // available chart
  '#1d3a2f': '#000000', // tooltip bg
  '#f0f4f2': '#27272a', // property table row
  '#e9f6ef': '#064e3b', // active button bg
  '#347759': '#34d399', // active button text
  '#3f9f7e': '#10b981', // trend up
  '#d7886e': '#ef4444', // trend down
  '#a1ada7': '#a1a1aa',
  '#4f6059': '#fafafa', // breadcrumb strong
  '#86a097': '#a1a1aa', // eyebrow
  '#21352d': '#fafafa', // h1
  '#899890': '#a1a1aa', // h1 p
};

// Some regex to darken arbitrary hsl/rgb or hex if needed
for (const [light, dark] of Object.entries(colorMap)) {
  const regex = new RegExp(light.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  css = css.replace(regex, dark);
}

// Enhance shadow
css = css.replace(/0 14px 38px rgba\(42, 77, 63, \.08\)/g, '0 20px 40px rgba(0, 0, 0, .4)');
css = css.replace(/0 4px 12px rgba\(43,121,93,\.13\)/g, '0 4px 12px rgba(16, 185, 129, .2)');

// Add transitions for UI elements
css += `
/* Modern motion and UI enhancements */
.button, .nav-item, .stat-card, .panel, .room-card, .action-item {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.stat-card:hover, .room-card:hover, .menu-card:hover, .notice-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  border-color: #3f3f46;
}
.app-shell { background: #09090b; }
.topbar { background: rgba(9, 9, 11, 0.7); backdrop-filter: blur(20px); border-bottom: 1px solid #27272a; }
.sidebar { background: #000; border-right: 1px solid #27272a; }
.panel, .stat-card { background: #111111; border: 1px solid #27272a; }
.button-primary { background: #10b981; color: #000; font-weight: 700; box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
.button-primary:hover { background: #34d399; box-shadow: 0 0 25px rgba(16, 185, 129, 0.5); }
.button-secondary { background: #18181b; color: #fafafa; border: 1px solid #3f3f46; }
.button-secondary:hover { background: #27272a; border-color: #52525b; }
.search-box { background: #18181b; border: 1px solid #3f3f46; color: #fafafa; }
.search-box input { color: #fafafa; }
.nav-item.active { background: rgba(16, 185, 129, 0.15); color: #34d399; box-shadow: inset 3px 0 #10b981; }
.hero-strip { background: linear-gradient(110deg, #111111 0%, #18181b 60%, #09090b 100%); border: 1px solid #27272a; }
.hero-strip h2 { color: #fafafa; }
.hero-strip h2 em { color: #10b981; text-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
.room-overview-card { background: linear-gradient(120deg, #059669, #10b981); box-shadow: 0 15px 30px rgba(16, 185, 129, 0.2); }
.room-ring { background: conic-gradient(#34d399 0 86%, rgba(255,255,255,.2) 86% 100%); }
.room-ring::before { background: #059669; }
.toast { background: #111111; border: 1px solid #27272a; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }

/* Remove old gradients for avatar tones etc */
.avatar-mint { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
.avatar-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
.avatar-orange { background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); }
.avatar-purple { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
.avatar-pink { background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }
.avatar-yellow { background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); }

/* Room colors */
.room-green { background: rgba(16, 185, 129, 0.1); color: #34d399; }
.room-blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
.room-orange { background: rgba(249, 115, 22, 0.1); color: #fb923c; }
.room-purple { background: rgba(139, 92, 246, 0.1); color: #a78bfa; }
.room-pink { background: rgba(236, 72, 153, 0.1); color: #f472b6; }
.room-yellow { background: rgba(234, 179, 8, 0.1); color: #facc15; }

/* Notice colors */
.notice-coral { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); }
.notice-violet { background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); }
.notice-blue { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); }

/* Badges */
.status-badge { border: 1px solid transparent; }
.status-active, .status-good, .status-paid, .status-checked-in { background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.2); }
.status-pending, .status-cleaning, .status-expected, .status-due { background: rgba(249, 115, 22, 0.1); color: #fb923c; border-color: rgba(249, 115, 22, 0.2); }
.status-notice-period, .status-overdue, .status-maintenance { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2); }
.status-checked-out, .status-resolved { background: rgba(161, 161, 170, 0.1); color: #a1a1aa; border-color: rgba(161, 161, 170, 0.2); }
.status-in-progress { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border-color: rgba(59, 130, 246, 0.2); }

/* Modals */
.modal-card { background: #111111; border: 1px solid #27272a; box-shadow: 0 25px 70px rgba(0,0,0,0.8); }
.form-field input, .form-field select, .form-field textarea { background: #18181b; border: 1px solid #3f3f46; color: #fafafa; }
.form-field input:focus, .form-field select:focus, .form-field textarea:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }
.form-note { background: #18181b; border: 1px solid #27272a; }

/* Data tables */
.data-row { border-bottom: 1px solid #27272a; }
.table-footer { border-top: 1px solid #27272a; }

/* Filter tabs */
.filter-tabs button:hover { background: #18181b; color: #fafafa; }
.filter-tabs button.selected { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.filter-button { background: #18181b; border: 1px solid #3f3f46; color: #fafafa; }
.filter-button:hover { border-color: #10b981; }
`;

fs.writeFileSync('src/styles.css', css);
console.log('Done mapping css to dark mode.');
