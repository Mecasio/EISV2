import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { Box, Typography, Snackbar, Alert, Button, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";

const SchoolYearPanel = () => {
  const settings = useContext(SettingsContext);

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");

  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 55;

  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // 🔍 Search query

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [editID, setEditID] = useState(null); // To track which school year is being edited

  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
    if (settings.border_color) setBorderColor(settings.border_color);
  }, [settings]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUserID(storedID);
      setUserRole(storedRole);
      setEmployeeID(storedEmployeeID);

      if (storedRole === "registrar") checkAccess(storedEmployeeID);
      else window.location.href = "/login";
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      setHasAccess(response.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
      setSnackbar({ open: true, message: "Failed to check access", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchYears = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/year_table`); setYears(res.data); }
    catch { setSnackbar({ open: true, message: "Failed to fetch years", severity: "error" }); }
  };

  const fetchSemesters = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/get_semester`); setSemesters(res.data); }
    catch { setSnackbar({ open: true, message: "Failed to fetch semesters", severity: "error" }); }
  };

  const fetchSchoolYears = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/school_years`); setSchoolYears(res.data); }
    catch { setSnackbar({ open: true, message: "Failed to fetch school years", severity: "error" }); }
  };

  useEffect(() => {
    fetchYears();
    fetchSemesters();
    fetchSchoolYears();
  }, []);

  const formatYearRange = (year) => {
    const start = parseInt(year.year_description);
    return `${start}-${start + 1}`;
  };

  const handleSubmitOrUpdate = async (e) => {
    e.preventDefault();
    if (!selectedYear || !selectedSemester) {
      setSnackbar({ open: true, message: "Please select both Year and Semester", severity: "warning" });
      return;
    }

    // If editing
    if (editID) {
      try {
        await axios.put(`${API_BASE_URL}/school_years/${editID}`, {
          year_id: selectedYear,
          semester_id: selectedSemester,
        });
        setSnackbar({ open: true, message: "School year updated successfully!", severity: "success" });
        setEditID(null);
        setSelectedYear("");
        setSelectedSemester("");
        fetchSchoolYears();
      } catch {
        setSnackbar({ open: true, message: "Failed to update school year", severity: "error" });
      }
      return;
    }

    // Check duplicate
    const duplicate = schoolYears.find(
      (sy) => sy.year_id === selectedYear && sy.semester_id === selectedSemester
    );
    if (duplicate) {
      setSnackbar({ open: true, message: "This school year already exists", severity: "error" });
      return;
    }

    // Create new
    try {
      await axios.post(`${API_BASE_URL}/school_years`, {
        year_id: selectedYear,
        semester_id: selectedSemester,
        activator: 0,
      });
      setSelectedYear("");
      setSelectedSemester("");
      fetchSchoolYears();
      setSnackbar({ open: true, message: "School year added successfully!", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Failed to save school year", severity: "error" });
    }
  };

  const handleEdit = (sy) => {
    setSelectedYear(sy.year_id);
    setSelectedSemester(sy.semester_id);
    setEditID(sy.school_year_id); // assuming backend returns school_year_id
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this school year?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/school_years/${id}`);
      setSnackbar({ open: true, message: "School year deleted successfully!", severity: "success" });
      fetchSchoolYears();
    } catch {
      setSnackbar({ open: true, message: "Failed to delete school year", severity: "error" });
    }
  };

  // 🔍 Filtered list for search
  const filteredSchoolYears = schoolYears.filter(sy =>
    String(sy.year_description).includes(searchQuery) ||
    sy.semester_description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", padding: 2, mt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: titleColor, fontSize: '36px' }}>
          SCHOOL YEAR PANEL
        </Typography>

        {/* Search Bar */}
        <TextField
          variant="outlined"
          placeholder="Search School Year..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
           sx={{
                            width: 450,
                            backgroundColor: "#fff",
                            borderRadius: 1,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: "10px",
                            },
                        }}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
                        }}
        />
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {/* Form */}
        <Box sx={{ flex: 1, p: 3, bgcolor: "#fff", border: `2px solid ${borderColor}`, boxShadow: 2, width: 800, borderRadius: 2, minWidth: "300px" }}>
          <Typography variant="h6" mb={2} style={{ color: subtitleColor }}>
            {editID ? "Edit School Year" : "Add New School Year"}
          </Typography>
          <form onSubmit={handleSubmitOrUpdate} className="grid gap-4">
            <div>
              <Typography fontWeight={500}>Year Level:</Typography>
              <select
                className="border p-2 w-full rounded"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">-- Select Year Level --</option>
                {years.map((year) => (
                  <option key={year.year_id} value={year.year_id}>{formatYearRange(year)}</option>
                ))}
              </select>
            </div>

            <div>
              <Typography fontWeight={500}>Semester:</Typography>
              <select
                className="border p-2 w-full rounded"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                <option value="">-- Select Semester --</option>
                {semesters.map((semester) => (
                  <option key={semester.semester_id} value={semester.semester_id}>{semester.semester_description}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded" style={{ backgroundColor: "#1967d2" }}>
              {editID ? "Update" : "Save"}
            </button>
          </form>
        </Box>

        {/* Table */}
        <Box sx={{ flex: 1, p: 3, bgcolor: "#fff", boxShadow: 2, border: `2px solid ${borderColor}`, borderRadius: 2, minWidth: "300px" }}>
          <Typography variant="h6" mb={2} style={{ color: subtitleColor }}>
            Saved School Years
          </Typography>
          <Box sx={{ maxHeight: 750, overflowY: "auto" }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: `2px solid ${borderColor}` }}>
              <thead>
                <tr style={{ backgroundColor: settings?.header_color || "#1976d2", color: "#fff" }}>
                  <th className="p-2 text-center" style={{ border: `2px solid ${borderColor}` }}>Year Level</th>
                  <th className="p-2 text-center" style={{ border: `2px solid ${borderColor}` }}>Semester</th>
                  <th className="p-2 text-center" style={{ border: `2px solid ${borderColor}` }}>Status</th>
                  <th className="p-2 text-center" style={{ border: `2px solid ${borderColor}` }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchoolYears.length > 0 ? filteredSchoolYears.map((sy, index) => (
                  <tr key={index} style={{ backgroundColor: sy.astatus === 1 ? "#d4edda" : "transparent", color: sy.astatus === 1 ? "#155724" : "inherit" }}>
                    <td className="p-2 text-center" style={{ border: `2px solid ${borderColor}` }}>{`${sy.year_description}-${parseInt(sy.year_description) + 1}`}</td>
                    <td className="p-2 text-center" style={{ border: `2px solid ${borderColor}` }}>{sy.semester_description}</td>
                    <td className="p-2 text-center" style={{ border: `2px solid ${borderColor}` }}>{sy.astatus === 1 ? "Active" : "Inactive"}</td>
                    <td className="p-2 text-center" style={{ border: `2px solid ${borderColor}` }}>
                      <Button size="small" sx={{ backgroundColor: "green", color: "white", mr: 1, "&:hover": { backgroundColor: "#006400" } }} onClick={() => handleEdit(sy)}>Edit</Button>
                      <Button size="small" sx={{ backgroundColor: "#B22222", color: "white", "&:hover": { backgroundColor: "#8B0000" } }} onClick={() => handleDelete(sy.school_year_id)}>Delete</Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" style={{ padding: 15, color: "#777" }}>No school years found.</td></tr>
                )}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SchoolYearPanel;
