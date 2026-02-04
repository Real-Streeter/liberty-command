#!/bin/bash
# Daily SQLite backup — add to crontab:
# 0 2 * * * /var/www/liberty-command/deploy/backup.sh

BACKUP_DIR=/var/backups/liberty-command
DB_PATH=/var/www/liberty-command/server/data/liberty.db

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/liberty-$(date +%Y%m%d).db"

# Keep last 30 days
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete

echo "[$(date)] Backup completed"
