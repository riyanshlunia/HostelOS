# Havenly - Modern Co-Living & Property Management

Havenly is a comprehensive, production-ready web application designed for modern co-living spaces, PG (Paying Guest) accommodations, and property managers. It streamlines operations, resident management, finance tracking, and visitor security into a single, beautifully designed unified dashboard.

##  Features

- **Resident Management:** Track residents, view contact details, and manage check-ins/check-outs.
- **Access & Security:** Pre-register visitors, issue QR code gate passes, and track expected checkouts with overdue alerts.
- **Self Check-In Portal:** A dedicated, mobile-friendly external portal (`/self-check-in.html`) where visitors can register themselves and generate entry passes.
- **Finance & Analytics:** Comprehensive tracking of rent collections, outstanding dues, and operational expenses, featuring interactive charts and automated ledger exports.
- **Operations & Complaints:** Centralized ticketing system to assign, track, and resolve maintenance requests or resident complaints.
- **Dining & Mess Operations:** Track daily meal attendance and menu operations.
- **Room & Bed Allocation:** Visual grid of available and occupied beds.

##  Tech Stack

- **Frontend:** React (TypeScript)
- **Styling:** Vanilla CSS (CSS Variables, Flexbox/Grid, Dark Mode by default)
- **Icons & UI:** Lucide React, Framer Motion (for smooth transitions)
- **Charting:** Recharts
- **QR Generation:** QR Code React & QR Server API
- **Bundler:** Vite

##  Local Development

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd webdev
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. Open your browser and visit the local URL provided by Vite (usually `http://localhost:5173`).

##  Deployment (Free Hosting Ready)

This application is perfectly optimized to be deployed on any modern static hosting service like **Vercel**, **Netlify**, or **GitHub Pages**. 

Since Havenly is a Single Page Application (SPA) built with Vite, follow these standard steps:

1. **Build the production bundle:**
   ```bash
   npm run build
   ```
   This will generate a `dist` folder containing the optimized static assets.

2. **Routing Configuration:**
   - **Netlify:** A `_redirects` file is included in the `public` directory to handle React Router client-side routing.
   - **Vercel:** A `vercel.json` file is included in the root directory to handle client-side routing.

### Quick Deploy Links

- **Deploy to Vercel:** Simply import your Git repository into Vercel. Vercel will automatically detect Vite and configure the build settings.
- **Deploy to Netlify:** Import your repository into Netlify. The build command is `npm run build` and the publish directory is `dist`.

##  Security Best Practices Implemented

- **Data Sanitization:** Input handling on forms (visitors, complaints, auth) to prevent XSS.
- **Secure Authentication Flow:** The current version is a demo UI. When integrating your real backend, ensure JWTs are stored in HTTP-only cookies, not `localStorage`.
- **Dependency Management:** Regularly updated packages via npm to patch known vulnerabilities.
- **Static Assets:** Hosted on secure static CDNs with proper configuration to prevent directory traversal.

---
*Designed & built for modern property operations.*
