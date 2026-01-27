import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { Typography, Box, Snackbar, Alert, TextField } from '@mui/material';
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import SearchIcon from "@mui/icons-material/Search";

const SchoolYearActivatorPanel = () => {
    const settings = useContext(SettingsContext);

    const [titleColor, setTitleColor] = useState("#000000");
    const [subtitleColor, setSubtitleColor] = useState("#555555");
    const [borderColor, setBorderColor] = useState("#000000");

    const [userID, setUserID] = useState("");
    const [userRole, setUserRole] = useState("");
    const [employeeID, setEmployeeID] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(false);

    const pageId = 54;
    const [schoolYears, setSchoolYears] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    // 🎨 Dynamic colors
    useEffect(() => {
        if (!settings) return;
        if (settings.title_color) setTitleColor(settings.title_color);
        if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
        if (settings.border_color) setBorderColor(settings.border_color);
    }, [settings]);

    // 👤 Access check
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

    // 📊 Fetch school years
    const fetchSchoolYears = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/school_years`);
            setSchoolYears(res.data);
        } catch {
            setSnackbar({ open: true, message: "Failed to fetch school years", severity: "error" });
        }
    };

    useEffect(() => {
        fetchSchoolYears();
    }, []);

    // 🔄 Toggle activator
    const toggleActivator = async (schoolYearId, currentStatus) => {
        try {
            const updatedStatus = currentStatus === 1 ? 0 : 1;
            if (updatedStatus === 1) await axios.put(`${API_BASE_URL}/school_years/deactivate_all`);
            await axios.put(`${API_BASE_URL}/school_years/${schoolYearId}`, { activator: updatedStatus });
            fetchSchoolYears();
            setSnackbar({ open: true, message: updatedStatus === 1 ? "School year activated!" : "School year deactivated!", severity: "success" });
        } catch {
            setSnackbar({ open: true, message: "Failed to update school year", severity: "error" });
        }
    };

    // 🔒 Disable right-click & DevTools
    useEffect(() => {
        const handleContextMenu = (e) => e.preventDefault();
        const handleKeyDown = (e) => {
            const blocked = ['F12', 'F11'];
            if (
                blocked.includes(e.key) ||
                (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) ||
                (e.ctrlKey && ['u', 'p'].includes(e.key.toLowerCase()))
            ) { e.preventDefault(); e.stopPropagation(); }
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

    // 🔍 Filter school years
    const filteredSchoolYears = schoolYears.filter(sy =>
        String(sy.year_description).includes(searchQuery)
    );

    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", padding: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: titleColor, fontSize: '36px' }}>
                    SCHOOL YEAR ACTIVATOR PANEL
                </Typography>

                {/* Search Bar */}
                <TextField
                    variant="outlined"
                    placeholder="Search School Year and Semester..."
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
            <table style={{ width: "100%", borderCollapse: "collapse", border: `2px solid ${borderColor}`, textAlign: "center" }}>
                <thead>
                    <tr style={{ backgroundColor: settings?.header_color || "#1976d2", color: "#fff" }}>
                        <th style={{ border: `2px solid ${borderColor}`, padding: "10px" }}>Year Level</th>
                        <th style={{ border: `2px solid ${borderColor}`, padding: "10px" }}>Semester</th>
                        <th style={{ border: `2px solid ${borderColor}`, padding: "10px" }}>Status</th>
                        <th style={{ border: `2px solid ${borderColor}`, padding: "10px" }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSchoolYears.length > 0 ? filteredSchoolYears.map(sy => (
                        <tr key={sy.id} style={{
                            backgroundColor: sy.astatus === 1 ? "#d4edda" : "transparent",
                            color: sy.astatus === 1 ? "#155724" : "inherit"
                        }}>
                            <td style={{ border: `2px solid ${borderColor}`, padding: "8px" }}>
                                {`${sy.year_description}-${parseInt(sy.year_description) + 1}`}
                            </td>
                            <td style={{ border: `2px solid ${borderColor}`, padding: "8px" }}>{sy.semester_description}</td>
                            <td style={{ border: `2px solid ${borderColor}`, padding: "8px" }}>{sy.astatus === 1 ? "Active" : "Inactive"}</td>
                            <td style={{ border: `2px solid ${borderColor}`, padding: "8px" }}>
                                <button
                                    onClick={() => toggleActivator(sy.id, sy.astatus)}
                                    style={{
                                        width: "140px",
                                        padding: "6px 12px",
                                        borderRadius: "4px",
                                        color: "white",
                                        backgroundColor: sy.astatus === 1 ? "#DC2626" : "#16A34A",
                                        cursor: "pointer",
                                    }}
                                >
                                    {sy.astatus === 1 ? "Deactivate" : "Activate"}
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="4" style={{ padding: "15px", color: "#777" }}>No school years found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
            </Box>

            {/* Snackbar */}
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

export default SchoolYearActivatorPanel;
