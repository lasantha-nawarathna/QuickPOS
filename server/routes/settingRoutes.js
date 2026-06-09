const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, backupDatabase, listBackups, downloadBackup, restoreDatabase } = require('../controllers/settingController');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Local upload config for database restore files
const tempDir = path.join(__dirname, '../../backups/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
const upload = multer({ dest: tempDir });

router.route('/')
  .get(protect, getSettings)
  .post(protect, authorize('Administrator'), updateSettings);

router.post('/backup', protect, authorize('Administrator'), backupDatabase);
router.get('/backup/list', protect, authorize('Administrator'), listBackups);
router.get('/backup/download/:filename', protect, authorize('Administrator'), downloadBackup);
router.post('/restore', protect, authorize('Administrator'), upload.single('db_file'), restoreDatabase);

module.exports = router;
