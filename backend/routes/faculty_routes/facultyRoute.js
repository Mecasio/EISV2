const express = require('express');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { db, db3 } = require('../database/database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/update_faculty", upload.single("profile_picture"), async (req, res) => {
  const { person_id } = req.body;

  if (!person_id || !req.file) {
    return res.status(400).send("Missing person_id or file.");
  }

  try {
    // ✅ Get student_number from person_id
    const [rows] = await db3.query(
      "SELECT employee_id FROM prof_table WHERE person_id = ?",
      [person_id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "employee id not found for person_id " + person_id });
    }

    const employee_id = rows[0].employee_id;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const year = new Date().getFullYear();
    const filename = `${employee_id}_1by1_${year}${ext}`;
    const uploadDir = path.join(__dirname, "../../uploads/Faculty1by1");
    const finalPath = path.join(uploadDir, filename);

    const files = await fs.promises.readdir(uploadDir);
    for (const file of files) {
      if (file.startsWith(`${employee_id}_1by1_`)) {
        await fs.promises.unlink(path.join(uploadDir, file));
      }
    }

    await fs.promises.writeFile(finalPath, req.file.buffer);

    await db3.query("UPDATE prof_table SET profile_image = ? WHERE person_id = ?", [filename, person_id]);

    res.status(200).json({ message: "Uploaded successfully", filename });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Failed to upload image.");
  }
});

module.exports = router;