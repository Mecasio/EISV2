const express = require('express');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { db, db3 } = require('../database/database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const ROLE_PAGE_ACCESS = {
  admission: [103, 92, 96, 73, 1, 2, 3, 4, 5, 7, 8, 9, 11, 33, 48, 52, 61, 66, 98,],
  enrollment: [102, 96, 73, 6, 10, 12, 17, 36, 37, 43, 44, 45, 46, 47, 49, 60, 92, 108, 109],
  clinic: [101, 92, 96, 73, 24, 25, 26, 27, 28, 29, 30, 31, 19, 32],
  registrar: [80, 104, 38, 73, 39, 40, 41, 42, 56, 13, 50, 62, 96, 92, 59, 105, 15, 101],
  head: [102, 94, 96, 73, 6, 10, 12, 17, 36, 37, 43, 44, 45, 46, 47, 49, 60, 92, 108],
  dean: [102, 94, 96, 73, 6, 10, 12, 17, 36, 37, 43, 44, 45, 46, 47, 49, 60, 92, 108],
  superadmin: "ALL"
};

// POST CREATION ONLY
router.post("/register_registrar", upload.single("profile_picture"), async (req, res) => {
  try {
    const {
      employee_id,
      last_name,
      middle_name,
      first_name,
      role,
      email,
      password,
      status,
      dprtmnt_id
    } = req.body;

    const file = req.file;

    // 🧩 Validate required fields
    if (!employee_id || !last_name || !first_name || !role || !email || !password) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 🧩 Check duplicate email
    const [existing] = await db3.query(
      "SELECT id FROM user_accounts WHERE LOWER(email) = ?",
      [normalizedEmail]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 🔒 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 👤 Create person record
    const [personInsert] = await db3.query("INSERT INTO person_table () VALUES ()");
    const person_id = personInsert.insertId;

    // 🖼 IMAGE HANDLING — SAME AS POST & PUT
    let profilePicName = null;

    if (file) {
      const ext = path.extname(file.originalname).toLowerCase();
      const year = new Date().getFullYear();
      profilePicName = `${employee_id}_1by1_${year}${ext}`;

      const uploadDir = path.join(__dirname, "../../uploads/Admin1by1");
      const finalPath = path.join(uploadDir, profilePicName);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Clean old images (safety)
      const files = await fs.promises.readdir(uploadDir);
      for (const f of files) {
        if (f.startsWith(`${employee_id}_1by1_`)) {
          await fs.promises.unlink(path.join(uploadDir, f));
        }
      }

      await fs.promises.writeFile(finalPath, file.buffer);
    }

    // 🏷 Department NULL allowed
    const deptValue = dprtmnt_id === "" ? null : dprtmnt_id;

    // 💾 Save registrar
    await db3.query(
      `INSERT INTO user_accounts 
       (person_id, employee_id, last_name, middle_name, first_name, role, email, password, status, dprtmnt_id, profile_picture)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        person_id,
        employee_id,
        last_name,
        middle_name,
        first_name,
        "registrar",
        normalizedEmail,
        hashedPassword,
        status || 1,
        deptValue,
        profilePicName
      ]
    );

    // 📄 Page access
    let pageIds = ROLE_PAGE_ACCESS[role];

    if (role === "superadmin") {
      const [allPages] = await db3.query("SELECT id FROM page_table");
      pageIds = allPages.map(p => p.id);
    }

    const values = pageIds.map(pageId => [1, pageId, employee_id]);

    await db3.query(
      "INSERT INTO page_access (page_privilege, page_id, user_id) VALUES ?",
      [values]
    );

    res.status(201).json({ message: "Registrar account created successfully!" });

  } catch (error) {
    console.error("❌ Error creating registrar account:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST CREATION AND UPDATE OF PROFILE PICTURE
router.post("/update_registrar", upload.single("profile_picture"), async (req, res) => {
  const { person_id } = req.body;

  if (!person_id || !req.file) {
    return res.status(400).send("Missing person_id or file.");
  }

  try {
    // ✅ Get student_number from person_id
    const [rows] = await db3.query(
      "SELECT employee_id FROM user_accounts WHERE person_id = ?",
      [person_id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "student number not found for person_id " + person_id });
    }

    const employee_id = rows[0].employee_id;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const year = new Date().getFullYear();
    const filename = `${employee_id}_1by1_${year}${ext}`;
    const uploadDir = path.join(__dirname, "../../uploads/Admin1by1");
    const finalPath = path.join(uploadDir, filename);

    const files = await fs.promises.readdir(uploadDir);
    for (const file of files) {
      if (file.startsWith(`${employee_id}_1by1_`)) {
        await fs.promises.unlink(path.join(uploadDir, file));
      }
    }

    await fs.promises.writeFile(finalPath, req.file.buffer);

    await db3.query("UPDATE user_accounts SET profile_picture = ? WHERE person_id = ?", [filename, person_id]);

    res.status(200).json({ message: "Uploaded successfully", filename });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Failed to upload image.");
  }
});

// PUT UPDATE OF DATA AND PROFILE PICTURE
router.put("/update_registrar/:id", upload.single("profile_picture"), async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const file = req.file;

  try {
    const [existing] = await db3.query(
      "SELECT * FROM user_accounts WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({ message: "Registrar not found" });
    }

    const current = existing[0];
    let finalFilename = current.profile_picture;

    // 🖼 SAME IMAGE HANDLING AS POST
    if (file) {
      const ext = path.extname(file.originalname).toLowerCase();
      const year = new Date().getFullYear();
      finalFilename = `${current.employee_id}_1by1_${year}${ext}`;

      const uploadDir = path.join(__dirname, "../../uploads/Admin1by1");
      const finalPath = path.join(uploadDir, finalFilename);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Delete old images for this employee
      const files = await fs.promises.readdir(uploadDir);
      for (const f of files) {
        if (f.startsWith(`${current.employee_id}_1by1_`)) {
          await fs.promises.unlink(path.join(uploadDir, f));
        }
      }

      // Save new image
      await fs.promises.writeFile(finalPath, file.buffer);
    }

    const deptValue = data.dprtmnt_id === "" ? null : data.dprtmnt_id;

    await db3.query(
      `UPDATE user_accounts 
       SET employee_id=?, last_name=?, middle_name=?, first_name=?, role=?, email=?, status=?, dprtmnt_id=?, profile_picture=?
       WHERE id=?`,
      [
        data.employee_id || current.employee_id,
        data.last_name || current.last_name,
        data.middle_name || current.middle_name,
        data.first_name || current.first_name,
        "registrar",
        data.email?.toLowerCase() || current.email,
        data.status ?? current.status,
        deptValue,
        finalFilename,
        id
      ]
    );

    res.json({
      success: true,
      message: "Registrar updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating registrar:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;