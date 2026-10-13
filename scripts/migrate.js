require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Helper to ensure _migrations table exists
async function ensureMigrationsTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS _migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await sequelize.query(createTableQuery);
}

// Parse SQL into UP and DOWN blocks
function parseMigrationFile(content) {
    const upMarker = '-- UP';
    const downMarker = '-- DOWN';

    const upIndex = content.indexOf(upMarker);
    const downIndex = content.indexOf(downMarker);

    let upSql = '';
    let downSql = '';

    if (upIndex !== -1 && downIndex !== -1) {
        if (upIndex < downIndex) {
            upSql = content.substring(upIndex + upMarker.length, downIndex).trim();
            downSql = content.substring(downIndex + downMarker.length).trim();
        } else {
            downSql = content.substring(downIndex + downMarker.length, upIndex).trim();
            upSql = content.substring(upIndex + upMarker.length).trim();
        }
    } else if (downIndex !== -1) {
        upSql = content.substring(0, downIndex).trim();
        downSql = content.substring(downIndex + downMarker.length).trim();
    } else {
        upSql = content.trim();
    }

    return { upSql, downSql };
}

// Split multiple SQL statements by semicolon
function splitStatements(sql) {
    return sql
        .split(/;\s*$/m)
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
}

async function runUp() {
    console.log('🔄 Checking database migrations via Sequelize...');
    await ensureMigrationsTable();

    const rows = await sequelize.query('SELECT migration_name FROM _migrations ORDER BY id ASC', {
        type: QueryTypes.SELECT
    });
    const appliedMigrations = new Set(rows.map(r => r.migration_name));

    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.sql'))
        .sort();

    let appliedCount = 0;

    for (const file of files) {
        if (appliedMigrations.has(file)) {
            continue;
        }

        console.log(`➡️  Applying migration: ${file}`);
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { upSql } = parseMigrationFile(content);

        if (!upSql) {
            console.warn(`⚠️  No UP SQL statements found in ${file}`);
            continue;
        }

        const statements = splitStatements(upSql);
        const transaction = await sequelize.transaction();

        try {
            for (const stmt of statements) {
                await sequelize.query(stmt, { transaction });
            }

            await sequelize.query('INSERT INTO _migrations (migration_name) VALUES (?)', {
                replacements: [file],
                transaction
            });
            await transaction.commit();
            console.log(`✅ Applied migration: ${file}`);
            appliedCount++;
        } catch (err) {
            await transaction.rollback();
            console.error(`❌ Failed migration ${file}:`, err.message);
            process.exit(1);
        }
    }

    if (appliedCount === 0) {
        console.log('✨ All migrations are already up to date.');
    } else {
        console.log(`🎉 Successfully applied ${appliedCount} migration(s).`);
    }
}

async function runDown() {
    console.log('🔄 Checking database migrations for rollback via Sequelize...');
    await ensureMigrationsTable();

    const rows = await sequelize.query('SELECT id, migration_name FROM _migrations ORDER BY id DESC LIMIT 1', {
        type: QueryTypes.SELECT
    });

    if (rows.length === 0) {
        console.log('ℹ️  No migrations to rollback.');
        return;
    }

    const lastMigration = rows[0];
    const file = lastMigration.migration_name;
    const filePath = path.join(MIGRATIONS_DIR, file);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file ${file} not found on disk.`);
        process.exit(1);
    }

    console.log(`↩️  Rolling back migration: ${file}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { downSql } = parseMigrationFile(content);

    if (!downSql) {
        console.error(`❌ No DOWN SQL statements found in ${file} for rollback.`);
        process.exit(1);
    }

    const statements = splitStatements(downSql);
    const transaction = await sequelize.transaction();

    try {
        for (const stmt of statements) {
            await sequelize.query(stmt, { transaction });
        }

        await sequelize.query('DELETE FROM _migrations WHERE id = ?', {
            replacements: [lastMigration.id],
            transaction
        });
        await transaction.commit();
        console.log(`✅ Successfully rolled back migration: ${file}`);
    } catch (err) {
        await transaction.rollback();
        console.error(`❌ Failed rollback for ${file}:`, err.message);
        process.exit(1);
    }
}

async function main() {
    const command = process.argv[2] || 'up';

    try {
        if (command === 'down' || command === 'rollback') {
            await runDown();
        } else {
            await runUp();
        }
        process.exit(0);
    } catch (err) {
        console.error('Fatal migration error:', err);
        process.exit(1);
    }
}

main();
