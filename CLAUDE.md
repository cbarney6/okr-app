# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build production application (run before committing)
npm run start        # Start production server
npm run lint         # Run ESLint for code quality checks
```

### Deployment Workflow ("Go Time")
When the user says "Go Time", execute these three steps in order:
1. `npm run build` - Validate all code compiles
2. `git add . && git commit -m "message"` - Commit changes (use clean messages without Claude attribution)
3. `git push` - Push to GitHub (triggers automatic Vercel deployment)

### Database Management
```bash
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id ngudauyrlsdesjqorfnv > src/lib/database.types.ts
```

## Architecture Overview

### Application Purpose
OKR management system for Table Rock Business Advisory Services - an invite-only platform for select business clients to manage Objectives and Key Results. The app is multi-tenant with organization-based data isolation.

### Tech Stack
- **Frontend**: Next.js 15.5.0 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS with custom theme configuration and Geist fonts
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Deployment**: Vercel with automatic deployments from main branch

### Authentication System
Passwordless OTP authentication flow:
- Email-only authentication using 6-digit OTP codes
- Access code system for invite-only registration (validate_access_code function)
- First user in organization automatically becomes admin
- Sessions persist until manual logout
- Middleware protects routes and redirects unauthenticated users to home page

Key files:
- `/src/app/page.tsx` - Landing page with OTP sign-in
- `/src/app/register/page.tsx` - Multi-step registration with access codes
- `/src/app/verify-otp/page.tsx` - 6-digit OTP verification
- `/src/middleware.ts` - Route protection and auth redirects

### Database Architecture
Core tables with RLS (Row Level Security) enabled:
- `organizations` - Multi-tenant company data
- `profiles` - User profiles with roles (admin, user, view_only)
- `sessions` - OKR time periods with hierarchical structure
- `objectives` - Strategic goals linked to sessions
- `key_results` - Measurable outcomes for objectives
- `check_ins` - Progress tracking entries
- `user_invitations` - Token-based invitation system
- `access_codes` - Registration access control

### Key Architectural Patterns

#### Supabase Client Architecture
Two separate client configurations:
- `/src/utils/supabase/client.ts` - Browser client for client components
- `/src/utils/supabase/server.ts` - Server client with cookie handling for SSR

#### Component Structure
- `/src/components/layout/AuthenticatedLayout.tsx` - Main app wrapper with sidebar
- `/src/components/layout/NavigationSidebar.tsx` - Collapsible navigation
- Page-specific components organized by feature (auth, sessions, users, etc.)

#### API Routes Pattern
- RESTful endpoints in `/src/app/api/`
- Consistent error handling with proper HTTP status codes
- Supabase auth verification in each endpoint

### Current Implementation Status
- ✅ Complete authentication system with OTP
- ✅ User management and invitations
- ✅ Session management (CRUD operations)
- ✅ Dashboard with metrics
- 🔲 OKR objectives and key results (tables exist, UI partially implemented)
- 🔲 Check-ins and progress tracking (planned)
- 🔲 Reporting and analytics (planned)

## OKR Implementation Requirements

### OKR Page Layout
- **Table format**: OKRs column, Owner, Confidence, Progress, Tags, Description
- **Click interaction**: Clicking any Objective/Key Result opens detail window
- **Filters**: Session filter (default: All Sessions), Objective Owner filter (default: none)
- **Default view**: Show all OKRs in organization, filtered by selected criteria

### Detail Windows
#### Objective Details
- **Fields**: Session, Owner, OKR design score, Parent, Description, Tags
- **Progress section**: Shows associated Key Results with progress bars
- **Actions menu (3 dots)**: Edit, Move, Add Key Result, Add Child Objective, Delete

#### Key Result Details  
- **Fields**: Owner, Parent, Description, Initial/Actual/Target values, progress chart
- **Weekly updates**: Update button opens modal with Current value, New value, Confidence, Note, Date
- **Actions menu (3 dots)**: Edit, Move, Update, Delete
- **Update history**: Shows timestamped progress updates on bottom right

### CRUD Operations
- **Create**: Existing functionality for Objectives and Key Results
- **Read**: Detail windows with full information display
- **Update**: Edit modals pre-populated with current values, weekly update system for Key Results
- **Delete**: Confirmation dialogs before deletion
- **Move**: Session selection first, then available parent selection (Objectives or Key Results)

### Parent-Child Relationships
- **Hierarchical dropdown**: Shows Sessions > Objectives > Key Results structure
- **Parent options**: Objectives can parent other Objectives or Key Results within same session
- **Child creation**: Pre-populates Session, Owner, Parent but allows changes

### Required API Endpoints
- `/api/objectives` - CRUD operations for objectives
- `/api/key-results` - CRUD operations for key results  
- `/api/key-results/[id]/updates` - Weekly progress updates (check-ins)

### Implementation Plan (5 Groups)
#### Group 1: API Foundation
- Create `/api/objectives` endpoint (GET, POST, PUT, DELETE)
- Create `/api/key-results` endpoint (GET, POST, PUT, DELETE) 
- Create `/api/key-results/[id]/updates` endpoint for weekly check-ins
- Ensure proper RLS enforcement and organization-based filtering

#### Group 2: Basic Detail Views
- Create `ObjectiveDetailModal` component (read-only)
- Create `KeyResultDetailModal` component (read-only)
- Update OKRs page to make table rows clickable
- Fetch and display complete objective/key result data

#### Group 3: Edit Functionality
- Add edit mode toggle to detail modals
- Pre-populate edit forms with current values
- Implement save functionality using API endpoints
- Handle parent selection within same session

#### Group 4: Advanced CRUD Operations
- Implement delete with confirmation dialogs
- Create move functionality (Key Results to different Objectives)
- Build weekly update modal for Key Results progress
- Add actions menu (3-dots) with all operations

#### Group 5: Enhanced UI & Filters
- Add session filter dropdown (default: All Sessions)
- Add objective owner filter dropdown
- Implement table layout matching mockups
- Improve parent selection with hierarchical display

**Dependencies**: Sequential execution, each group enables the next
**Rollback Strategy**: Self-contained groups, additive changes, easily reversible

## Important Context

### User Preferences
- Minimal comments in code unless specifically requested
- Always prefer editing existing files over creating new ones
- Never create documentation files unless explicitly requested
- Follow existing code patterns and conventions
- Run build/lint before committing

### Supabase Configuration
- Project URL: `https://ngudauyrlsdesjqorfnv.supabase.co`
- Email OTP configured (not magic links)
- Email confirmation disabled in Supabase settings for OTP to work
- Sample access codes for testing: TABLEROCK2024, BETA2024, VIP2024

