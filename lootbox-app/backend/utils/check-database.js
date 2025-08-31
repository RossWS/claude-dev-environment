const db = require('./database');

async function checkDatabase() {
    try {
        console.log('🔍 Checking database structure...');
        
        // Get users table info
        const usersInfo = await db.all("PRAGMA table_info(users)");
        console.log('\n📋 Users table columns:');
        usersInfo.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Check if user_showcase table exists
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('\n📋 All tables:');
        tables.forEach(table => {
            console.log(`  - ${table.name}`);
        });
        
        // Try to manually add missing columns
        const existingColumns = usersInfo.map(col => col.name);
        const requiredColumns = ['profile_public', 'show_stats', 'show_activity', 'updated_at'];
        
        for (const columnName of requiredColumns) {
            if (!existingColumns.includes(columnName)) {
                console.log(`\n➕ Adding missing column: ${columnName}`);
                
                let sql = '';
                switch (columnName) {
                    case 'profile_public':
                        sql = 'ALTER TABLE users ADD COLUMN profile_public BOOLEAN DEFAULT 0';
                        break;
                    case 'show_stats':
                        sql = 'ALTER TABLE users ADD COLUMN show_stats BOOLEAN DEFAULT 1';
                        break;
                    case 'show_activity':
                        sql = 'ALTER TABLE users ADD COLUMN show_activity BOOLEAN DEFAULT 1';
                        break;
                    case 'updated_at':
                        sql = 'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP';
                        break;
                }
                
                if (sql) {
                    await db.run(sql);
                    console.log(`✅ Added column: ${columnName}`);
                }
            } else {
                console.log(`✅ Column exists: ${columnName}`);
            }
        }
        
        // Try to create user_showcase table if it doesn't exist
        const showcaseTableExists = tables.some(table => table.name === 'user_showcase');
        if (!showcaseTableExists) {
            console.log('\n🏗️  Creating user_showcase table...');
            await db.run(`
                CREATE TABLE user_showcase (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    unlock_id INTEGER NOT NULL,
                    position INTEGER NOT NULL,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (unlock_id) REFERENCES user_unlocks(id) ON DELETE CASCADE,
                    UNIQUE(user_id, unlock_id),
                    UNIQUE(user_id, position)
                )
            `);
            console.log('✅ Created user_showcase table');
            
            // Create index
            await db.run('CREATE INDEX idx_user_showcase_user_id ON user_showcase(user_id)');
            console.log('✅ Created showcase index');
        } else {
            console.log('✅ user_showcase table exists');
        }
        
    } catch (error) {
        console.error('❌ Database check error:', error);
    }
}

// Run if called directly
if (require.main === module) {
    checkDatabase()
        .then(() => {
            console.log('\n🎉 Database check completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database check failed:', error);
            process.exit(1);
        });
}

module.exports = checkDatabase;