app.post("/curriculum", async (req, res) => {
  const { year_id, program_id } = req.body;

  if (!year_id || !program_id) {
    return res.status(400).json({ error: "Year ID and Program ID are required" });
  }

  try {
    const [rows] = await db3.query('SELECT * FROM curriculum_table WHERE year_id = ? AND program_id = ?', [year_id, program_id])
    if (rows.length > 0) {
      return res.status(400).json({ message: "This curriculum is already existed" });
    }
    const sql = "INSERT INTO curriculum_table (year_id, program_id) VALUES (?, ?)";
    const [result] = await db3.query(sql, [year_id, program_id]);

    res.status(201).json({
      message: "Curriculum created successfully",
      curriculum_id: result.insertId,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

// CURRICULUM LIST (UPDATED!)
app.get("/get_curriculum", async (req, res) => {
  const readQuery = `
    SELECT ct.*, p.*, y.* 
    FROM curriculum_table ct 
    INNER JOIN program_table p ON ct.program_id = p.program_id
    INNER JOIN year_table y ON ct.year_id = y.year_id
  `;

  try {
    const [result] = await db3.query(readQuery);
    res.status(200).json(result);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

// ✅ UPDATE Curriculum lock_status (0 = inactive, 1 = active)
app.put("/update_curriculum/:id", async (req, res) => {
  const { id } = req.params;
  const { lock_status } = req.body;

  try {
    // Ensure valid input
    if (lock_status !== 0 && lock_status !== 1) {
      return res.status(400).json({ message: "Invalid status value (must be 0 or 1)" });
    }

    const sql = "UPDATE curriculum_table SET lock_status = ? WHERE curriculum_id = ?";
    const [result] = await db3.query(sql, [lock_status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Curriculum not found" });
    }

    res.status(200).json({ message: "Curriculum status updated successfully" });
  } catch (error) {
    console.error("❌ Error updating curriculum status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/get_active_curriculum", async (req, res) => {
  const readQuery = `
    SELECT ct.*, p.*, y.* 
    FROM curriculum_table ct 
    INNER JOIN program_table p ON ct.program_id = p.program_id
    INNER JOIN year_table y ON ct.year_id = y.year_id
    WHERE ct.lock_status = 1
  `;

  try {
    const [result] = await db3.query(readQuery);
    res.status(200).json(result);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/update-active-curriculum", async (req, res) => {
  const { studentId, departmentSectionId } = req.body;

  if (!studentId || !departmentSectionId) {
    return res.status(400).json({ error: "studentId and departmentSectionId are required" });
  }

  const fetchCurriculumQuery = `
    SELECT curriculum_id
    FROM dprtmnt_section_table
    WHERE id = ?
  `;

  try {
    const [curriculumResult] = await db3.query(fetchCurriculumQuery, [departmentSectionId]);

    if (curriculumResult.length === 0) {
      return res.status(404).json({ error: "Section not found" });
    }

    const curriculumId = curriculumResult[0].curriculum_id;

    const updateQuery = `
      UPDATE student_status_table 
      SET active_curriculum = ? 
      WHERE student_number = ?
    `;
    const result = await db3.query(updateQuery, [curriculumId, studentId]);
    const data = result[0];
    console.log(data)
    res.status(200).json({
      message: "Active curriculum updated successfully",
    });

  } catch (err) {
    console.error("Error updating active curriculum:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

app.get("/dprtmnt_curriculum/:dprtmnt_id", async (req, res) => {
  const { dprtmnt_id } = req.params;
  try {
    const query = `
      SELECT 
        dc.dprtmnt_curriculum_id,
        dc.dprtmnt_id,
        dc.curriculum_id,
        dt.dprtmnt_name,
        dt.dprtmnt_code,
        ct.curriculum_id AS ct_curriculum_id,
        ct.year_id,
        y.year_description,
        ct.program_id,
        ct.lock_status,
        p.program_description AS p_description,
        p.program_code AS p_code
      FROM dprtmnt_curriculum_table AS dc
      INNER JOIN dprtmnt_table AS dt 
        ON dc.dprtmnt_id = dt.dprtmnt_id
      LEFT JOIN curriculum_table AS ct 
        ON dc.curriculum_id = ct.curriculum_id
      LEFT JOIN program_table AS p 
        ON ct.program_id = p.program_id
      LEFT JOIN year_table AS y
        ON ct.year_id = y.year_id
      WHERE dc.dprtmnt_id = ?
      ORDER BY 
        COALESCE(p_code, ''), 
        dc.curriculum_id;
    `;

    const [rows] = await db3.execute(query, [dprtmnt_id]);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching dprtmnt_curriculum:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// POST add mapping (dprtmnt_id + curriculum_id)
app.post("/dprtmnt_curriculum", async (req, res) => {
  const { dprtmnt_id, curriculum_id } = req.body;
  if (!dprtmnt_id || !curriculum_id) {
    return res.status(400).json({ error: "dprtmnt_id and curriculum_id are required" });
  }

  try {
    // prevent duplicate mapping
    const [exists] = await db3.execute(
      "SELECT * FROM dprtmnt_curriculum_table WHERE dprtmnt_id = ? AND curriculum_id = ?",
      [dprtmnt_id, curriculum_id]
    );
    if (exists.length > 0) {
      return res.status(409).json({ message: "Mapping already exists" });
    }

    const [result] = await db3.execute(
      "INSERT INTO dprtmnt_curriculum_table (dprtmnt_id, curriculum_id) VALUES (?, ?)",
      [dprtmnt_id, curriculum_id]
    );

    // return inserted id
    res.status(201).json({ message: "Mapping created", dprtmnt_curriculum_id: result.insertId });
  } catch (err) {
    console.error("Error creating mapping:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.put("/dprtmnt_curriculum/:id", async (req, res) => {
  const { id } = req.params;
  const { curriculum_id, dprtmnt_id } = req.body;

  if (!curriculum_id || !dprtmnt_id) {
    return res.status(400).json({ message: "curriculum_id and dprtmnt_id required" });
  }

  try {
    // Check duplicate mapping
    const [exists] = await db3.execute(
      `SELECT * FROM dprtmnt_curriculum_table 
       WHERE dprtmnt_id = ? AND curriculum_id = ? AND dprtmnt_curriculum_id != ?`,
      [dprtmnt_id, curriculum_id, id]
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: "Mapping already exists" });
    }

    const [result] = await db3.execute(
      `UPDATE dprtmnt_curriculum_table 
       SET curriculum_id = ? 
       WHERE dprtmnt_curriculum_id = ?`,
      [curriculum_id, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Mapping ID not found" });

    res.json({ message: "Mapping updated" });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.delete("/dprtmnt_curriculum/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db3.execute(
      "DELETE FROM dprtmnt_curriculum_table WHERE dprtmnt_curriculum_id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Mapping not found" });
    }
    res.status(200).json({ message: "Mapping deleted" });
  } catch (err) {
    console.error("Error deleting mapping:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});