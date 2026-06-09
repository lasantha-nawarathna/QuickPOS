const { Setting, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

// Get all settings as key-value pairs
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });
    res.json({ success: true, data: settingsMap });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update or create settings
exports.updateSettings = async (req, res) => {
  const settingsData = req.body; // e.g. { store_name: "My Store", currency: "USD" }
  const t = await sequelize.transaction();

  try {
    for (const [key, value] of Object.entries(settingsData)) {
      const setting = await Setting.findOne({ where: { key }, transaction: t });
      if (setting) {
        await setting.update({ value: String(value) }, { transaction: t });
      } else {
        await Setting.create({ key, value: String(value) }, { transaction: t });
      }
    }
    await t.commit();
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// Trigger database backup (copy pos.sqlite)
exports.backupDatabase = async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const dbPath = path.join(__dirname, '../../pos.sqlite');
    if (!fs.existsSync(dbPath)) {
      return res.status(400).json({ success: false, message: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pos_backup_${timestamp}.sqlite`;
    const backupPath = path.join(backupsDir, backupFileName);

    // Copy file
    fs.copyFileSync(dbPath, backupPath);

    // Get list of all backups
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sqlite'));

    res.json({
      success: true,
      message: 'Database backup created successfully',
      data: {
        filename: backupFileName,
        backups: files
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// List available backups
exports.listBackups = async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '../../backups');
    let files = [];
    if (fs.existsSync(backupsDir)) {
      files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sqlite'));
    }
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download backup file
exports.downloadBackup = async (req, res) => {
  try {
    const fileName = req.params.filename;
    const backupPath = path.join(__dirname, '../../backups', fileName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    res.download(backupPath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Restore database from uploaded SQLite file
exports.restoreDatabase = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a valid database backup file' });
  }

  const uploadedFilePath = req.file.path;
  const dbPath = path.join(__dirname, '../../pos.sqlite');

  try {
    // 1. Close Sequelize connection to release file lock
    await sequelize.close();

    // 2. Overwrite the sqlite database
    fs.copyFileSync(uploadedFilePath, dbPath);

    // 3. Delete uploaded temp file
    fs.unlinkSync(uploadedFilePath);

    // 4. Reconnect Sequelize
    await sequelize.connectionManager.initPools();
    await sequelize.authenticate();

    res.json({ success: true, message: 'Database restored successfully! Re-authenticating...' });
  } catch (error) {
    // Attempt re-auth if failed
    try {
      await sequelize.authenticate();
    } catch (e) {}
    res.status(500).json({ success: false, message: `Database restoration failed: ${error.message}` });
  }
};
