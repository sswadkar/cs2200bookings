# CS 2200 Bookings

[![Vercel Deployment](https://vercel.com/api/badges/sswadkar/cs2200bookings/status)](https://vercel.com/sswadkar/cs2200bookings)

**Live:** https://cs2200bookings.vercel.app

A comprehensive booking system for Georgia Tech's CS2200 course, enabling students to schedule office hours with Teaching Assistants (TAs), while providing administrators with tools to manage groups, slots, and users.

## Features

- **Role-based Access Control**: Separate interfaces for Admins, Students, and TAs
- **Admin Dashboard**: Manage students, TAs, booking groups, and time slots
- **Student Portal**: View available slots and book appointments
- **TA Dashboard**: View and manage their assigned groups and bookings
- **Real-time Updates**: Integrated with Supabase for live data synchronization
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts
- **Package Manager**: pnpm

## Prerequisites

- Node.js (version 18 or higher)
- pnpm
- Supabase account and project

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd cs2200bookings
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory with the following variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**

   Run the SQL scripts in the `scripts/` directory in order to set up your Supabase database:
   - `001-create-tables.sql`: Creates the initial database schema
   - `002-enable-rls.sql`: Enables Row Level Security
   - `003-seed-data.sql`: Seeds initial data
   - `004-fix-admin-registration-rls.sql`: Fixes RLS policies for admin registration
   - `005-add-slug-column.sql`: Adds slug column for booking groups
   - `006-restructure-for-roles-v2.sql`: Restructures database for role-based access
   - `007-seed-new-structure.sql`: Seeds data for the new structure
   - `008-atomic-booking-function.sql`: Adds atomic booking function
   - `009-fix-atomic-booking-function.sql`: Fixes the atomic booking function

   You can run these scripts through the Supabase dashboard or using the Supabase CLI.

## Usage

1. **Development**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

2. **Build for production**

   ```bash
   pnpm build
   pnpm start
   ```

3. **Linting**
   ```bash
   pnpm lint
   ```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── admin/             # Admin pages
│   ├── student/           # Student pages
│   └── ta/                # TA pages
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── admin/            # Admin-specific components
│   ├── student/          # Student-specific components
│   └── ta/               # TA-specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client configurations
│   └── utils/            # General utilities
├── public/                # Static assets
├── scripts/               # Database migration scripts
└── styles/                # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
