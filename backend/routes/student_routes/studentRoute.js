const express = require('express');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { db, db3 } = require('../database/database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/student-info", async (req, res) => {
  const {searchQuery, campus} = req.query;

  try{
    const keyword = `%${searchQuery}%`;

    const [searchStudentNumber] = await db3.query(
      `
      SELECT snt.student_number
      FROM student_numbering_table snt
      INNER JOIN person_table pt ON snt.person_id = pt.person_id
      WHERE 
        pt.emailAddress = ?
        OR pt.first_name LIKE ?
        OR pt.last_name LIKE ?
        OR pt.middle_name LIKE ?
        OR snt.student_number = ?
      `,
      [searchQuery, keyword, keyword, keyword, searchQuery]
    );

    if(searchStudentNumber.length === 0){
      return res.status(400).json({error: "student is not found"});
    }

    const student_number = searchStudentNumber[0].student_number;

    const [rows] = await db3.query(
      `
        SELECT DISTINCT
          pst.first_name,
          pst.middle_name,
          pst.last_name, 
          pst.presentStreet,
          pst.emailAddress,
          pst.cellphoneNumber,
          pst.campus,
          pst.presentBarangay,
          pst.presentZipCode,
          pst.presentMunicipality,
          pgt.program_description, 
          yrt_cur.year_description, 
          yrt_sy.year_description AS current_year, 
          smt.semester_description,
          snt.student_number,
          ylt.year_level_description
        FROM enrolled_subject es
          INNER JOIN student_numbering_table snt ON es.student_number = snt.student_number
          INNER JOIN person_table pst ON snt.person_id = pst.person_id
          INNER JOIN student_status_table sst ON snt.student_number = sst.student_number 
          	AND es.active_school_year_id = sst.active_school_year_id
          INNER JOIN curriculum_table cct ON es.curriculum_id = cct.curriculum_id
          INNER JOIN program_table pgt ON cct.program_id = pgt.program_id
          INNER JOIN active_school_year_table sy ON es.active_school_year_id = sy.id
          INNER JOIN year_table yrt_cur ON cct.year_id = yrt_cur.year_id
          INNER JOIN year_table yrt_sy ON sy.year_id = yrt_sy.year_id
          INNER JOIN year_level_table ylt ON sst.year_level_id = ylt.year_level_id
          INNER JOIN semester_table smt ON sy.semester_id = smt.semester_id
          WHERE es.student_number = ? AND sy.astatus = 1 AND pst.campus = ?;
      `, [student_number, campus]
    )

    if(rows.length === 0){
      return res.status(400).json({error: "student record is not found"});
    }

    res.json(rows)
  } catch (err) {
    console.error("Failed to get student record:", err);
    res.status(500).send("Failed to get student record.");
  }
})

router.get("/student-info/:student_number", async (req, res) => {
  const {student_number} = req.params;

  try{
    const [rows] = await db3.query(
      `
        SELECT DISTINCT
          pgt.program_description, 
          yrt_cur.year_description, 
          yrt_sy.year_description AS current_year, 
          smt.semester_description,
          snt.student_number,
          es.final_grade,
          es.en_remarks,
          ylt.year_level_description, 
          cst.course_id,
		      cst.course_code,
          cst.course_description,
          cst.course_unit
        FROM enrolled_subject es
          INNER JOIN student_numbering_table snt ON es.student_number = snt.student_number
          INNER JOIN student_status_table sst ON snt.student_number = sst.student_number
            AND es.active_school_year_id = sst.active_school_year_id
          INNER JOIN curriculum_table cct ON es.curriculum_id = cct.curriculum_id
          INNER JOIN program_table pgt ON cct.program_id = pgt.program_id
          INNER JOIN active_school_year_table sy ON es.active_school_year_id = sy.id
          INNER JOIN year_table yrt_cur ON cct.year_id = yrt_cur.year_id
          INNER JOIN year_table yrt_sy ON sy.year_id = yrt_sy.year_id
          INNER JOIN year_level_table ylt ON sst.year_level_id = ylt.year_level_id 
          INNER JOIN semester_table smt ON sy.semester_id = smt.semester_id
          INNER JOIN course_table cst ON es.course_id = cst.course_id
          WHERE es.student_number = ? ORDER BY ylt.year_level_id;
      `, [student_number]
    )

    if(rows.length === 0){
      return res.status(400).json({error: "student record is not found"});
    }

    res.json(rows)
  } catch (err) {
    console.error("Failed to get student record:", err);
    res.status(500).send("Failed to get student record.");
  }
})

router.post("/update_student", upload.single("profile_picture"), async (req, res) => {
  const { person_id } = req.body;
  if (!person_id || !req.file) {
    return res.status(400).send("Missing person_id or file.");
  }

  try {
    // ✅ Get student_number from person_id
    const [rows] = await db3.query(
      "SELECT student_number FROM student_numbering_table WHERE person_id = ?",
      [person_id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "student number not found for person_id " + person_id });
    }

    const student_number = rows[0].student_number;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const year = new Date().getFullYear();
    const filename = `${student_number}_1by1_${year}${ext}`;
    const uploadDir = path.join(__dirname, "../../uploads/Student1by1");
    const finalPath = path.join(uploadDir, filename);

    const files = await fs.promises.readdir(uploadDir);
    for (const file of files) {
      if (file.startsWith(`${student_number}_1by1_`)) {
        await fs.promises.unlink(path.join(uploadDir, file));
      }
    }

    await fs.promises.writeFile(finalPath, req.file.buffer);

    await db3.query("UPDATE person_table SET profile_img = ? WHERE person_id = ?", [filename, person_id]);

    res.status(200).json({ message: "Uploaded successfully", filename });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Failed to upload image.");
  }
});

module.exports = router;