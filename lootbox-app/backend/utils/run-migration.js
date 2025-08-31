const fs = require('fs');
const path = require('path');
const db = require('./database');

async function runMigration() {
    try {
        console.log('🔄 Running profile features migration...');
        
        // Read migration file
        const migrationPath = path.join(__dirname, '../../database/migrations/003_add_profile_features.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--'));
        
        // Execute each statement
        for (const statement of statements) {
            if (statement) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                await db.run(statement);
            }
        }
        
        console.log('✅ Migration completed successfully!');
        
    } catch (error) {
        // Check if error is about column already exists
        if (error.message.includes('duplicate column name')) {
            console.log('⚠️  Migration already applied (columns exist)');
        } else if (error.message.includes('table user_showcase already exists')) {
            console.log('⚠️  Migration already applied (table exists)');
        } else {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('🎉 Migration process completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = runMigration;