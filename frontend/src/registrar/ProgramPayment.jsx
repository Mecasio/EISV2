import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { Box, Typography, Button, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import LoadingOverlay from "../components/LoadingOverlay";

const CurriculumCourseMap = () => {
  const settings = useContext(SettingsContext);
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  const [filteredPrograms, setFilteredPrograms] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    if (settings.sub_button_color) setSubButtonColor(settings.sub_button_color);   // ✅ NEW
    if (settings.stepper_color) setStepperColor(settings.stepper_color);           // ✅ NEW

    // 🏫 Logo
    if (settings.logo_url) {
      setFetchedLogo(`${API_BASE_URL}${settings.logo_url}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (settings.company_name) setCompanyName(settings.company_name);
    if (settings.short_term) setShortTerm(settings.short_term);
    if (settings.campus_address) setCampusAddress(settings.campus_address);

  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const pageId = 111;

  const [employeeID, setEmployeeID] = useState("");

  useEffect(() => {

    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
      setEmployeeID(storedEmployeeID);

      if (storedRole === "registrar") {
        checkAccess(storedEmployeeID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [taggedPrograms, setTaggedPrograms] = useState([]);

  // 🆕 local editable fees
  const [editedFees, setEditedFees] = useState({});

  useEffect(() => {
    fetchCurriculum();
    fetchTaggedPrograms();
  }, []);

  const fetchCurriculum = async () => {
    const res = await axios.get(`${API_BASE_URL}/get_active_curriculum`);
    setCurriculumList(res.data);
  };

  const fetchTaggedPrograms = async () => {
    const res = await axios.get(`${API_BASE_URL}/prgram_tagging_list`);
    // map to include is_nstp, iscomputer_lab, isnon_computer_lab
    // Directly use the flags from the API
    const tagged = res.data.map(p => ({
      ...p,
      is_nstp: p.is_nstp,
      iscomputer_lab: p.iscomputer_lab,
      isnon_computer_lab: p.isnon_computer_lab,
    }));
    setTaggedPrograms(tagged);

  };


  const [feeRules, setFeeRules] = useState({});

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/fee_rules`)
      .then(res => {
        const map = {};
        res.data.forEach(f => {
          map[f.fee_code] = Number(f.amount);
        });
        setFeeRules(map);
      })
      .catch(err => console.error("Fee rules error:", err));
  }, []);


  const computeExtraFees = (semesterCourses) => {
    const fees = [];

    const hasNSTP = semesterCourses.some(c => c.is_nstp === 1);
    const hasComputerLab = semesterCourses.some(c => c.iscomputer_lab === 1);
    const hasNonComputerLab = semesterCourses.some(c => c.isnon_computer_lab === 1);

    if (hasNSTP && feeRules.NSTP_FEE) {
      fees.push({
        label: "NSTP FEE",
        amount: feeRules.NSTP_FEE,
      });
    }

    if (hasComputerLab && feeRules.COMPUTER_FEE) {
      fees.push({
        label: "COMPUTER LAB FEE",
        amount: feeRules.COMPUTER_FEE,
      });
    }

    if (hasNonComputerLab && feeRules.LAB_BASE) {
      fees.push({
        label: "LABORATORY FEE",
        amount: feeRules.LAB_BASE,
      });
    }

    return fees;
  };



  // 🧠 Group by Year → Semester
  const groupedData = () => {
    const result = {};

    taggedPrograms
      .filter(p => p.curriculum_id == selectedCurriculum)
      .forEach(p => {
        if (!result[p.year_level_description]) {
          result[p.year_level_description] = {};
        }
        if (!result[p.year_level_description][p.semester_description]) {
          result[p.year_level_description][p.semester_description] = [];
        }
        result[p.year_level_description][p.semester_description].push(p);
      });

    return result;
  };

  const data = groupedData();

  // 🖊 handle input change
  const handleFeeChange = (id, field, value) => {
    setEditedFees(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value === "" ? "" : Number(value)
      }
    }));
  };

  const handleSaveSemester = async (courses) => {
    try {
      for (const course of courses) {
        const updates = editedFees[course.program_tagging_id];
        if (!updates) continue;

        await axios.put(
          `${API_BASE_URL}/program_tagging/${course.program_tagging_id}`,
          {
            ...course,
            lec_fee: updates.lec_fee ?? course.lec_fee,
            lab_fee: updates.lab_fee ?? course.lab_fee,
          }
        );
      }

      setSnackbar({
        open: true,
        message: "Fees saved successfully!",
        severity: "success",
      });

      setEditedFees({});
      fetchTaggedPrograms();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Error saving fees",
        severity: "error",
      });
    }
  };

  const selectedCurriculumName = curriculumList.find(
    (c) => c.curriculum_id === selectedCurriculum
  )?.program_description +
    (curriculumList.find(c => c.curriculum_id === selectedCurriculum)?.major
      ? ` ${curriculumList.find(c => c.curriculum_id === selectedCurriculum)?.major}`
      : "") || "";



  const yearOrder = {
    "First Year": 1,
    "Second Year": 2,
    "Third Year": 3,
    "Fourth Year": 4,
  };

  const semesterOrder = {
    "First Semester": 1,
    "Second Semester": 2,
  };

  const yearLabelMap = {
    "First Year": "1st Year",
    "Second Year": "2nd Year",
    "Third Year": "3rd Year",
    "Fourth Year": "4th Year",
    "Fifth Year": "5th Year",
  };

  const formatYearLabel = (year) => {
    return `${yearLabelMap[year] || year} - (${year})`;
  };


  const headerStyle = {
    backgroundColor: settings?.header_color || "#1976d2",
    border: `2px solid ${borderColor}`,
    color: "white",
    textAlign: "center",
    padding: "8px",
  };

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }


  const cellStyle = {
    border: `2px solid ${borderColor}`,
    padding: "8px",
  };

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        p: 2,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          CURRICULUM PAYMENT
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <Typography fontWeight={500}>Select Curriculum:</Typography>
      <FormControl sx={{ minWidth: 400, mb: 4 }}>
        <InputLabel>Choose Curriculum</InputLabel>
        <Select
          value={selectedCurriculum}
          label="Choose Curriculum"
          onChange={(e) => setSelectedCurriculum(e.target.value)}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {curriculumList.map((c) => (
            <MenuItem key={c.curriculum_id} value={c.curriculum_id}>
              ({c.program_code}) - {c.program_description} {c.major}
            </MenuItem>
          ))}
        </Select>
      </FormControl>



      {/* YEARS */}
      {selectedCurriculum &&
        Object.keys(data)
          .sort((a, b) => yearOrder[a] - yearOrder[b])
          .map((year) => (
            <Box
              key={year}
              sx={{
                mb: 6,
                border: `2px solid ${borderColor}`,
                borderRadius: 2,
                p: 2,
                backgroundColor: "#fafafa",
              }}
            >
              {/* ===== CURRICULUM HEADER (ONCE PER YEAR) ===== */}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  color: "#fff",
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  backgroundColor: settings?.header_color || "#1976d2",
                  border: `2px solid ${borderColor}`,
                  borderRadius: 1,
                  p: 1,
                  mb: 3,
                }}
              >
                {selectedCurriculumName}
              </Typography>

              {/* ===== SEMESTER TABLES ===== */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 3,
                }}
              >
                {Object.keys(data[year])
                  .sort((a, b) => semesterOrder[a] - semesterOrder[b])
                  .map((sem) => {
                    const semesterCourses = data[year][sem];

                    // ✅ FIX: DEFINE EXTRA FEE TOTAL PER SEMESTER
                    const extraFeeTotal = computeExtraFees(semesterCourses).reduce(
                      (sum, fee) => sum + Number(fee.amount || 0),
                      0
                    );

                    return (
                      <Box
                        key={sem}
                        sx={{
                          border: `2px solid ${borderColor}`,
                          borderRadius: 1,
                          p: 2,
                          minHeight: 300,
                          position: "relative",
                          backgroundColor: "#fff",
                        }}
                      >
                        <Box sx={{ position: "relative", pb: 7 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              {/* YEAR + SEM */}
                              <tr>
                                <th
                                  colSpan={4}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    borderLeft: `2px solid ${borderColor}`,
                                    borderTop: `2px solid ${borderColor}`,
                                    borderBottom: `2px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    fontSize: "21px",
                                    color: titleColor,
                                  }}
                                >
                                  {formatYearLabel(year)}
                                </th>

                                <th
                                  colSpan={3}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    borderRight: `2px solid ${borderColor}`,
                                    borderTop: `2px solid ${borderColor}`,
                                    borderBottom: `2px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "right",
                                    fontSize: "21px",
                                    color: titleColor,
                                  }}
                                >
                                  {sem}
                                </th>
                              </tr>

                              <tr>
                                <th style={headerStyle}>COURSE CODE</th>
                                <th style={headerStyle}>COURSE DESCRIPTION</th>
                                <th style={headerStyle}>LEC FEE</th>
                                <th style={headerStyle}>LAB FEE</th>
                                <th style={headerStyle}>EXTRA FEE</th>
                                <th style={headerStyle}>CREDITED UNITS</th>
                                <th style={headerStyle}>TOTAL FEE</th>
                              </tr>
                            </thead>

                            <tbody>
                              {/* ===== SUBJECT ROWS ===== */}
                              {semesterCourses.map((course) => {
                                const edit = editedFees[course.program_tagging_id] || {};
                                const lecFee = edit.lec_fee ?? course.lec_fee ?? 0;
                                const labFee = edit.lab_fee ?? course.lab_fee ?? 0;
                                const totalFee = lecFee + labFee;

                                return (
                                  <tr key={course.program_tagging_id}>
                                    <td style={cellStyle}>{course.course_code}</td>
                                    <td style={cellStyle}>{course.course_description}</td>

                                    <td style={{ ...cellStyle, textAlign: "right" }}>
                                      <input
                                        type="number"
                                        value={lecFee}
                                        onChange={(e) =>
                                          handleFeeChange(course.program_tagging_id, "lec_fee", e.target.value)
                                        }
                                        style={{
                                          width: "90px",
                                          padding: "6px",
                                          border: "1px solid #ccc",
                                          borderRadius: 4,
                                          textAlign: "right",
                                        }}
                                      />
                                    </td>

                                    <td style={{ ...cellStyle, textAlign: "right" }}>
                                      <input
                                        type="number"
                                        value={labFee}
                                        onChange={(e) =>
                                          handleFeeChange(course.program_tagging_id, "lab_fee", e.target.value)
                                        }
                                        style={{
                                          width: "90px",
                                          padding: "6px",
                                          border: "1px solid #ccc",
                                          borderRadius: 4,
                                          textAlign: "right",
                                        }}
                                      />
                                    </td>

                                    <td style={{ ...cellStyle, textAlign: "right" }}>
                                      {/* Extra fee per course is empty here */}
                                    </td>

                                    <td style={{ ...cellStyle, textAlign: "center" }}>{course.course_unit}</td>
                                    <td style={{ ...cellStyle, textAlign: "center" }}>{totalFee.toLocaleString()}</td>
                                  </tr>
                                );
                              })}

                              {/* ===== EXTRA FEES ROWS (like NSTP) ===== */}
                              {computeExtraFees(semesterCourses).map((fee, idx) => (
                                <tr key={`extra-${idx}`} style={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
                                  <td colSpan={3} style={{ ...cellStyle, textAlign: "right" }}>
                                    {fee.label}
                                  </td>

                                  <td style={{ ...cellStyle }}></td>
                                  <td style={{ ...cellStyle, textAlign: "right" }}>
                                    {Number(fee.amount).toLocaleString()}
                                  </td>
                                  <td style={{ ...cellStyle }}></td>
                                  <td style={{ ...cellStyle }}></td>
                                </tr>
                              ))}

                              {/* ===== TOTAL ROW ===== */}
                              <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                                <td colSpan={2} style={{ ...cellStyle, textAlign: "right" }}>TOTAL</td>

                                {/* TOTAL LEC FEE */}
                                <td style={{ ...cellStyle, textAlign: "right" }}>
                                  {semesterCourses.reduce(
                                    (sum, course) =>
                                      sum + (editedFees[course.program_tagging_id]?.lec_fee ?? course.lec_fee ?? 0),
                                    0
                                  ).toLocaleString()}
                                </td>

                                {/* TOTAL LAB FEE */}
                                <td style={{ ...cellStyle, textAlign: "right" }}>
                                  {semesterCourses.reduce(
                                    (sum, course) =>
                                      sum + (editedFees[course.program_tagging_id]?.lab_fee ?? course.lab_fee ?? 0),
                                    0
                                  ).toLocaleString()}
                                </td>

                                {/* TOTAL EXTRA FEES */}
                                <td style={{ ...cellStyle, textAlign: "right" }}>
                                  {computeExtraFees(semesterCourses).reduce(
                                    (sum, fee) => sum + Number(fee.amount ?? 0),
                                    0
                                  ).toLocaleString()}
                                </td>

                                {/* TOTAL UNITS */}
                                <td style={{ ...cellStyle, textAlign: "center" }}>
                                  {semesterCourses.reduce((sum, course) => sum + Number(course.course_unit ?? 0), 0)}
                                </td>

                                {/* GRAND TOTAL */}
                                <td style={{ ...cellStyle, textAlign: "center" }}>
                                  {(
                                    semesterCourses.reduce(
                                      (sum, course) =>
                                        sum + (editedFees[course.program_tagging_id]?.lec_fee ?? course.lec_fee ?? 0)
                                        + (editedFees[course.program_tagging_id]?.lab_fee ?? course.lab_fee ?? 0),
                                      0
                                    ) +
                                    computeExtraFees(semesterCourses).reduce(
                                      (sum, fee) => sum + Number(fee.amount ?? 0),
                                      0
                                    )
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            </tbody>


                          </table>
                          {/* SAVE BUTTON */}
                          <button
                            onClick={() => handleSaveSemester(semesterCourses)}
                            style={{
                              marginTop: 10,
                              padding: "6px 14px",
                              background: "#1976d2",
                              color: "#fff",
                              border: "none",
                              borderRadius: 5,
                              cursor: "pointer",
                              float: "right",
                            }}
                          >
                            Save
                          </button>
                        </Box>
                      </Box>
                    );
                  })}
              </Box>
            </Box>
          ))}


      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );

};

export default CurriculumCourseMap;
