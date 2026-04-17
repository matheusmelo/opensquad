const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const OPENSQUAD_BASE_PATH = process.env.OPENSQUAD_BASE_PATH || 'C:/inetpub/opensquad';
const uploadDir = path.join(OPENSQUAD_BASE_PATH, 'squads/shlomo-engineering/input');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
});

const upload = multer({ storage: storage });

router.post('/fatura', upload.single('fatura'), (req, res) => {
    // TBD: Logic to automatically trigger orchestrator PDF parser
    const run_id = `run-${Date.now()}`;
    res.json({ message: 'PDF recebido e extração iniciada', run_id });
});

module.exports = router;
