const fs = require('fs');
const path = require('path');
const db = require('./database');

async function runTimezoneMigration() {
    try {
        console.log('🔄 Running timezone support migration...');
        
        // Read migration file
        const migrationPath = path.join(__dirname, '../../database/migrations/004_add_timezone_support.sql');
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
        
        console.log('✅ Timezone migration completed successfully!');
        
    } catch (error) {
        // Check if error is about column already exists
        if (error.message.includes('duplicate column name') || error.message.includes('already exists')) {
            console.log('⚠️  Migration already applied (timezone column exists)');
        } else {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    runTimezoneMigration()
        .then(() => {
            console.log('🎉 Timezone migration completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = runTimezoneMigration;