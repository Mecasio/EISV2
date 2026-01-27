const express = require('express');
const { db, db3 } = require('../database/database');
const router = express.Router();

router.get("/applicant_number/:person_id", async (req, res) => {
  const { person_id } = req.params;

  try {
    const [rows] = await db.query("SELECT applicant_number FROM applicant_numbering_table WHERE person_id = ?", [person_id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Applicant number not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching applicant number:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/verification-status/:applicant_number", async (req, res) => {
  const { applicant_number } = req.params;

  try {
    // ✅ Step 1: Get person_id from applicant_number
    const [personRows] = await db.query(
      "SELECT person_id FROM applicant_numbering_table WHERE applicant_number = ?",
      [applicant_number]
    );
    if (personRows.length === 0) {
      return res.json({ verified: false, reason: "Applicant not found" });
    }

    const personId = personRows[0].person_id;

    // ✅ Step 2: Count how many verifiable requirements exist
    const [requirements] = await db.query(
      "SELECT COUNT(*) AS total_required FROM requirements_table WHERE is_verifiable = 1"
    );
    const totalRequired = requirements[0]?.total_required || 0;

    // ✅ Step 3: Count how many of those requirements were submitted & verified
    const [verifiedUploads] = await db.query(
      `
      SELECT COUNT(DISTINCT requirements_id) AS total_verified
      FROM requirement_uploads
      WHERE person_id = ?
      AND document_status = 'Documents Verified & ECAT'
      `,
      [personId]
    );
    const totalVerified = verifiedUploads[0]?.total_verified || 0;

    // ✅ Step 4: Check if applicant has an exam schedule
    const [schedule] = await db.query(
      `
      SELECT ees.*
      FROM exam_applicants ea
      JOIN entrance_exam_schedule ees ON ea.schedule_id = ees.schedule_id
      WHERE ea.applicant_id = ?
      `,
      [applicant_number]
    );
    const hasSchedule = schedule.length > 0;

    // ✅ Step 5: Determine if verified
    const fullyVerified = totalVerified >= totalRequired && hasSchedule;

    res.json({
      verified: fullyVerified,
      totalRequired,
      totalVerified,
      hasSchedule,
    });
  } catch (error) {
    console.error("Error checking applicant verification:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/verified-exam-applicants", async (req, res) => {
  try {
    // 1️⃣ Get all verifiable Regular requirement IDs dynamically
    const [reqRows] = await db.query(`
      SELECT id 
      FROM requirements_table 
      WHERE category = 'Regular' 
      AND is_verifiable = 1
    `);

    // 2️⃣ Convert the list of IDs into an array
    const requirementIds = reqRows.map(r => r.id);

    if (requirementIds.length === 0) {
      return res.status(400).json({ error: "No verifiable Regular requirements found." });
    }

    // 3️⃣ Construct placeholders for the IN clause dynamically
    const placeholders = requirementIds.map(() => "?").join(",");

    // 4️⃣ Use those IDs in the main query
    const [rows] = await db.query(
      `
      SELECT 
          ea.id AS exam_applicant_id,
          ea.applicant_id,
          ant.person_id,
          p.last_name,
          p.first_name,
          p.middle_name,
          p.emailAddress,
          p.program,
          ea.schedule_id
      FROM exam_applicants ea
      JOIN applicant_numbering_table ant 
          ON ea.applicant_id = ant.applicant_number
      JOIN person_table p 
          ON ant.person_id = p.person_id
      WHERE ant.person_id IN (
          SELECT person_id
          FROM requirement_uploads
          WHERE document_status = 'Documents Verified & ECAT'
            AND requirements_id IN (${placeholders})
          GROUP BY person_id
          HAVING COUNT(DISTINCT requirements_id) = ?
      )
      ORDER BY p.last_name ASC, p.first_name ASC
      `,
      [...requirementIds, requirementIds.length]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching verified exam applicants:", err);
    res.status(500).json({ error: "Failed to fetch verified exam applicants" });
  }
});

router.get("/exam-schedule/:applicant_number", async (req, res) => {
    const { applicant_number } = req.params;

    try {
      const [rows] = await db.query(`
      SELECT 
        s.day_description AS date_of_exam,
        s.start_time,
        s.end_time,
        s.building_description,
        s.room_description,
        s.proctor,
        s.created_at AS schedule_created_at
      FROM exam_applicants ea
      JOIN entrance_exam_schedule s 
        ON ea.schedule_id = s.schedule_id
      WHERE ea.applicant_id = ?
      LIMIT 1
    `, [applicant_number]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "No exam schedule found" });
      }

      res.json(rows[0]);
    } catch (err) {
      console.error("Error fetching exam schedule:", err);
      res.status(500).json({ error: "Database error" });
    }
});

router.get("/scheduled-by/:role", async (req, res) => {
  const { role } = req.params;

  try {
    const [rows] = await db3.query(
      `
      SELECT first_name, middle_name, last_name 
      FROM user_accounts 
      WHERE role = ? 
      LIMIT 1
      `,
      [role]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "No user found for that role" });
    }

    const { first_name, middle_name, last_name } = rows[0];
    const fullName = `${first_name || ""} ${middle_name ? middle_name + " " : ""}${last_name || ""}`.trim();

    res.json({ fullName });
  } catch (err) {
    console.error("❌ Error fetching user by role:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;