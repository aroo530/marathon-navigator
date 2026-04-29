# Marathon Navigator 🏃

Marathon Navigator is a mobile app for managing and participating in family-based marathon competitions. Families compete in challenges, tournaments, games, and activities to earn points and climb the leaderboard.

## Features

- **Marathon Management** - Browse and select from multiple ongoing marathons with detailed information
- **Leaderboard** - Real-time family rankings with total scores across all challenges
- **Challenges** - Weekly and general challenges with various types (Kahoot, projects, attendance, activities, games, tournaments)
- **Tournament Bracket** - Compete in tournament-style matchups with automatic point awards
- **Games & Activities** - Participate in various game types to earn points
- **Participant Tracking** - View all participating families and members
- **Multi-language Support** - Built-in i18n support for internationalization
- **Secure Authentication** - User authentication and family management via Supabase
- **Real-time Data Sync** - AsyncStorage for offline support and state persistence

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router with tab-based navigation
- **State Management**: React Context API
- **Backend**: Supabase (PostgreSQL)
- **UI Components**: React Native Paper
- **Styling**: React Native StyleSheet
- **Internationalization**: i18next
- **Icons**: Expo Vector Icons

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI: `npm install -g eas-cli`

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/aroo530/marathon-navigator.git
   cd marathon-navigator
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the app
   ```bash
   npx expo start
   ```

4. Open the app in:
   - **Development build**: Follow [Expo development builds guide](https://docs.expo.dev/develop/development-builds/introduction/)
   - **Android emulator**: `a` in Expo CLI
   - **iOS simulator**: `i` in Expo CLI
   - **Expo Go**: Scan the QR code with [Expo Go app](https://expo.dev/go)
   - **Web**: `w` in Expo CLI

## Project Structure

```
├── app/                     # Expo Router screens
│   └── (tabs)/             # Tab navigation layout
│       └── [marathonId]/   # Dynamic marathon routes
├── components/             # Reusable React components
├── context/                # React Context providers
│   ├── AuthContext.tsx
│   ├── FamilyContext.tsx
│   └── MarathonContext.tsx
├── services/               # API services (Supabase)
│   ├── marathonService.ts
│   ├── leaderboard.ts
│   ├── tournamentService.ts
│   └── challenges.ts
├── constants/              # App configuration
├── assets/                 # Images and static files
└── DDL.SQL                 # Database schema
```

## Key Screens

- **Leaderboard** - Track family rankings and scores
- **Challenges** - Weekly challenges with progress tracking
- **Tournament** - Bracket-style competitions between families
- **Games** - Interactive games and activities
- **Participants** - List of all participating families

## Scripts

```bash
npm start          # Start the app in development mode
npm run android    # Build and run on Android
npm run ios        # Build and run on iOS
npm run web        # Run web version
npm run lint       # Run ESLint
npm run reset-project  # Reset to fresh state
```

## Environment Setup

This project requires Supabase configuration. Set up your `.env` file with your Supabase credentials.

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## License

This project is private.
