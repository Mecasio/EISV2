const express = require('express');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { db, db3 } = require('../database/database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const allowedFields = new Set([
  "profile_img", "campus", "academicProgram", "classifiedAs", "applyingAs",
  "program", "program2", "program3", "yearLevel", "last_name", "first_name",
  "middle_name", "extension", "nickname", "height", "weight", "lrnNumber",
  "nolrnNumber", "gender", "pwdMember", "pwdType", "pwdId", "birthOfDate",
  "age", "birthPlace", "languageDialectSpoken", "citizenship", "religion",
  "civilStatus", "tribeEthnicGroup", "cellphoneNumber", "emailAddress",
  "presentStreet", "presentBarangay", "presentZipCode", "presentRegion",
  "presentProvince", "presentMunicipality", "presentDswdHouseholdNumber",
  "sameAsPresentAddress", "permanentStreet", "permanentBarangay",
  "permanentZipCode", "permanentRegion", "permanentProvince",
  "permanentMunicipality", "permanentDswdHouseholdNumber", "solo_parent",
  "father_deceased", "father_family_name", "father_given_name",
  "father_middle_name", "father_ext", "father_nickname", "father_education",
  "father_education_level", "father_last_school", "father_course",
  "father_year_graduated", "father_school_address", "father_contact",
  "father_occupation", "father_employer", "father_income", "father_email",
  "mother_deceased", "mother_family_name", "mother_given_name",
  "mother_middle_name", "mother_ext", "mother_nickname", "mother_education",
  "mother_education_level", "mother_last_school", "mother_course",
  "mother_year_graduated", "mother_school_address", "mother_contact",
  "mother_occupation", "mother_employer", "mother_income", "mother_email",
  "guardian", "guardian_family_name", "guardian_given_name",
  "guardian_middle_name", "guardian_ext", "guardian_nickname",
  "guardian_address", "guardian_contact", "guardian_email", "annual_income",
  "schoolLevel", "schoolLastAttended", "schoolAddress", "courseProgram",
  "honor", "generalAverage", "yearGraduated", "schoolLevel1",
  "schoolLastAttended1", "schoolAddress1", "courseProgram1", "honor1",
  "generalAverage1", "yearGraduated1", "strand", "cough", "colds", "fever",
  "asthma", "faintingSpells", "heartDisease", "tuberculosis",
  "frequentHeadaches", "hernia", "chronicCough", "headNeckInjury", "hiv",
  "highBloodPressure", "diabetesMellitus", "allergies", "cancer",
  "smokingCigarette", "alcoholDrinking", "hospitalized",
  "hospitalizationDetails", "medications", "hadCovid", "covidDate",
  "vaccine1Brand", "vaccine1Date", "vaccine2Brand", "vaccine2Date",
  "booster1Brand", "booster1Date", "booster2Brand", "booster2Date",
  "chestXray", "cbc", "urinalysis", "otherworkups", "symptomsToday",
  "remarks", "termsOfAgreement", "created_at", "current_step"
]);

router.get("/person/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(`
      SELECT pt.*, ant.applicant_number 
      FROM applicant_numbering_table AS ant
      LEFT JOIN person_table AS pt ON ant.person_id = pt.person_id
      WHERE pt.person_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Person not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error fetching person:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.put("/person/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "No fields provided for update" });
    }

    // 🧼 Clean + FILTER only allowed columns
    const cleanedEntries = Object.entries(req.body)
      .filter(([key, value]) => allowedFields.has(key)) // ❗ ignores applicant_number
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, value === "" ? null : value]);

    if (cleanedEntries.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const setClause = cleanedEntries.map(([key]) => `${key}=?`).join(", ");
    const values = cleanedEntries.map(([_, val]) => val);
    values.push(id);

    const sql = `UPDATE person_table SET ${setClause} WHERE person_id=?`;
    const [result] = await db.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Person not found or no changes made" });
    }

    res.json({ message: "✅ Person updated successfully" });
  } catch (error) {
    console.error("❌ Error updating person:", error);
    res.status(500).json({
      error: "Database error during update",
      details: error.message
    });
  }
});

router.post("/upload-profile-picture", upload.single("profile_picture"), async (req, res) => {
  const { person_id } = req.body;
  if (!person_id || !req.file) {
    return res.status(400).send("Missing person_id or file.");
  }

  try {
    // ✅ Get applicant_number from person_id
    const [rows] = await db.query(
      "SELECT applicant_number FROM applicant_numbering_table WHERE person_id = ?",
      [person_id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Applicant number not found for person_id " + person_id });
    }

    const applicant_number = rows[0].applicant_number;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const year = new Date().getFullYear();
    const filename = `${applicant_number}_1by1_${year}${ext}`;
    const uploadDir = path.join(__dirname, "../../uploads/Applicant1by1");
    const finalPath = path.join(uploadDir, filename);

    const files = await fs.promises.readdir(uploadDir);
    for (const file of files) {
      if (file.startsWith(`${applicant_number}_1by1_`)) {
        await fs.promises.unlink(path.join(uploadDir, file));
      }
    }

    await fs.promises.writeFile(finalPath, req.file.buffer);

    await db.query("UPDATE person_table SET profile_img = ? WHERE person_id = ?", [filename, person_id]);

    res.status(200).json({ message: "Uploaded successfully", filename });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Failed to upload image.");
  }
});

module.exports = router;