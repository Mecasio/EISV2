import React, {useState, useEffect, useContext} from 'react';
import { SettingsContext } from "../App";
import axios from 'axios';
import {Box, Button, Typography, TextField, Paper, TableContainer, Table, TableHead, TableBody, TableRow, TableCell} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import API_BASE_URL from '../apiConfig';

const StudentGradeFile = () => {
    const settings = useContext(SettingsContext);
    const [titleColor, setTitleColor] = useState("#000000");
    const [subtitleColor, setSubtitleColor] = useState("#555555");
    const [borderColor, setBorderColor] = useState("#000000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

    useEffect(() => {
        if (!settings) return;
        if (settings.title_color) setTitleColor(settings.title_color);
        if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
        if (settings.border_color) setBorderColor(settings.border_color);
        if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    }, [settings]);

    const [searchQuery, setSearchQuery] = useState("");
    const [studentInfo, setStudentInfo] = useState(null);
    const [studentGradeList, setStudentGradeList] = useState([]);
    const [campusFilter, setCampusFilter] = useState(1);

    const fetchStudent = async () => {
        try {
            const res = await axios.get(
            `${API_BASE_URL}/student/student-info`,
            { params: { searchQuery, campus: campusFilter } }
            );
            setStudentInfo(res.data);
        } catch (err) {
            setStudentInfo(null);
        }
    };

    const fetchStudentGrade = async (student_number) => {
        try{
            const res = await axios.get(
                `${API_BASE_URL}/student/student-info/${student_number}`
            )
            setStudentGradeList(res.data);
        }catch (err) {
            setStudentGradeList(null);
        }
    }

    const groupedGrades = studentGradeList.reduce((acc, curr) => {
        const yearLevel = curr.year_level_description;
        const semester = curr.semester_description;

        if (!acc[yearLevel]) acc[yearLevel] = {};
        if (!acc[yearLevel][semester]) acc[yearLevel][semester] = [];

        acc[yearLevel][semester].push(curr);

        return acc;
    }, {});

    useEffect(() => {
        if (!searchQuery) {
            setStudentInfo(null);
            return;
        }

        if (!campusFilter) {
            setStudentInfo(null);
            return;
        }

        const delay = setTimeout(() => {
            fetchStudent();
        }, 1200);

        return () => clearTimeout(delay);
    }, [searchQuery, campusFilter]);

    useEffect(() => {
        if (studentInfo && studentInfo.length > 0) {
            fetchStudentGrade(studentInfo[0].student_number);
        } else {
            setStudentGradeList([]);
        }
    }, [studentInfo]);

    const sortSemesters = (semesters) => {
        const order = ["First Semester", "Second Semester", "Summer"];
        return semesters.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    };

    return(
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
            <div style={{ height: "10px" }}></div>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} >
                <Typography variant="h4" fontWeight="bold" style={{ color: titleColor, }}>
                    STUDENT GRADE FILE
                </Typography>

                <TextField
                    variant="outlined"
                    placeholder="Search by name, student number, or email"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value.toLowerCase());
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                        e.preventDefault();
                        fetchStudent();
                        }
                    }}
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

            <Box sx={{display: "flex", alignItems: "center", gap: "1rem", marginBottom: 2.5}}>
                <Typography>
                    Campus: 
                </Typography>
                <TextField
                    select
                    label="Campus"
                    size="small"
                    value={campusFilter}
                    onChange={(e) => setCampusFilter(e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{ width: 150 }}
                >
                    <option value="1">Manila</option>
                    <option value="0">Cavite</option>
                </TextField>
            </Box>
            <TableContainer component={Paper} sx={{ width: '100%', border: `2px solid ${borderColor}`, }}>
                <Table>
                    <TableHead sx={{ backgroundColor: mainButtonColor }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', textAlign: "Center" }}>Student Personal Information</TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <TableContainer component={Paper} sx={{ width: '100%', border: `2px solid ${borderColor}`, padding: "20px 0px"}}>
                <Table sx={{'& td, & th': {paddingTop: 0, paddingBottom: 0, border: 'none', fontSize: "15px", letterSpacing: "-0.9px", wordSpacing: "3px"}}}>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                Student Name:
                            </TableCell>
                            <TableCell sx={{fontWeight: "700"}}>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    {studentInfo[0].last_name?.toUpperCase()}{" "}
                                    {studentInfo[0].first_name?.toUpperCase()}{" "}
                                    {studentInfo[0].middle_name?.toUpperCase()}
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                Applicant No./Student No.:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    {studentInfo[0].student_number?.toUpperCase()}
                                    </>
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                Program:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    {studentInfo[0].program_description} ({studentInfo[0].campus === 1 ? "MANILA CAMPUS" : "CAVITE CAMPUS"})
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                Year Level:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    {studentInfo[0].year_level_description}
                                    </>
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                Address:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                        {studentInfo[0].presentStreet},{" "}
                                        {studentInfo[0].presentBarangay},{" "}
                                        {studentInfo[0].presentMunicipality},{" "}
                                        {studentInfo[0].presentZipCode}
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                Contact No.:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    {studentInfo[0].cellphoneNumber}
                                    </>
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                Status:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                Section:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    
                                    </>
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                               Curriculum:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    {studentInfo[0].year_description}-{studentInfo[0].year_description + 1} (Regular)
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                Email Address:
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    {studentInfo[0].emailAddress}
                                    </>
                                )}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                School Year
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                        {studentInfo[0].current_year}-{studentInfo[0].current_year + 1}
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                Semester: 
                            </TableCell>
                            <TableCell>
                                {studentInfo && studentInfo.length > 0 && (
                                    <>
                                    {studentInfo[0].semester_description}
                                    </>
                                )}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
                <Box sx={{display: "flex", alignItems: "center", gap: "1rem", width: "100%", justifyContent: "end", padding: "0rem 1.5rem", marginTop: "1rem"}}>
                    <Button variant='contained'>DELETE</Button>
                    <Button variant='contained'>ADD SUBJECTS</Button>
                    <Button variant='contained'>ADD TRANSFEREE SUBJECTS</Button>
                    <Button variant='contained'>EXPORT GRADES</Button>
                    <Button variant='contained'>SAVE</Button>
                    <Button variant='contained'>VIEW</Button>
                </Box>
            </TableContainer>
         
            {Object.keys(groupedGrades).map((yearLevel) => (
                <Box key={yearLevel} style={{ marginBottom: 20 }}>
                    {sortSemesters(Object.keys(groupedGrades[yearLevel])).map((semester) => (
                    <TableContainer
                        key={semester}
                        component={Paper}
                        sx={{ width: '100%', border: `2px solid ${borderColor}`, mb: 2, mt: 2 }}
                    >
                        <Typography
                        sx={{
                            backgroundColor: mainButtonColor,
                            color: 'white',
                            padding: 1,
                            fontSize: "14px",
                            textAlign: 'center',
                        }}
                        >
                         Term Description
                        </Typography>
                        <TableContainer sx={{ width: '100%', padding: "10px 0px"}}>
                            <Table sx={{'& td, & th': {paddingTop: 0, paddingBottom: 0, border: 'none', fontSize: "15px", letterSpacing: "-0.9px", wordSpacing: "3px"}}}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            Academic School Year:
                                        </TableCell>
                                        <TableCell>
                                            {groupedGrades[yearLevel][semester][0].current_year}-
                                            {groupedGrades[yearLevel][semester][0].current_year + 1}
                                        </TableCell>
                                        <TableCell>
                                            Year Level:
                                        </TableCell>
                                        <TableCell>
                                            {yearLevel}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            Semester:
                                        </TableCell>
                                        <TableCell>
                                            {semester}
                                        </TableCell>
                                        <TableCell>
                                            Term:
                                        </TableCell>
                                        <TableCell>
                                            1st Term
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                            </Table>
                        </TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{borderTop: `solid 1px ${borderColor}`, borderBottom: `solid 1px ${borderColor}`,width: "2%"}}>#</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "8%"}}>Course Code</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "11%", textAlign: "center"}}>Equiv. Course Code</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "9%", textAlign: "center"}}>Professor</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "40%"}}>Course Description</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "2%"}}>Units</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "5%", textAlign: "center"}}>Section Code</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "5%", textAlign: "center"}}>Final Grade</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "3%", textAlign: "center"}}>Re-Exam</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "5%", textAlign: "center"}}>Grade Status</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, width: "5%", textAlign: "center"}}>Faculty Status</TableCell>
                                    <TableCell sx={{border: `solid 1px ${borderColor}`, borderRight: "none", width: "5%", textAlign: "center"}}>Remarks</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groupedGrades[yearLevel][semester].map((course, index) => (
                                    <TableRow key={course.course_id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{course.course_code}</TableCell>
                                        <TableCell sx={{width: "11%", textAlign: "center"}}>{course.course_code}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell>{course.course_description}</TableCell>
                                        <TableCell sx={{width: "2%", textAlign: "center"}}>{course.course_unit || 0}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell>{course.final_grade ?? "-"}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell>
                                        {course.en_remarks === 1
                                            ? "PASSED"
                                            : course.en_remarks === 2
                                            ? "FAILED"
                                            : course.en_remarks === 3
                                            ? "INC"
                                            : course.en_remarks === 4
                                            ? "DROP"
                                            : course.en_remarks === 0
                                            ? "ONGOING"
                                            : "-"}
                                        </TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: "right", fontWeight: "700" }}>
                                    TOTAL UNITS:
                                    </TableCell>
                                    <TableCell sx={{textAlign: "center", fontWeight: "700"}}>
                                        {groupedGrades[yearLevel][semester].reduce(
                                            (sum, course) => sum + (course.course_unit || 0),
                                            0
                                        )}
                                    </TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                    ))}
                </Box>
            ))}
        </Box>
    )
}

export default StudentGradeFile;