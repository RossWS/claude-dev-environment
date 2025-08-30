#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function backupDatabase() {
    const dbPath = path.join(__dirname, 'database/lootbox.db');
    const backupDir = path.join(__dirname, 'backups');
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `lootbox-backup-${timestamp}.db`);
    
    try {
        // Copy database file
        fs.copyFileSync(dbPath, backupPath);
        console.log(`✅ Database backed up successfully to: ${backupPath}`);
        
        // Keep only the last 10 backups
        const backups = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('lootbox-backup-') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(backupDir, file),
                time: fs.statSync(path.join(backupDir, file)).mtime
            }))
            .sort((a, b) => b.time - a.time);
        
        // Remove old backups (keep only 10 most recent)
        if (backups.length > 10) {
            const toDelete = backups.slice(10);
            toDelete.forEach(backup => {
                fs.unlinkSync(backup.path);
                console.log(`🗑️  Removed old backup: ${backup.name}`);
            });
        }
        
        return backupPath;
    } catch (error) {
        console.error('❌ Failed to backup database:', error.message);
        process.exit(1);
    }
}

// Run backup if called directly
if (require.main === module) {
    backupDatabase();
}

module.exports = backupDatabase;