### Known Issues & Solutions
- If OTP emails show magic links instead of codes: Check Supabase Email Templates, ensure using `{{ .Token }}` not `{{ .ConfirmationURL }}`
- Build warnings about unused variables are acceptable if build succeeds
- Dashboard metric cards use hover tooltips to prevent text overflow
- PGRST116 errors (406 status) are expected when checking if email exists - this means "no rows found" and is handled correctly in code
- NavigationSidebar.tsx is deprecated - use AuthenticatedLayout.tsx for sidebar functionality

### Testing Accounts
- `cbarney6@gmail.com` - Existing test account with session data
- Use OTP flow to sign in (no passwords in system anymore)

### Authentication Flow Implementation Details

#### Registration Flow (`/src/app/register/page.tsx`)
- **Email Validation**: Real-time validation with proper format checking (`/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/`)
- **Debouncing**: 800ms delay before checking if email exists in database
- **Organization Code**: 6-digit numeric code, only enabled after email validation succeeds
- **Error Handling**: PGRST116 errors (`checkError.code === 'PGRST116'`) indicate email is available
- **Full Name**: Mandatory field collected during registration
- **Progressive Form**: Organization code field disabled until email validated as available

#### OTP Verification (`/src/app/verify-otp/page.tsx`)
- **Token Timeout**: 5 minutes (300 seconds) on frontend, 1 hour (3600 seconds) in Supabase
- **Double Submit Prevention**: `isVerified` state prevents multiple OTP submissions
- **Session Establishment**: Exponential backoff verification with up to 20 retries
- **Organization Creation**: Generates unique 6-digit org_code using database function
- **Profile Creation**: Check-then-insert logic to handle existing profiles correctly

#### User Profile Display (`/src/components/layout/AuthenticatedLayout.tsx`)
- **Dynamic Loading**: User profile loaded via useEffect on component mount
- **Data Priority**: Uses `profile.email` first, falls back to `user.email`
- **Initials Generation**: Automatically generates from full name (first + last letter)
- **Loading States**: Shows "Loading email..." while fetching data

### CSS Design System Standards

#### Typography
- **Font Family**: Geist Sans (loaded via Next.js font optimization)
- **Font Scale**:
  - Headings: text-5xl (main headers), text-2xl (section headers), text-xl (subsections)
  - Body: text-base, text-sm for secondary content
  - Small/Muted: text-xs for captions and helper text
- **Font Weights**: font-extrabold (800) for main headers, font-bold for emphasis, font-semibold for subheadings, font-normal for body

#### Color System
- **Text Colors**:
  - Primary text: text-gray-900 (headings and input text)
  - Body text: text-gray-700 (labels and primary content)
  - Muted text: text-gray-500 or text-gray-600 (descriptions and secondary content)
  - Input placeholders: placeholder-gray-400
- **Backgrounds**: bg-white (primary), bg-gray-50/100 (subtle backgrounds)
- **Borders**: border-gray-300 (visible borders), border-gray-200 (subtle borders)
- **Primary Brand**: blue-600 (actions, links, primary buttons)
- **Status Colors**: green-600 (success), orange-600 (warning), red-600 (error)

#### Form Inputs
- All input fields must include `text-gray-900` for proper text contrast
- Use `placeholder-gray-400` for placeholder text
- Standard input classes: `px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`

#### Special Styling
- Main landing page header uses custom letter-spacing: `style={{ letterSpacing: '0.02em', fontWeight: 800 }}`
- Borders on gray backgrounds use `border-gray-300` for better visibility

#### Files with Styling Configuration
- `/tailwind.config.ts` - Tailwind theme configuration with custom colors and fonts
- `/src/app/globals.css` - Global CSS with HSL color variables and font setup