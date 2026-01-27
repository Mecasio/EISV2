import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { Typography, Box, Snackbar, Alert, TextField } from '@mui/material';
import SearchIcon from "@mui/icons-material/Search";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";

const YearUpdateForm = () => {
  const settings = useContext(SettingsContext);

  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");

  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const [years, setYears] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // 🔍 Search query
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const pageId = 65;

  // Apply dynamic settings
  useEffect(() => {
    if (!settings) return;
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.border_color) setBorderColor(settings.border_color);
  }, [settings]);

  // Check user access
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
    } else window.location.href = "/login";
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

  // Fetch years
  const fetchYears = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/year_table`);
      setYears(res.data);
    } catch {
      setSnackbar({ open: true, message: "Failed to fetch years", severity: "error" });
    }
  };

  useEffect(() => { fetchYears(); }, []);

  const toggleActivator = async (yearId, currentStatus) => {
    try {
      const newStatus = currentStatus === 0 ? 1 : 0;
      await axios.put(`${API_BASE_URL}/year_table/${yearId}`, { status: newStatus });
      fetchYears();
      setSnackbar({
        open: true,
        message: `Year ${newStatus === 1 ? "activated" : "deactivated"} successfully!`,
        severity: "success"
      });
    } catch {
      setSnackbar({ open: true, message: "Failed to update year status", severity: "error" });
    }
  };

  // 🔒 Disable right-click & DevTools
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      const blocked = ['F12', 'F11'];
      if (blocked.includes(e.key) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && ['u', 'p'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  // Filter years based on search
  const filteredYears = years.filter(y =>
    String(y.year_description).includes(searchQuery)
  );

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
            background: "white",
            display: "flex",
            alignItems: "center",
          }}
        >
          YEAR UPDATE FORM
        </Typography>

        {/* Search Bar */}
        <TextField
          variant="outlined"
          placeholder="Search Year Update..."
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
 <Box sx={{ maxHeight: 750, overflowY: "auto" }}>
      <table
        className="w-full border border-gray-300"
        style={{
          border: `2px solid ${borderColor}`,
          textAlign: "center",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: settings?.header_color || "#1976d2", color: "#ffffff" }}>
            <th style={{ border: `2px solid ${borderColor}`, width: "33.33%", padding: "12px 8px" }}>Year</th>
            <th style={{ border: `2px solid ${borderColor}`, width: "33.33%", padding: "12px 8px" }}>Status</th>
            <th style={{ border: `2px solid ${borderColor}`, width: "33.33%", padding: "12px 8px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredYears.length > 0 ? filteredYears.map(year => (
            <tr
              key={year.year_id}
              style={{
                backgroundColor: year.status === 1 ? "#d4edda" : "transparent",
                color: year.status === 1 ? "#155724" : "inherit",
              }}
            >
              <td style={{ border: `2px solid ${borderColor}`, padding: "12px 8px" }}>{year.year_description}</td>
              <td style={{ border: `2px solid ${borderColor}`, padding: "12px 8px" }}>{year.status === 1 ? "Active" : "Inactive"}</td>
              <td style={{ border: `2px solid ${borderColor}`, padding: "12px 8px" }}>
                <button
                  className="px-4 py-2 rounded text-white"
                  style={{
                    backgroundColor: year.status === 1 ? "#DC2626" : "#16A34A",
                    cursor: "pointer",
                    minWidth: "140px",
                  }}
                  onClick={() => toggleActivator(year.year_id, year.status)}
                >
                  {year.status === 1 ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} style={{ padding: "20px", color: "#777" }}>
                No years found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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

export default YearUpdateForm;
