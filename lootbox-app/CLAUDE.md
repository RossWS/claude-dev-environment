# Claude Development Instructions

This document provides essential information for Claude to optimize operations when working on the DiscoveryBox lootbox application.

## 🚀 Starting the Development Environment

### Standard Development Server
To start the development instance consistently:

```bash
cd lootbox-app
npm start
```

This will:
- Start the backend server on **localhost:5000**
- Serve the frontend on **localhost:3000** 
- Connect to the SQLite database at `database/lootbox.db`
- Run in development mode with full logging

**IMPORTANT**: Always use `npm start` to ensure consistent environment setup. The server should display:
```
🚀 Server running on port 5000
🌐 Frontend: http://localhost:3000
📊 Environment: development
📦 Connected to SQLite database
```

### Database Preservation
**NEVER** overwrite or modify the main database file `database/lootbox.db` unless explicitly requested. This contains:
- User accounts and authentication data
- Trophy collections and progress
- Spin history and statistics
- Admin settings and configurations

If database operations are needed, always:
1. Create backups first: `cp database/lootbox.db database/backup-$(date +%Y%m%d-%H%M%S).db`
2. Use migrations in `database/migrations/` for schema changes
3. Test changes on a copy before applying to main database

## 📁 Project Structure

```
lootbox-app/
├── backend/
│   ├── server.js           # Main server entry point
│   ├── routes/            # API endpoints
│   │   ├── auth.js        # Authentication routes
│   │   ├── lootbox.js     # Lootbox game logic
│   │   ├── user.js        # User management
│   │   └── admin.js       # Admin panel routes
│   └── utils/
│       └── database.js    # Database utilities
├── frontend/
│   ├── index.html         # Main HTML file
│   ├── js/               # JavaScript modules
│   │   ├── utils.js      # Utility functions
│   │   ├── auth.js       # Authentication logic
│   │   ├── discoverybox.js # Main game logic
│   │   ├── ui.js         # UI components
│   │   └── components/   # Modular components
│   └── css/              # Stylesheets
└── database/
    ├── lootbox.db        # Main SQLite database (DO NOT MODIFY)
    └── migrations/       # Database schema migrations
```

## 🛠️ Common Operations

### Code Quality & Testing
Before making changes:
1. Check for JavaScript errors: Look for console errors in browser dev tools
2. Run linting (if available): `npm run lint`
3. Test core functionality: Ensure spins, authentication, and trophy systems work
4. Check responsive design: Test on different screen sizes

### Key System Commands
```bash
# Start development server
npm start

# Install new dependencies
npm install <package-name>

# Database backup
cp database/lootbox.db database/backup-$(date +%Y%m%d-%H%M%S).db

# View server logs (if running in background)
# Use BashOutput tool with the server's bash_id

# Kill server process (if needed)
pkill -f "node backend/server.js"
```

## 🎯 Feature Development Guidelines

### Frontend Development
- **CSS**: Modifications go in `frontend/css/components.css`
- **JavaScript**: Use existing utility classes in `utils.js` when possible
- **Components**: Follow existing patterns in `components/` directory
- **Styling**: Maintain existing design system and CSS variables

### Backend Development
- **Routes**: Add new endpoints in appropriate route files
- **Database**: Use `database.js` utilities for database operations
- **Authentication**: Respect existing auth middleware patterns
- **Validation**: Always validate user input and sanitize data

### Key Classes and Functions
- `Utils.countdown`: Countdown timer functionality
- `Utils.storage`: LocalStorage helpers
- `Utils.animation`: Animation utilities  
- `DiscoveryBoxGame`: Main game logic class
- `UI.showNotification()`: User notifications
- `api.lootbox.open()`: Core lootbox opening API

## 🚨 Critical Notes

### Database Safety
- The database contains user progress and should be treated as production data
- Always backup before structural changes
- Use migrations for schema changes
- Test database operations on copies first

### Server Management
- Only one server instance should run at a time
- Use `pkill -f "node backend/server.js"` to stop existing instances
- Check port 5000 availability before starting
- Monitor server logs for errors during development

### File Modifications
- **HTML**: Main file is `frontend/index.html`
- **CSS**: Primary stylesheet is `frontend/css/components.css`
- **JS**: Core logic in `frontend/js/` directory
- **API**: Backend routes in `backend/routes/`

### Testing Approach
When testing features:
1. Start with guest user functionality (no login required)
2. Test authenticated user features
3. Verify admin panel functionality (if applicable)
4. Check responsive behavior
5. Validate error handling

## 📝 Development Workflow

1. **Start Development Server**
   ```bash
   cd lootbox-app && npm start
   ```

2. **Make Code Changes**
   - Edit files using available tools
   - Follow existing patterns and conventions
   - Test incrementally

3. **Verify Changes**
   - Check browser console for errors
   - Test functionality in browser
   - Verify responsive design

4. **Database Operations** (if needed)
   - Backup database first
   - Use migrations for schema changes
   - Test on copy before applying to main DB

## 🔧 Troubleshooting

### Server Won't Start
- Check if port 5000 is in use: `lsof -i :5000`
- Kill existing processes: `pkill -f "node backend/server.js"`
- Verify all dependencies: `npm install`

### Database Issues
- Check database file permissions
- Ensure database/migrations/ directory exists
- Verify SQLite is accessible

### Frontend Issues  
- Check browser console for JavaScript errors
- Verify all CSS/JS files are loading (check Network tab)
- Ensure API endpoints are accessible

This document should be updated as the project evolves and new patterns emerge.