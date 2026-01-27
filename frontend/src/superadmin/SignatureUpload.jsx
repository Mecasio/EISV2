import { useState, useEffect, useContext } from "react";
import API_BASE_URL from "../apiConfig";
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
    CircularProgress
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { SettingsContext } from "../App";
import axios from "axios";

const SignatureUpload = () => {
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

    const [fullName, setFullName] = useState("");
    const [signature, setSignature] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [dbSignature, setDbSignature] = useState(null);

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [hasAccess, setHasAccess] = useState(null);

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

    const pageId = 114;

    useEffect(() => {
        const fetchLatestSignature = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/signature`);
                const data = await res.json();

                if (data.success) {
                    setDbSignature(data.data);
                    setFullName(data.data.full_name); // auto-fill
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchLatestSignature();
    }, []);



    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!fullName || !signature) {
            setMessage("Please fill in all fields");
            return;
        }

        const formData = new FormData();
        formData.append("full_name", fullName);
        formData.append("signature", signature);

        try {
            setLoading(true);
            setMessage("");

            const res = await fetch(`${API_BASE_URL}/api/signature`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            console.log("API RESPONSE:", data);

            if (data.success) {
                setMessage("Signature uploaded successfully");
                setDbSignature(data.data);
            }
        } catch (err) {
            setMessage("Server error");
        } finally {
            setLoading(false);
        }
    };

    if (loading || hasAccess === null) {
        return <LoadingOverlay open={loading} message="Loading..." />;
    }

    if (!hasAccess) {
        return <Unauthorized />;
    }



    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>

            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',

                    mb: 2,

                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 'bold',
                        color: titleColor,
                        fontSize: '36px',
                    }}
                >
                    NAME AND DESIGNATION SIGNATURE
                </Typography>


            </Box>

     
                <hr style={{ border: "1px solid #ccc", width: "100%" }} />
                <br />

                       <Box display="flex" flexDirection="column" alignItems="center" mt={5} gap={4}>

                {/* ====== Upload Form Card ====== */}
                <Card sx={{ width: 420 }}>
                    <CardContent>
                        <Typography variant="h6">Upload Signature</Typography>

                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            display="flex"
                            flexDirection="column"
                            gap={2}
                        >
                            <TextField
                                label="Full Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                fullWidth
                            />

                            <Button variant="outlined" component="label">
                                Choose Signature Image
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => setSignature(e.target.files[0])}
                                />
                            </Button>

                            <Button type="submit" variant="contained" disabled={loading}>
                                {loading ? <CircularProgress size={24} /> : "Submit"}
                            </Button>

                            {message && <Typography>{message}</Typography>}
                        </Box>
                    </CardContent>
                </Card>

                {/* ====== Display Uploaded Signature Card ====== */}
                {dbSignature && (
                    <Card sx={{ width: 420 }}>
                        <CardContent>
                            <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                                gap={2}
                            >
                                {/* Left: Full Name */}
                                <Typography variant="subtitle1" sx={{ flex: 1 }}>
                                    Name: <strong>{dbSignature.full_name}</strong>
                                </Typography>

                                {/* Right: Signature Image */}
                                <Box
                                    component="img"
                                    src={`${API_BASE_URL}/uploads/${dbSignature.signature_image}`}
                                    alt="Signature"
                                    sx={{
                                        width: 200,
                                        maxHeight: 120,
                                        objectFit: "contain",
                                        border: "1px solid #ccc",
                                        borderRadius: 1,
                                        p: 1
                                    }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                    
                )}
            </Box>
        </Box>
    );
};

export default SignatureUpload;
