#!/bin/bash

# DiscoveryBox.app Backup Script
# Usage: ./scripts/backup.sh

set -e

BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="database/discoverybox.db"
BACKUP_FILE="$BACKUP_DIR/discoverybox_backup_$DATE.db"

echo "🎬 Starting DiscoveryBox.app backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

# Create database backup
echo "💾 Creating database backup..."
sqlite3 "$DB_FILE" ".backup $BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "✅ Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "❌ Backup failed"
    exit 1
fi

# Compress backup
echo "🗜️  Compressing backup..."
gzip "$BACKUP_FILE"
COMPRESSED_FILE="$BACKUP_FILE.gz"

if [ -f "$COMPRESSED_FILE" ]; then
    COMPRESSED_SIZE=$(ls -lh "$COMPRESSED_FILE" | awk '{print $5}')
    echo "✅ Backup compressed: $COMPRESSED_FILE ($COMPRESSED_SIZE)"
fi

# Clean up old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "discoverybox_backup_*.db.gz" -mtime +7 -delete
REMAINING=$(ls -1 $BACKUP_DIR/discoverybox_backup_*.db.gz 2>/dev/null | wc -l)
echo "📊 Keeping $REMAINING recent backups"

# Optional: Upload to cloud storage (uncomment and configure)
# if [ ! -z "$AWS_ACCESS_KEY_ID" ] && [ ! -z "$BACKUP_S3_BUCKET" ]; then
#     echo "☁️  Uploading to S3..."
#     aws s3 cp "$COMPRESSED_FILE" "s3://$BACKUP_S3_BUCKET/backups/"
#     echo "✅ Backup uploaded to S3"
# fi

echo "🎉 Backup completed successfully!"
echo "📁 Backup location: $COMPRESSED_FILE"