# Stumble Higher

> Press one button. Discover the web.

A Web3-native content discovery platform that combines StumbleUpon-style browsing with tokenized community curation.

## 🌟 Features

- **One-Click Discovery**: Stumble through curated high-quality content
- **Community Curation**: Pay $HIGHER tokens to submit content, earn rewards for quality
- **Multi-Provider Auth**: Sign in with Farcaster, wallet, or email
- **Real-Time Voting**: Community-driven quality scoring with weighted votes
- **Personalized Recommendations**: AI-powered content discovery based on your interests
- **Weekly Rewards**: Top content creators earn $HIGHER tokens
- **Admin Dashboard**: Complete platform management interface

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd stumble-higher
   bun install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase and other credentials
   ```

3. **Database Setup**
   - Create a new Supabase project
   - Run the SQL scripts in `scripts/database-schema.sql`
   - Run the SQL scripts in `scripts/database-functions.sql`

4. **Migrate Content**
   ```bash
   node scripts/migrate-resources.js
   ```

5. **Start Development**
   ```bash
   bun dev
   ```

Visit `http://localhost:3000` to see your app!

## 🏗️ Architecture

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations

### Backend
- **Supabase** (PostgreSQL + Edge Functions + Real-time)
- **Multi-provider authentication** (Farcaster, Wallet, Email)
- **RESTful API** with comprehensive endpoints

### Web3 Integration
- **Wagmi + RainbowKit** for wallet connections
- **SIWE** (Sign In With Ethereum) for wallet auth
- **$HIGHER token** integration for submissions and rewards

### Database
- **PostgreSQL** with advanced functions
- **Real-time subscriptions** for live updates
- **Row Level Security** for data protection

## 📁 Project Structure

```
stumble-higher/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API endpoints
│   │   ├── admin/             # Admin dashboard
│   │   ├── submit/            # Content submission
│   │   └── stumble/           # Main stumbling interface
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── admin/             # Admin dashboard components
│   │   ├── resources/         # Content display components
│   │   ├── stumble/           # Stumbling interface
│   │   ├── submit/            # Submission flow
│   │   └── ui/                # Reusable UI components
│   ├── lib/                   # Utilities and configurations
│   ├── providers/             # React context providers
│   └── types/                 # TypeScript type definitions
├── scripts/                   # Setup and migration scripts
└── public/                    # Static assets
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/farcaster` - Farcaster authentication
- `POST /api/auth/wallet` - Wallet authentication
- `POST /api/auth/email/signup` - Email signup

### Content
- `GET /api/resources` - Get resources with filters
- `POST /api/resources` - Submit new resource
- `GET /api/discover` - Get personalized recommendations
- `POST /api/discover/interaction` - Track interactions

### Community
- `POST /api/votes` - Submit vote
- `GET /api/votes` - Get vote information
- `POST /api/user/favorites` - Toggle favorites

### Admin
- `GET /api/admin/check` - Check admin status
- `GET /api/admin/stats` - Get platform statistics
- `POST /api/admin/moderate` - Moderate content

## 🎯 Core Features

### 1. Stumbling Experience
- Personalized content discovery
- Multiple algorithm options (personalized, popular, recent, random)
- Real-time interaction tracking
- Seamless content viewing with proxy support

### 2. Community Curation
- Pay 1,000 $HIGHER tokens to submit content
- Weighted voting based on user reputation
- Automatic approval/rejection based on community consensus
- Weekly rewards for top-performing content

### 3. Multi-Provider Authentication
- **Farcaster**: Native integration with Farcaster frames
- **Wallet**: SIWE-based wallet authentication
- **Email**: Traditional email/password signup

### 4. Admin Dashboard
- Platform statistics and analytics
- Content moderation queue
- User management
- System configuration

## 🏛️ Database Schema

Key tables:
- `users` - User profiles and authentication
- `resources` - Submitted content and metadata
- `votes` - Community voting records
- `user_interactions` - Engagement tracking
- `weekly_rewards` - Reward distribution system

See `scripts/database-schema.sql` for complete schema.

## 🎨 Design System

### Colors
- **Brand Orange**: `#FF6D0E` (primary brand color)
- **Dark Theme**: Zinc color palette for backgrounds
- **Semantic Colors**: Green (success), Red (error), Yellow (warning)

### Components
- Consistent component library with variants
- Responsive design mobile-first
- Accessibility features built-in
- Custom vote buttons, resource cards, and controls

## 🔐 Security

- Row Level Security (RLS) in Supabase
- Input validation with Zod schemas
- Rate limiting on API endpoints
- Secure token storage and handling
- XSS and CSRF protection

## 📊 Analytics

- Comprehensive event tracking
- User interaction analytics
- Content performance metrics
- Platform health monitoring
- Real-time dashboard updates

## 🚀 Deployment

The app is configured for deployment on:
- **Vercel** (recommended for Next.js)
- **Netlify** (static export support)
- **Any Docker-compatible platform**

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Blockchain
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_HIGHER_TOKEN_ADDRESS=
NEXT_PUBLIC_SUBMISSION_CONTRACT_ADDRESS=

# Optional: Analytics, etc.
POSTHOG_API_KEY=
SENTRY_DSN=
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📜 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built for the Higher Market ecosystem
- Inspired by the original StumbleUpon
- Powered by Supabase and Next.js
- Community-driven curation model

---

**Happy Stumbling! 🎯**
