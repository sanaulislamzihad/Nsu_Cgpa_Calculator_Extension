(() => {
  // Requested behavior:
  // - No separate "main" what-if course table for existing courses
  // - Edit ONLY the "Course Grade" directly inside the original RDS grade history table
  // - Add new courses inline inside the same main table (no modal)
  // - Support multiple NEW semesters (each as a separate block like the website)
  const NSURB_INLINE_EDIT_MAIN_TABLE = true;

  // Hypothetical semester blocks
  const nsurbHypSemesters = []; // { semester: "Spring" | "Summer" | "Fall" | "Intersession", year: "2026" }
  let nsurbActiveHypKey = ""; // `${semester} ${year}`
  let nsurbSkipHypRender = false; // prevents rerender while user is typing in inputs

  // Inject lightweight modern styles for the inserted UI (no external requests)
  function injectNSURDSBuddyStyles() {
    if (document.getElementById("nsurb-styles")) return;
    const style = document.createElement("style");
    style.id = "nsurb-styles";
    style.textContent = `
      :root { --nsurb-bg:#ffffff; --nsurb-card:#ffffff; --nsurb-border:rgba(0,0,0,.10); --nsurb-muted:rgba(0,0,0,.62); --nsurb-primary:#2563eb; --nsurb-success:#16a34a; --nsurb-danger:#dc2626; --nsurb-warn:#f59e0b; }
      /* (removed) legacy panel/table styles */
      .nsurb-pill { display:inline-block; padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; background: rgba(37,99,235,.10); color: #1d4ed8; }
      .nsurb-pill.nsurb-grade { background: rgba(2,132,199,.10); color: #075985; }
      .nsurb-pill.nsurb-grade.nsurb-a { background: rgba(22,163,74,.14); color:#166534; }
      .nsurb-pill.nsurb-grade.nsurb-b { background: rgba(37,99,235,.14); color:#1d4ed8; }
      .nsurb-pill.nsurb-grade.nsurb-c { background: rgba(245,158,11,.18); color:#92400e; }
      .nsurb-pill.nsurb-grade.nsurb-d { background: rgba(234,88,12,.18); color:#9a3412; }
      .nsurb-pill.nsurb-grade.nsurb-f { background: rgba(220,38,38,.14); color:#991b1b; }

      /* (removed) legacy chart styles */

      .nsurb-hidden { display:none !important; }

      /* Inline grade editor (main RDS table) */
      .nsurb-inline-grade { white-space: nowrap; }
      .nsurb-inline-grade select { width: 82px; display: inline-block; }
      .nsurb-inline-reset { margin-left: 6px; background: rgba(0,0,0,.04); border: 1px solid rgba(0,0,0,.10); border-radius: 8px; padding: 2px 8px; cursor: pointer; }
      .nsurb-inline-reset:hover { background: rgba(0,0,0,.07); }

      /* Per-semester delta badges (TGPA/CGPA) */
      .nsurb-sem-delta { margin-left: 8px; font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 999px; display: inline-block; }
      .nsurb-sem-delta.pos { background: rgba(22,163,74,.14); color:#166534; }
      .nsurb-sem-delta.neg { background: rgba(220,38,38,.14); color:#991b1b; }
      .nsurb-sem-delta.zero { background: rgba(0,0,0,.06); color: rgba(0,0,0,.70); font-weight: 700; }
      .nsurb-code-warn { margin-top: 4px; font-size: 11px; font-weight: 800; color: #b91c1c; }
      .nsurb-code-cell { display: inline-block; }

      /* Professional button theme for our controls only (inside main table) */
      tr.nsurb-hyp-controls .btn-group { display: inline-flex; gap: 10px; }
      tr.nsurb-hyp-controls .btn-group .btn { float: none !important; }
      tr.nsurb-hyp-controls .btn-group .btn {
        border-radius: 12px !important;
        padding: 9px 14px !important;
        font-weight: 900 !important;
        letter-spacing: .2px;
        border: 1px solid rgba(0,0,0,.10) !important;
        box-shadow: 0 6px 16px rgba(0,0,0,.10) !important;
        transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
      }
      tr.nsurb-hyp-controls .btn-group .btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(0,0,0,.14) !important;
        filter: brightness(1.02);
      }
      tr.nsurb-hyp-controls .btn-group .btn:active {
        transform: translateY(0px);
        box-shadow: 0 6px 16px rgba(0,0,0,.10) !important;
      }

      /* Specific colors */
      tr.nsurb-hyp-controls #nsurb-add-semester.btn,
      tr.nsurb-hyp-controls .nsurb-btn-add-semester.btn {
        background: linear-gradient(135deg, #2563eb, #06b6d4) !important;
        color: #fff !important;
        border-color: rgba(0,0,0,.0) !important;
      }
      tr.nsurb-hyp-controls .nsurb-btn-add-course.btn {
        background: linear-gradient(135deg, #16a34a, #22c55e) !important;
        color: #fff !important;
        border-color: rgba(0,0,0,.0) !important;
      }
      tr.nsurb-hyp-controls .nsurb-btn-reset-semester.btn {
        background: linear-gradient(135deg, #f59e0b, #fb923c) !important;
        color: #1f2937 !important;
        border-color: rgba(0,0,0,.0) !important;
      }

      /* Semester modal */
      #nsurb-semester-modal { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 100000; background: rgba(0,0,0,.55); }
      #nsurb-semester-modal .nsurb-modal-card { width: 420px; max-width: calc(100vw - 24px); background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.25); border: 1px solid rgba(0,0,0,.12); }
      #nsurb-semester-modal, #nsurb-semester-modal * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
      #nsurb-semester-modal .nsurb-modal-card { width: 380px; }
      #nsurb-semester-modal .nsurb-modal-h { padding: 10px 12px; font-weight: 900; font-size: 14px; color: #fff; background: linear-gradient(135deg, rgba(37,99,235,1), rgba(14,165,233,1)); }
      #nsurb-semester-modal .nsurb-modal-b { padding: 12px; }
      #nsurb-semester-modal .nsurb-modal-row { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
      #nsurb-semester-modal .nsurb-modal-row > div { flex: 1 1 160px; min-width: 160px; }
      #nsurb-semester-modal label { font-size: 13px; font-weight: 800; color: rgba(0,0,0,.70); margin: 0 0 6px; display:block; }
      #nsurb-semester-modal select {
        width: 100% !important;
        border-radius: 10px !important;
        border: 1px solid rgba(0,0,0,.14) !important;
        background: #fff !important;
        color: rgba(0,0,0,.92) !important;
        font-size: 14px !important;
        height: 40px !important;
        line-height: 40px !important;
        padding: 6px 12px !important;
      }
      #nsurb-semester-modal option { font-size: 14px !important; }
      #nsurb-semester-modal .nsurb-modal-actions { display:flex; gap:10px; justify-content: flex-end; margin-top: 12px; }
      #nsurb-semester-modal .nsurb-btn { border-radius: 10px; padding: 8px 12px; border: 1px solid rgba(0,0,0,.14); background: #fff; cursor: pointer; font-weight: 800; font-size: 13px; }
      #nsurb-semester-modal .nsurb-btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    `;
    document.head.appendChild(style);
  }

  injectNSURDSBuddyStyles();

  // (removed) legacy chart cleanup

  function normText(s) {
    return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function getTableHeaders(table) {
    if (!table) return [];
    const theadHeaders = Array.from(table.querySelectorAll("thead th")).map((th) =>
      normText(th.textContent)
    );
    if (theadHeaders.length) return theadHeaders;

    // Fallback: sometimes the first row is used as a header row
    const firstRow = table.querySelector("tr");
    if (!firstRow) return [];
    return Array.from(firstRow.querySelectorAll("th,td")).map((cell) =>
      normText(cell.textContent)
    );
  }

  function headersInclude(headers, needles) {
    return needles.some((n) => headers.some((h) => h.includes(n)));
  }

  function findGradeHistoryRoot() {
    return (
      document.querySelector(".hist-grades") ||
      document.querySelector("#grade_history") ||
      document.querySelector("#grade-history") ||
      document.querySelector(".grade-history") ||
      document.querySelector("[data-page='grade_history']") ||
      document.querySelector("[data-page='grade-history']") ||
      null
    );
  }

  function findGradeTables() {
    const root = findGradeHistoryRoot();
    const allTables = Array.from(
      (root || document).querySelectorAll("table")
    ).filter((t) => t.querySelectorAll("tr").length > 0);

    // Try to classify by headers (more robust to layout changes)
    let waiverTable = null;
    let transferTable = null;
    let semesterTable = null;

    for (const t of allTables) {
      const headers = getTableHeaders(t);
      if (!headers.length) continue;

      // Semester-grade table usually contains these
      const looksLikeSemester =
        headersInclude(headers, ["semester"]) &&
        headersInclude(headers, ["year"]) &&
        headersInclude(headers, ["grade"]);

      // Waiver/transfer tables often contain code/credit/title, and sometimes "waiver"/"transfer"
      const looksLikeWaiver =
        headersInclude(headers, ["waiver"]) ||
        (headersInclude(headers, ["code", "course"]) &&
          headersInclude(headers, ["credit"]) &&
          headersInclude(headers, ["title"]) &&
          headersInclude(headers, ["grade"]));

      const looksLikeTransfer =
        headersInclude(headers, ["transfer"]) ||
        (headersInclude(headers, ["code", "course"]) &&
          headersInclude(headers, ["credit"]) &&
          headersInclude(headers, ["title"]) &&
          !headersInclude(headers, ["grade"]));

      if (looksLikeSemester && !semesterTable) semesterTable = t;
      else if (looksLikeWaiver && !waiverTable) waiverTable = t;
      else if (looksLikeTransfer && !transferTable) transferTable = t;
    }

    // Fallback to old behavior if we couldn't classify but we have >= 3 tables
    if (!waiverTable || !transferTable || !semesterTable) {
      const rootTables = Array.from(
        (document.querySelectorAll(".hist-grades table") || [])
      );
      const fallbackTables = rootTables.length ? rootTables : allTables;
      if (fallbackTables.length >= 3) {
        const [w, tr, sem] = fallbackTables;
        waiverTable ||= w;
        transferTable ||= tr;
        semesterTable ||= sem;
      }
    }

    return { waiverTable, transferTable, semesterTable, root };
  }

  const { waiverTable, transferTable, semesterTable } = findGradeTables();

  function parseTable(table, mapRowFn, options = {}) {
    if (!table) return [];
    const { minTds = 0, rowFilter = null } = options || {};

    return Array.from(table.querySelectorAll("tbody tr"))
      .filter((row) => !row.classList.contains("divider-td"))
      .filter((row) => (typeof rowFilter === "function" ? rowFilter(row) : true))
      .filter((row) => row.querySelectorAll("td").length >= minTds)
      .map((row) => mapRowFn(row))
      .filter(Boolean);
  }

  const waiverCourses = parseTable(
    waiverTable,
    (row) => {
    const [codeTd, creditTd, titleTd, gradeTd] = row.querySelectorAll("td");
    return {
      code: codeTd.textContent.trim(),
      credits: parseFloat(creditTd.textContent),
      title: titleTd.textContent.trim(),
      grade: gradeTd.textContent.trim() || null,
    };
    },
    { minTds: 4 }
  );

  const transferCourses = parseTable(
    transferTable,
    (row) => {
    const [codeTd, creditTd, titleTd] = row.querySelectorAll("td");
    return {
      code: codeTd.textContent.trim(),
      credits: parseFloat(creditTd.textContent),
      title: titleTd.textContent.trim(),
    };
    },
    { minTds: 3 }
  );

  let semesterCourses = parseTable(
    semesterTable,
    (row) => {
    const cols = row.querySelectorAll("td");
    return {
      semester: cols[0].textContent.trim() || null,
      year: cols[1].textContent.trim() || null,
      code: cols[2].textContent.trim(),
      section: cols[3].textContent.trim(),
      facultyCode: cols[4].textContent.trim(),
      facultyName: cols[5].textContent.trim(),
      credits: parseFloat(cols[6].textContent),
      title: cols[7].textContent.trim(),
      grade: cols[8].textContent.trim() || null,
      crCount: parseFloat(cols[9].textContent),
      crPassed: parseFloat(cols[10].textContent),
    };
    },
    {
      // Skip semester summary rows like "Semester Credit / TGPA / CGPA"
      rowFilter: (row) => !row.classList.contains("summary-row"),
      minTds: 11,
    }
  );

  // Sort courses chronologically (oldest semester first)
  function getSemesterOrder(semesterName) {
    if (!semesterName) return 5;
    const lowerSemester = semesterName.toLowerCase();
    if (lowerSemester.includes("spring")) return 1;
    if (lowerSemester.includes("summer")) return 2;
    if (lowerSemester.includes("fall")) return 3;
    if (lowerSemester.includes("intersession")) return 4;
    return 5; // For any unknown semester types
  }

  // Fill missing semester/year data first
  semesterCourses.forEach((course, index) => {
    if (index > 0) {
      const prevCourse = semesterCourses[index - 1];
      if (!course.semester) course.semester = prevCourse.semester;
      if (!course.year) course.year = prevCourse.year;
    }
  });

  // Keep DOM order when editing inline in the main table (prevents row/index mismatch)
  if (!NSURB_INLINE_EDIT_MAIN_TABLE) {
  // Sort courses chronologically
  semesterCourses.sort((a, b) => {
    // Handle missing data
    if (!a.year || !b.year) return 0;
    if (!a.semester || !b.semester) return 0;

    const yearDiff = parseInt(a.year) - parseInt(b.year);
    if (yearDiff !== 0) {
      return yearDiff;
    }

    // Same year, sort by semester order
    return getSemesterOrder(a.semester) - getSemesterOrder(b.semester);
  });
  }

  let targetElement =
    findGradeHistoryRoot() ||
    document.querySelector(".hist-grades") ||
    null;

  if (targetElement) {
    console.log("Found grade history container, inserting calculator after it");

    let mainContainer =
      targetElement.closest(".container-fluid") ||
      targetElement.closest(".container") ||
      targetElement.parentElement;

    if (mainContainer) {
      // Hidden container used for internal calculations only (no visible UI)
      if (!document.getElementById("whatif-panel")) {
        const hidden = document.createElement("div");
        hidden.id = "whatif-panel";
        hidden.className = "nsurb-hidden";
        hidden.innerHTML = `
          <span id="current-cgpa" class="nsurb-hidden">—</span>
          <span id="whatif-result" class="nsurb-hidden">—</span>
        `;
        mainContainer.appendChild(hidden);
      }
    } else {
      console.error(
        "Could not find suitable parent container, appending to body"
      );
      insertAfterOriginalContent();
    }
  } else {
    console.log(
      "Grade history container not found, using alternative insertion method"
    );
    insertAfterOriginalContent();
  }
  function insertAfterOriginalContent() {
    console.log("Inserting calculator at the end of the body");
    // Hidden container used for internal calculations only (no visible UI)
    if (!document.getElementById("whatif-panel")) {
      const hidden = document.createElement("div");
      hidden.id = "whatif-panel";
      hidden.className = "nsurb-hidden";
      hidden.innerHTML = `
        <span id="current-cgpa" class="nsurb-hidden">—</span>
        <span id="whatif-result" class="nsurb-hidden">—</span>
      `;
      document.body.appendChild(hidden);
    }
  }
  const gradeMap = {
    A: 4.0,
    "A-": 3.7,
    "B+": 3.3,
    B: 3.0,
    "B-": 2.7,
    "C+": 2.3,
    C: 2.0,
    "C-": 1.7,
    "D+": 1.3,
    D: 1.0,
    F: 0.0,
    W: null, // Withdrawal, not counted in CGPA
    I: null, // Incomplete, not counted in CGPA
  };

  const originalCourses = JSON.parse(JSON.stringify(semesterCourses));

  function getCreditSummaryRow() {
    const root = findGradeHistoryRoot();
    if (!root) return null;
    const tables = Array.from(root.querySelectorAll("table"));
    for (const t of tables) {
      const headers = Array.from(t.querySelectorAll("thead th")).map((th) =>
        normText(th.textContent)
      );
      const looksLikeSummary =
        headersInclude(headers, ["student name"]) &&
        headersInclude(headers, ["credit completed"]) &&
        headersInclude(headers, ["cgpa"]);
      if (!looksLikeSummary) continue;
      const row = t.querySelector("tr td") ? t.querySelector("tr") : null;
      // Prefer first row after thead (often no tbody)
      const dataRow = t.querySelector("tbody tr") || t.querySelectorAll("tr")[1];
      if (dataRow) return dataRow;
    }
    return null;
  }

  function getDisplayedCurrentCGPAFromPage() {
    const r = getCreditSummaryRow();
    if (!r) return null;
    const tds = r.querySelectorAll("td");
    if (tds.length < 3) return null;
    const v = parseFloat((tds[2].textContent || "").trim());
    return isFinite(v) ? v : null;
  }
  function calcCurrentCgpa() {
    const validCourses = originalCourses.filter(
      (c) =>
        c.grade &&
        gradeMap[c.grade] !== undefined &&
        gradeMap[c.grade] !== null &&
        c.credits > 0
    );

    // Group courses by their code to handle retakes
    const coursesByCode = {};
    validCourses.forEach((course) => {
      const code = course.code;
      if (!coursesByCode[code]) {
        coursesByCode[code] = [];
      }
      coursesByCode[code].push(course);
    });

    // For each course code, only keep the course with the best grade and its credits
    const bestGradeCourses = [];
    Object.values(coursesByCode).forEach((courses) => {
      // Sort by grade points in descending order
      courses.sort(
        (a, b) => (gradeMap[b.grade] || 0) - (gradeMap[a.grade] || 0)
      );
      // Add only the course with the best grade (with its own credits, not summing all)
      bestGradeCourses.push(courses[0]);
    });

    const totalPoints = bestGradeCourses.reduce(
      (sum, c) => sum + (gradeMap[c.grade] || 0) * c.credits,
      0
    );
    const totalCredits = bestGradeCourses.reduce(
      (sum, c) => sum + c.credits,
      0
    );
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : "—";
  }

  // Prefer the CGPA shown on the page (so everything matches RDS),
  // fallback to our computed value if not found.
  let currentCGPAValue = (() => {
    const displayed = getDisplayedCurrentCGPAFromPage();
    if (displayed !== null) return displayed.toFixed(2);
    return calcCurrentCgpa();
  })();
  function calcWhatIfCgpa(courses) {
    // Filter courses with valid grades
    const validCourses = courses.filter(
      (c) =>
        c.grade &&
        gradeMap[c.grade] !== undefined &&
        gradeMap[c.grade] !== null &&
        c.credits > 0
    );
    // Group courses by their code to handle retakes
    const coursesByCode = {};
    validCourses.forEach((course) => {
      const code = course.code;
      if (!coursesByCode[code]) {
        coursesByCode[code] = [];
      }
      coursesByCode[code].push(course);
    });

    // For each course code, only keep the course with the best grade and its credits
    const bestGradeCourses = [];
    Object.values(coursesByCode).forEach((courses) => {
      // Sort by grade points in descending order
      courses.sort(
        (a, b) => (gradeMap[b.grade] || 0) - (gradeMap[a.grade] || 0)
      );
      // Add only the course with the best grade
      bestGradeCourses.push(courses[0]);
    });

    const totalPoints = bestGradeCourses.reduce(
      (sum, c) => sum + (gradeMap[c.grade] || 0) * c.credits,
      0
    );
    const totalCredits = bestGradeCourses.reduce(
      (sum, c) => sum + c.credits,
      0
    );
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : "—";
  }

  // Compute cumulative CGPA progression across semesters.
  // Used for per-semester CGPA display (including hypothetical semesters).
  function calculateSemesterCGPA(courses) {
    // Create a deep copy so we never mutate the source
    const coursesCopy = JSON.parse(JSON.stringify(courses || []));

    // Fill missing semester/year from previous row (RDS sometimes uses blank cells)
    coursesCopy.forEach((course, index) => {
      if (!course) return;
      if (index > 0) {
        const prevCourse = coursesCopy[index - 1] || {};
        if (!course.semester) course.semester = prevCourse.semester;
        if (!course.year) course.year = prevCourse.year;
      }
    });

    // Group courses by semester + year
    const semesterGroups = {};
    const semesterKeys = new Set();

    coursesCopy.forEach((course) => {
      if (!course) return;
      if (
        !course.grade ||
        gradeMap[course.grade] === undefined ||
        gradeMap[course.grade] === null
      ) {
        return; // Skip non-counting grades (W/I) and empty grades
      }

      const key =
        course.semester && course.year
          ? `${course.semester} ${course.year}`
          : "Unknown";

      if (!semesterGroups[key]) semesterGroups[key] = [];
      semesterGroups[key].push(course);
      semesterKeys.add(key);
    });

    // Sort semesters chronologically
    function getSemesterOrder(semesterName) {
      const lowerSemester = String(semesterName || "").toLowerCase();
      if (lowerSemester.includes("spring")) return 1;
      if (lowerSemester.includes("summer")) return 2;
      if (lowerSemester.includes("fall")) return 3;
      if (lowerSemester.includes("intersession")) return 4;
      return 5;
    }

    const semesterOrder = Array.from(semesterKeys)
      .filter((key) => key !== "Unknown")
      .sort((a, b) => {
        const [semesterA, yearA] = String(a).split(" ");
        const [semesterB, yearB] = String(b).split(" ");

        const yearDiff = parseInt(yearA) - parseInt(yearB);
        if (yearDiff !== 0) return yearDiff;
        return getSemesterOrder(semesterA) - getSemesterOrder(semesterB);
      });

    if (semesterKeys.has("Unknown")) semesterOrder.push("Unknown");

    const semesters = [];
    const cgpaValues = [];
    const totalCredits = [];
    const courseCounts = [];
    const semesterCredits = [];
    const semesterGPAs = [];

    // Track best grade per course code for cumulative CGPA (retake handling)
    const bestGradesByCourseCode = {};

    semesterOrder.forEach((semesterKey) => {
      const semCourses = semesterGroups[semesterKey] || [];

      // Per-semester GPA counts all graded courses in that semester
      let semTotalCredits = 0;
      let semTotalPoints = 0;

      semCourses.forEach((course) => {
        if (
          !course ||
          !course.grade ||
          gradeMap[course.grade] === undefined ||
          gradeMap[course.grade] === null ||
          !(Number(course.credits) > 0)
        ) {
          return;
        }

        const cr = Number(course.credits) || 0;
        const pts = (gradeMap[course.grade] || 0) * cr;
        semTotalCredits += cr;
        semTotalPoints += pts;

        const code = course.code;
        if (!code) return;
        if (
          !bestGradesByCourseCode[code] ||
          (gradeMap[course.grade] || 0) >
            (gradeMap[bestGradesByCourseCode[code].grade] || 0)
        ) {
          bestGradesByCourseCode[code] = course;
        }
      });

      // Cumulative CGPA uses best grade per course code (only best course's credits count)
      let cumulativePoints = 0;
      let cumulativeCredits = 0;
      Object.values(bestGradesByCourseCode).forEach((course) => {
        if (!course) return;
        cumulativePoints += (gradeMap[course.grade] || 0) * (Number(course.credits) || 0);
        cumulativeCredits += Number(course.credits) || 0;
      });

      const semGPA =
        semTotalCredits > 0 ? semTotalPoints / semTotalCredits : 0;
      const cgpa =
        cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

      semesters.push(semesterKey);
      cgpaValues.push(parseFloat(cgpa.toFixed(2)));
      totalCredits.push(cumulativeCredits);
      semesterCredits.push(semTotalCredits);
      courseCounts.push(semCourses.length);
      semesterGPAs.push(parseFloat(semGPA.toFixed(2)));
    });

    return {
      semesters,
      cgpaValues,
      totalCredits,
      courseCounts,
      semesterCredits,
      semesterGPAs,
    };
  }

  function renderInputs(courses) {
    const container = document.getElementById("course-inputs-container");
    if (!container) return;
    container.innerHTML = ""; // clear

    // In inline-edit mode, this table is only for added (hypothetical) courses.
    const inlineMode = NSURB_INLINE_EDIT_MAIN_TABLE;
    const ui = inlineMode
      ? { search: "", semester: "", onlyChanged: false }
      : {
          search: (document.getElementById("nsurb-search")?.value || "").trim(),
          semester:
            document.getElementById("nsurb-semester-filter")?.value || "",
          onlyChanged: !!document.getElementById("nsurb-only-changed")?.checked,
        };
    const q = (ui.search || "").toLowerCase();

    const table = document.createElement("table");
    table.className = "table table-striped table-hover";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Course Code</th>
          <th>Course Title</th>
          <th>Credits</th>
          <th>Grade</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="course-inputs"></tbody>
    `;
    container.appendChild(table);

    const tbody = document.getElementById("course-inputs");
    let lastSemesterYear = null;

    let visibleCount = 0;
    let visibleCredits = 0;

    courses.forEach((c, i) => {
      if (inlineMode && !c._isHypothetical) return;
      const currentSemesterYear =
        c.semester && c.year ? `${c.semester} ${c.year}` : "";

      // Filters (display-only; the underlying data remains unchanged)
      if (!inlineMode) {
        if (ui.semester && currentSemesterYear !== ui.semester) return;
        if (q) {
          const hay = `${c.code || ""} ${c.title || ""}`.toLowerCase();
          if (!hay.includes(q)) return;
        }
      }

      const row = document.createElement("tr");

      const isOriginalCourse = originalCourses.some((oc) => oc.code === c.code);

      const originalCourse = originalCourses.find((oc) => oc.code === c.code);
      const isGradeChanged = originalCourse && originalCourse.grade !== c.grade;

      if (ui.onlyChanged && !isGradeChanged) return;

      if (isGradeChanged) {
        row.classList.add("nsurb-changed");
        row.style.borderLeft = "3px solid #f59e0b";
      }

      // For the hypothetical table we don't group by semester
      const showSemesterInfo =
        !inlineMode && currentSemesterYear && currentSemesterYear !== lastSemesterYear;
      if (!inlineMode && showSemesterInfo && lastSemesterYear !== null) {
        const dividerRow = document.createElement("tr");
        dividerRow.style.height = "5px";
        dividerRow.style.backgroundColor = "#f8f9fa";
        dividerRow.innerHTML =
          '<td colspan="6" style="padding: 2px; border-top: 2px solid #e9ecef;"></td>';
        tbody.appendChild(dividerRow);
      }

      const gradeClass = (() => {
        const g = (c.grade || "").toUpperCase();
        if (g.startsWith("A")) return "nsurb-a";
        if (g.startsWith("B")) return "nsurb-b";
        if (g.startsWith("C")) return "nsurb-c";
        if (g.startsWith("D")) return "nsurb-d";
        if (g.startsWith("F")) return "nsurb-f";
        return "";
      })();

      row.innerHTML = `
        <td><span class="nsurb-pill">${c.code || "NEW"}</span></td>
        <td>${c.title || "New Course Title"}</td>
        <td>
          <input type="number" data-idx="${i}" class="credit-input form-control" 
                 value="${
                   c.credits || 0
                 }" min="0" max="5" step="0.5" style="width: 70px"
                 ${!c._isHypothetical ? "disabled" : ""}>
        </td>
        <td>
          <select data-idx="${i}" data-code="${
        c.code
      }" class="grade-select form-control" 
                  style="width: 70px; ${
                    isGradeChanged
                      ? "background-color: #fff3cd; font-weight: bold;"
                      : ""
                  }">
            <option value="">—</option>
            ${Object.keys(gradeMap)
              .map(
                (g) =>
                  `<option ${c.grade === g ? "selected" : ""}>${g}</option>`
              )
              .join("")}
          </select>
          <div style="margin-top: 6px;" class="${inlineMode ? "nsurb-hidden" : ""}">
            <span class="nsurb-pill nsurb-grade ${gradeClass}">${c.grade || "—"}</span>
          </div>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            ${
              isGradeChanged
                ? `<button class="reset-grade btn btn-warning btn-sm" data-idx="${i}" data-original-grade="${originalCourse.grade}" title="Reset to original grade">
                ↻
              </button>`
                : ""
            }
            <button class="remove-course btn btn-danger btn-sm" data-idx="${i}" title="Remove course">
              ✕
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);

      if (!inlineMode && showSemesterInfo) {
        lastSemesterYear = currentSemesterYear;
      }

      visibleCount += 1;
      visibleCredits += c.credits || 0;
    });

    // Display current CGPA using the cached value
    document.getElementById("current-cgpa").innerText = currentCGPAValue;

    const countEl = document.getElementById("nsurb-visible-count");
    const creditsEl = document.getElementById("nsurb-visible-credits");
    if (countEl) countEl.textContent = String(visibleCount);
    if (creditsEl) creditsEl.textContent = visibleCredits.toFixed(1);

    if (inlineMode && visibleCount === 0) {
      container.innerHTML =
        '<div class="alert alert-info" style="margin:0;">No added courses yet. Use <b>Add New Course</b> to add hypothetical courses.</div>';
    }
  }

  // initial render
  renderInputs(semesterCourses);

  // Load saved edits from storage
  loadEditsFromStorage().then(() => {
    renderInputs(semesterCourses);
    setupInlineGradeEditing();
    update();
  });

  // Inline grade editor inside the real RDS "Regular Courses" table
  function setupInlineGradeEditing() {
    if (!NSURB_INLINE_EDIT_MAIN_TABLE) return;
    if (!semesterTable) return;
    if (document.getElementById("nsurb-inline-ready")) return;

    // Move the what-if panel right above the regular courses table (so it's not at page bottom)
    const panelRow = document.getElementById("whatif-panel")?.closest(".row");
    if (panelRow) {
      try {
        semesterTable.parentElement?.insertBefore(panelRow, semesterTable);
      } catch (_) {
        // ignore
      }
    }

    // Hide the big search/filter toolbar in inline mode (editing happens in the main table)
    const toolbar = document.querySelector("#whatif-panel .nsurb-toolbar");
    if (toolbar) toolbar.classList.add("nsurb-hidden");

    // Identify the "Course Grade" column index
    const headers = Array.from(semesterTable.querySelectorAll("thead th")).map((th) =>
      normText(th.textContent)
    );
    let gradeColIdx = headers.findIndex((h) => h.includes("course grade") || h === "grade");
    if (gradeColIdx < 0) gradeColIdx = 8; // fallback for known layout

    const tbodyRows = Array.from(semesterTable.querySelectorAll("tbody tr"));
    let courseIdx = 0;

    tbodyRows.forEach((row) => {
      if (row.classList.contains("divider-td")) return;
      if (row.classList.contains("summary-row")) return;

      const tds = row.querySelectorAll("td");
      if (tds.length < 11) return;

      const course = semesterCourses[courseIdx];
      const original = originalCourses[courseIdx];
      if (!course || !original) return;

      const gradeCell = tds[gradeColIdx];
      if (!gradeCell) return;

      // Build dropdown
      const select = document.createElement("select");
      select.className = "form-control nsurb-inline-grade-select";
      select.style.width = "82px";
      select.dataset.idx = String(courseIdx);
      select.dataset.originalGrade = original.grade || "";

      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "—";
      select.appendChild(emptyOpt);

      Object.keys(gradeMap).forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        if ((course.grade || "") === g) opt.selected = true;
        select.appendChild(opt);
      });

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "nsurb-inline-reset";
      resetBtn.textContent = "↻";
      resetBtn.title = "Reset to original grade";

      const wrap = document.createElement("span");
      wrap.className = "nsurb-inline-grade";
      wrap.appendChild(select);
      wrap.appendChild(resetBtn);

      gradeCell.innerHTML = "";
      gradeCell.appendChild(wrap);

      function applyRowState() {
        const changed = (course.grade || "") !== (original.grade || "");
        if (changed) {
          row.classList.add("nsurb-changed");
          row.style.borderLeft = "3px solid #f59e0b";
          select.style.backgroundColor = "#fff3cd";
          select.style.fontWeight = "bold";
        } else {
          row.classList.remove("nsurb-changed");
          row.style.borderLeft = "";
          select.style.backgroundColor = "";
          select.style.fontWeight = "";
        }
      }

      select.addEventListener("change", () => {
        const idx = parseInt(select.dataset.idx);
        if (idx >= 0 && idx < semesterCourses.length) {
          semesterCourses[idx].grade = select.value;
          course.grade = select.value;
          applyRowState();
          update();
        }
      });

      resetBtn.addEventListener("click", () => {
        const idx = parseInt(select.dataset.idx);
        const og = select.dataset.originalGrade || "";
        if (idx >= 0 && idx < semesterCourses.length) {
          semesterCourses[idx].grade = og || null;
          course.grade = og || null;
          select.value = og || "";
          applyRowState();
          update();
        }
      });

      applyRowState();
      courseIdx += 1;
    });

    // Mark initialized
    const marker = document.createElement("span");
    marker.id = "nsurb-inline-ready";
    marker.className = "nsurb-hidden";
    document.body.appendChild(marker);

    // In inline mode, the "course-inputs-container" shows only hypothetical courses,
    // so render once now to show the empty hint.
    renderInputs(semesterCourses);
    renderHypotheticalRowsInMainTable();
    bindHypControlsIfNeeded();

    // Render initial (no-change) state; badges will appear after first change
    update();
  }

  function calcCrCountPassed(credits, grade) {
    const c = Number(credits) || 0;
    const g = grade || "";
    if (!g || gradeMap[g] === undefined || gradeMap[g] === null || c <= 0) {
      return { crCount: 0, crPassed: 0 };
    }
    const pts = gradeMap[g] || 0;
    return { crCount: c, crPassed: pts > 0 ? c : 0 };
  }

  function isValidCourseCode(code) {
    return /^[A-Z0-9]+$/.test(String(code || "").trim());
  }

  function findHypSummaryRowByKey(key) {
    if (!semesterTable) return null;
    const rows = Array.from(
      semesterTable.querySelectorAll("tr.nsurb-hyp-summary")
    );
    return rows.find((r) => r.dataset && r.dataset.key === key) || null;
  }

  function updateHypSemesterSummaryRow(key) {
    if (!NSURB_INLINE_EDIT_MAIN_TABLE) return;
    if (!semesterTable) return;
    if (!key) return;

    // recompute semester credit + TGPA for this hypothetical semester
    const items = semesterCourses.filter(
      (c) => c && c._isHypothetical && semKeyFromCourse(c) === key
    );
    const valid = items.filter(
      (c) =>
        isValidCourseCode(c.code) &&
        c.grade &&
        gradeMap[c.grade] !== undefined &&
        gradeMap[c.grade] !== null &&
        (Number(c.credits) || 0) > 0
    );

    const semCredits = valid.reduce((s, c) => s + (Number(c.credits) || 0), 0);
    const semPoints = valid.reduce(
      (s, c) => s + (gradeMap[c.grade] || 0) * (Number(c.credits) || 0),
      0
    );
    const semTGPA = semCredits > 0 ? semPoints / semCredits : 0;

    // compute cumulative CGPA at this semester
    const cumulative = calculateSemesterCGPA(
      semesterCourses.filter((c) => c.semester && c.year)
    );
    let cumCGPA = null;
    cumulative.semesters.forEach((k, i) => {
      if (k === key) cumCGPA = Number(cumulative.cgpaValues[i]);
    });

    const row = findHypSummaryRowByKey(key);
    if (!row) return;
    row.innerHTML = `
      <td colspan="5" align="left"><b>Semester Credit</b> : ${semCredits.toFixed(
        2
      )}</td>
      <td colspan="4">&nbsp;&nbsp;<b>TGPA</b> : ${semTGPA.toFixed(2)}</td>
      <td colspan="2" style="text-align: right"><b>CGPA</b> : ${
        isFinite(cumCGPA) ? Number(cumCGPA).toFixed(2) : "—"
      }</td>
    `;
  }

  function normalizeSemesterName(input) {
    const v = (input || "").trim().toLowerCase();
    if (!v) return "";
    if (v.startsWith("spr")) return "Spring";
    if (v.startsWith("sum")) return "Summer";
    if (v.startsWith("fal")) return "Fall";
    if (v.startsWith("int")) return "Intersession";
    // try capitalize first letter
    return v.charAt(0).toUpperCase() + v.slice(1);
  }

  function ensureSemesterModal() {
    if (document.getElementById("nsurb-semester-modal")) return;
    const modal = document.createElement("div");
    modal.id = "nsurb-semester-modal";
    modal.innerHTML = `
      <div class="nsurb-modal-card" role="dialog" aria-modal="true" aria-label="Add new semester">
        <div class="nsurb-modal-h">Add New Semester</div>
        <div class="nsurb-modal-b">
          <div class="nsurb-modal-row">
            <div style="flex:1;">
              <label for="nsurb-semester-select">Semester</label>
              <select id="nsurb-semester-select">
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
                <option value="Intersession">Intersession</option>
              </select>
            </div>
            <div style="flex:1;">
              <label for="nsurb-year-select">Year</label>
              <select id="nsurb-year-select"></select>
            </div>
          </div>
          <div class="nsurb-modal-actions">
            <button type="button" class="nsurb-btn" id="nsurb-sem-cancel">Cancel</button>
            <button type="button" class="nsurb-btn primary" id="nsurb-sem-ok">Add</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Fill years 2026-2035
    const yearSel = modal.querySelector("#nsurb-year-select");
    for (let y = 2026; y <= 2035; y++) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      yearSel.appendChild(opt);
    }

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.dataset.nsurbResolve?.("cancel");
      }
    });
  }

  function openSemesterModal() {
    ensureSemesterModal();
    const modal = document.getElementById("nsurb-semester-modal");
    const semSel = modal.querySelector("#nsurb-semester-select");
    const yearSel = modal.querySelector("#nsurb-year-select");
    const okBtn = modal.querySelector("#nsurb-sem-ok");
    const cancelBtn = modal.querySelector("#nsurb-sem-cancel");

    // Default selection
    semSel.value = "Spring";
    yearSel.value = "2026";

    return new Promise((resolve) => {
      function cleanup() {
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
        modal.style.display = "none";
        delete modal.dataset.nsurbResolve;
      }
      function onOk() {
        const semester = normalizeSemesterName(semSel.value);
        const year = String(yearSel.value || "").trim();
        cleanup();
        resolve({ semester, year, key: `${semester} ${year}` });
      }
      function onCancel() {
        cleanup();
        resolve(null);
      }
      function onKey(e) {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") onOk();
      }

      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);

      modal.dataset.nsurbResolve = (x) => {
        if (x === "cancel") onCancel();
      };
      modal.style.display = "flex";
      // focus
      setTimeout(() => semSel.focus(), 0);
    });
  }

  async function promptNewSemester() {
    const res = await openSemesterModal();
    if (!res) return null;
    const { semester, year } = res;
    if (!semester || !/^\d{4}$/.test(year)) return null;
    const key = `${semester} ${year}`;
    if (!nsurbHypSemesters.some((s) => `${s.semester} ${s.year}` === key)) {
      nsurbHypSemesters.push({ semester, year });
    }
    nsurbActiveHypKey = key;
    return { semester, year, key };
  }

  async function ensureActiveHypSemester() {
    if (nsurbActiveHypKey) {
      const [semester, year] = nsurbActiveHypKey.split(" ");
      return { semester, year, key: nsurbActiveHypKey };
    }
    return await promptNewSemester();
  }

  function semKeyFromCourse(c) {
    return c && c.semester && c.year ? `${c.semester} ${c.year}` : "";
  }

  function refreshInlineEditorsFromState() {
    if (!NSURB_INLINE_EDIT_MAIN_TABLE) return;
    if (!semesterTable) return;

    const tbodyRows = Array.from(semesterTable.querySelectorAll("tbody tr"));
    let courseIdx = 0;
    tbodyRows.forEach((row) => {
      if (row.classList.contains("divider-td")) return;
      if (row.classList.contains("summary-row")) return;
      if (row.classList.contains("nsurb-hyp-row")) return;
      if (row.classList.contains("nsurb-hyp-summary")) return;

      const tds = row.querySelectorAll("td");
      if (tds.length < 11) return;

      const course = semesterCourses[courseIdx];
      const original = originalCourses[courseIdx];
      const select = row.querySelector("select.nsurb-inline-grade-select");
      if (course && original && select) {
        select.value = course.grade || "";
        const changed = (course.grade || "") !== (original.grade || "");
        if (changed) {
          row.classList.add("nsurb-changed");
          row.style.borderLeft = "3px solid #f59e0b";
          select.style.backgroundColor = "#fff3cd";
          select.style.fontWeight = "bold";
        } else {
          row.classList.remove("nsurb-changed");
          row.style.borderLeft = "";
          select.style.backgroundColor = "";
          select.style.fontWeight = "";
        }
      }
      courseIdx += 1;
    });
  }

  function renderHypotheticalRowsInMainTable() {
    if (!NSURB_INLINE_EDIT_MAIN_TABLE) return;
    if (!semesterTable) return;

    const tbody = semesterTable.querySelector("tbody");
    if (!tbody) return;

    // Remove previously rendered hypothetical rows
    tbody
      .querySelectorAll(
        "tr.nsurb-hyp-row, tr.nsurb-hyp-summary, tr.nsurb-hyp-divider, tr.nsurb-hyp-controls"
      )
      .forEach((n) => n.remove());

    // Global controls row (always visible): Add Semester only
    const controlsRow = document.createElement("tr");
    controlsRow.className = "nsurb-hyp-controls";
    controlsRow.innerHTML = `
      <td colspan="11" style="padding: 10px 8px; text-align: right;">
        <div class="btn-group">
          <button id="nsurb-add-semester" class="btn btn-primary">+ Add New Semester</button>
        </div>
      </td>
    `;
    tbody.appendChild(controlsRow);
    // Bind events after controls exist
    bindHypControlsIfNeeded();

    const hyp = semesterCourses
      .map((c, idx) => ({ c, idx }))
      .filter(({ c }) => !!c._isHypothetical);

    const groups = new Map(); // key -> [{c, idx}]
    hyp.forEach(({ c, idx }) => {
      const key =
        c.semester && c.year ? `${c.semester} ${c.year}` : nsurbActiveHypKey || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ c, idx });
    });

    // include empty semesters created by user
    nsurbHypSemesters.forEach((s) => {
      const key = `${s.semester} ${s.year}`;
      if (!groups.has(key)) groups.set(key, []);
    });

    if (groups.size === 0) {
      const hint = document.createElement("tr");
      hint.className = "nsurb-hyp-row";
      hint.innerHTML = `
        <td colspan="11" style="padding: 10px 8px; color: rgba(0,0,0,.70); font-weight: 600;">
          Use <b>Add New Semester</b> first, then add courses inside that semester.
        </td>
      `;
      tbody.appendChild(hint);
      return;
    }

    // Compute cumulative CGPA per semester for displaying CGPA in each summary row
    const cumulative = calculateSemesterCGPA(
      semesterCourses.filter((c) => c.semester && c.year)
    );
    const cumMap = {};
    cumulative.semesters.forEach((k, i) => {
      cumMap[k] = {
        cgpa: Number(cumulative.cgpaValues[i]),
      };
    });

    // Divider before the block (like the website's divider rows)
    const divider = document.createElement("tr");
    divider.className = "divider-td nsurb-hyp-divider";
    divider.innerHTML = `<td colspan="11">&nbsp;</td>`;
    tbody.appendChild(divider);

    // Render each semester block
    Array.from(groups.keys()).forEach((key) => {
      const items = groups.get(key) || [];
      const [semName, semYear] = key ? key.split(" ") : ["", ""];

      // If no courses yet, show a placeholder row so the semester "block" is visible
      if (items.length === 0) {
        const placeholder = document.createElement("tr");
        placeholder.className = "nsurb-hyp-row";
        placeholder.innerHTML = `
          <td class="special">${semName || "New Semester"}</td>
          <td class="special">${semYear || ""}</td>
          <td colspan="9" style="color: rgba(0,0,0,.65); font-weight: 600;">
            Empty semester — use the buttons below to add a course here.
          </td>
        `;
        tbody.appendChild(placeholder);

        const perControls = document.createElement("tr");
        perControls.className = "nsurb-hyp-controls";
        perControls.innerHTML = `
          <td colspan="11" style="padding: 8px; text-align: right;">
            <div class="btn-group">
              <button type="button" class="btn btn-success nsurb-btn-add-course" data-key="${key}">+ Add New Course</button>
              <button type="button" class="btn btn-warning nsurb-btn-reset-semester" data-key="${key}">↻ Reset Semester</button>
            </div>
          </td>
        `;
        tbody.appendChild(perControls);
        bindHypControlsIfNeeded();

        const div2 = document.createElement("tr");
        div2.className = "divider-td nsurb-hyp-divider";
        div2.innerHTML = `<td colspan="11">&nbsp;</td>`;
        tbody.appendChild(div2);
        return;
      }

      // Render each hypothetical course as a row with the same 11 columns
      items.forEach(({ c, idx }, localIdx) => {
      const row = document.createElement("tr");
      row.className = "nsurb-hyp-row";

      const sem = localIdx === 0 ? semName : "";
      const year = localIdx === 0 ? semYear : "";

      const { crCount, crPassed } = calcCrCountPassed(c.credits, c.grade);

      row.innerHTML = `
        <td class="special">${sem}</td>
        <td class="special">${year}</td>
        <td>
          <div class="nsurb-code-cell">
            <input class="form-control nsurb-hyp-code" data-idx="${idx}" type="text" value="${(c.code || "").toUpperCase()}" placeholder="e.g. CSE115" style="width: 90px;">
            <div class="nsurb-code-warn nsurb-hidden">Course code is required</div>
          </div>
        </td>
        <td>TBA</td>
        <td>TBA</td>
        <td class="faculty-name">TBA</td>
        <td><input class="form-control nsurb-hyp-credits" data-idx="${idx}" type="number" min="0" max="5" step="0.5" value="${Number(c.credits || 0)}" style="width: 80px;"></td>
        <td class="nsurb-hyp-title">${c.title && String(c.title).trim() ? c.title : "Unknown"}</td>
        <td class="nsurb-inline-grade"></td>
        <td class="nsurb-hyp-crcount">${crCount.toFixed(2)}</td>
        <td class="nsurb-hyp-crpassed">${crPassed.toFixed(2)}</td>
      `;

      // Grade editor inside the grade cell (same behavior)
      const gradeCell = row.querySelector("td.nsurb-inline-grade");
      const select = document.createElement("select");
      select.className = "form-control nsurb-hyp-grade";
      select.dataset.idx = String(idx);
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "—";
      select.appendChild(emptyOpt);
      Object.keys(gradeMap).forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        if ((c.grade || "") === g) opt.selected = true;
        select.appendChild(opt);
      });

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "nsurb-inline-reset";
      resetBtn.title = "Clear grade";
      resetBtn.textContent = "↻";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "nsurb-inline-reset";
      removeBtn.title = "Remove added course";
      removeBtn.textContent = "✕";

      const wrap = document.createElement("span");
      wrap.className = "nsurb-inline-grade";
      wrap.appendChild(select);
      wrap.appendChild(resetBtn);
      wrap.appendChild(removeBtn);
      gradeCell.appendChild(wrap);

      function syncComputedCells() {
        const course = semesterCourses[idx];
        const titleCell = row.querySelector(".nsurb-hyp-title");
        const cc = row.querySelector(".nsurb-hyp-crcount");
        const cp = row.querySelector(".nsurb-hyp-crpassed");
        // Title is not user-input for added courses
        course.title = "Unknown";
        if (titleCell) titleCell.textContent = "Unknown";

        const hasCode = isValidCourseCode(course.code);
        const gradeCounts =
          course.grade &&
          gradeMap[course.grade] !== undefined &&
          gradeMap[course.grade] !== null;

        const res = hasCode
          ? calcCrCountPassed(course.credits, course.grade)
          : { crCount: 0, crPassed: 0 };
        if (cc) cc.textContent = res.crCount.toFixed(2);
        if (cp) cp.textContent = res.crPassed.toFixed(2);

        // Course code mandatory: show warning ONLY when grade is selected but code missing
        const codeInput = row.querySelector("input.nsurb-hyp-code");
        const warn = row.querySelector(".nsurb-code-warn");
        if (codeInput) {
          const shouldWarn = gradeCounts && !hasCode;
          if (shouldWarn) {
            codeInput.style.borderColor = "#dc2626";
            codeInput.style.boxShadow = "0 0 0 2px rgba(220,38,38,.10)";
            if (warn) warn.classList.remove("nsurb-hidden");
          } else {
            codeInput.style.borderColor = "";
            codeInput.style.boxShadow = "";
            if (warn) warn.classList.add("nsurb-hidden");
          }
        }
      }

      row.querySelector(".nsurb-hyp-code")?.addEventListener("input", (e) => {
        const v = String(e.target.value || "").toUpperCase();
        // keep only letters+digits
        const cleaned = v.replace(/[^A-Z0-9]/g, "");
        e.target.value = cleaned;
        semesterCourses[idx].code = cleaned;
        semesterCourses[idx].title = "Unknown";
        syncComputedCells();
        // Don't re-render while typing (keeps cursor stable)
        nsurbSkipHypRender = true;
        updateHypSemesterSummaryRow(semKeyFromCourse(semesterCourses[idx]));
        update();
        nsurbSkipHypRender = false;
      });

      row.querySelector(".nsurb-hyp-credits")?.addEventListener("input", (e) => {
        semesterCourses[idx].credits = parseFloat(e.target.value) || 0;
        syncComputedCells();
        nsurbSkipHypRender = true;
        updateHypSemesterSummaryRow(semKeyFromCourse(semesterCourses[idx]));
        update();
        nsurbSkipHypRender = false;
      });

      select.addEventListener("change", () => {
        semesterCourses[idx].grade = select.value;
        syncComputedCells();
        // grade change can re-render safely, but we still update summary immediately
        updateHypSemesterSummaryRow(semKeyFromCourse(semesterCourses[idx]));
        update();
      });

      resetBtn.addEventListener("click", () => {
        semesterCourses[idx].grade = null;
        select.value = "";
        syncComputedCells();
        updateHypSemesterSummaryRow(semKeyFromCourse(semesterCourses[idx]));
        update();
      });

      removeBtn.addEventListener("click", () => {
        semesterCourses.splice(idx, 1);
        renderHypotheticalRowsInMainTable();
        update();
      });

      tbody.appendChild(row);

      // initial computed state
      syncComputedCells();
      });

      // Summary row for this semester block (matches website style)
      const valid = items
        .map(({ c }) => c)
        .filter(
          (c) =>
            c.grade &&
            gradeMap[c.grade] !== undefined &&
            gradeMap[c.grade] !== null &&
            (Number(c.credits) || 0) > 0
        );

      const semCredits = valid.reduce((s, c) => s + (Number(c.credits) || 0), 0);
      const semPoints = valid.reduce(
        (s, c) => s + (gradeMap[c.grade] || 0) * (Number(c.credits) || 0),
        0
      );
      const semTGPA = semCredits > 0 ? semPoints / semCredits : 0;
      const cumCGPA = cumMap[key]?.cgpa;

      const sumRow = document.createElement("tr");
      sumRow.className = "summary-row nsurb-hyp-summary";
      sumRow.innerHTML = `
        <td colspan="5" align="left"><b>Semester Credit</b> : ${semCredits.toFixed(2)}</td>
        <td colspan="4">&nbsp;&nbsp;<b>TGPA</b> : ${semTGPA.toFixed(2)}</td>
        <td colspan="2" style="text-align: right"><b>CGPA</b> : ${
          isFinite(cumCGPA) ? Number(cumCGPA).toFixed(2) : "—"
        }</td>
      `;
      tbody.appendChild(sumRow);

      const perControls = document.createElement("tr");
      perControls.className = "nsurb-hyp-controls";
      perControls.innerHTML = `
        <td colspan="11" style="padding: 8px; text-align: right;">
          <div class="btn-group">
            <button type="button" class="btn btn-success nsurb-btn-add-course" data-key="${key}">+ Add New Course</button>
            <button type="button" class="btn btn-warning nsurb-btn-reset-semester" data-key="${key}">↻ Reset Semester</button>
          </div>
        </td>
      `;
      tbody.appendChild(perControls);
      bindHypControlsIfNeeded();

      const div2 = document.createElement("tr");
      div2.className = "divider-td nsurb-hyp-divider";
      div2.innerHTML = `<td colspan="11">&nbsp;</td>`;
      tbody.appendChild(div2);
    });
  }

  // Populate semester filter options (unique semesters, chronological)
  function initSemesterFilter() {
    const select = document.getElementById("nsurb-semester-filter");
    if (!select) return;

    const keys = Array.from(
      new Set(
        semesterCourses
          .map((c) =>
            c.semester && c.year ? `${c.semester} ${c.year}` : ""
          )
          .filter(Boolean)
      )
    );

    // Try to sort chronologically using existing helper
    keys.sort((a, b) => {
      const [sa, ya] = a.split(" ");
      const [sb, yb] = b.split(" ");
      const yearDiff = parseInt(ya) - parseInt(yb);
      if (yearDiff !== 0) return yearDiff;
      return getSemesterOrder(sa) - getSemesterOrder(sb);
    });

    // Keep first option, then append unique keys
    const keep = select.querySelector("option[value='']");
    select.innerHTML = "";
    if (keep) select.appendChild(keep);
    keys.forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      select.appendChild(opt);
    });
  }

  initSemesterFilter();

  // Filter/search handlers (display-only)
  const searchEl = document.getElementById("nsurb-search");
  const semEl = document.getElementById("nsurb-semester-filter");
  const changedEl = document.getElementById("nsurb-only-changed");
  [searchEl, semEl, changedEl].forEach((el) => {
    if (!el) return;
    const evt = el === searchEl ? "input" : "change";
    el.addEventListener(evt, () => renderInputs(semesterCourses));
  });

  // Export visible courses to CSV
  function exportVisibleCoursesCSV() {
    const q = (document.getElementById("nsurb-search")?.value || "")
      .trim()
      .toLowerCase();
    const sem = document.getElementById("nsurb-semester-filter")?.value || "";
    const onlyChanged = !!document.getElementById("nsurb-only-changed")?.checked;

    const rows = [];
    rows.push([
      "Semester",
      "Course Code",
      "Course Title",
      "Credits",
      "Grade",
      "Changed",
    ]);

    semesterCourses.forEach((c) => {
      const key = c.semester && c.year ? `${c.semester} ${c.year}` : "";
      if (sem && key !== sem) return;
      if (q) {
        const hay = `${c.code || ""} ${c.title || ""}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      const oc = originalCourses.find((x) => x.code === c.code);
      const changed = !!(oc && oc.grade !== c.grade);
      if (onlyChanged && !changed) return;

      rows.push([
        key,
        c.code || "",
        c.title || "",
        String(c.credits ?? ""),
        c.grade || "",
        changed ? "yes" : "no",
      ]);
    });

    const csv = rows
      .map((r) =>
        r
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nsu-rds-buddy-courses.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const exportBtn = document.getElementById("nsurb-export-csv");
  if (exportBtn) exportBtn.addEventListener("click", exportVisibleCoursesCSV);

  // Chart is always shown (toggle removed as requested)

  // event delegation
  document.getElementById("whatif-panel").addEventListener("change", (e) => {
    if (
      e.target.classList.contains("grade-select") ||
      e.target.classList.contains("credit-input")
    ) {
      update();
    }
  });

  // Add event listener for remove course buttons and reset course buttons
  document.getElementById("whatif-panel").addEventListener("click", (e) => {
    // For remove course buttons
    if (
      e.target.classList.contains("remove-course") ||
      e.target.closest(".remove-course")
    ) {
      const button = e.target.classList.contains("remove-course")
        ? e.target
        : e.target.closest(".remove-course");
      const idx = parseInt(button.dataset.idx);
      semesterCourses.splice(idx, 1);
      renderInputs(semesterCourses);
      update();
    }

    // For reset individual course grade buttons
    if (
      e.target.classList.contains("reset-grade") ||
      e.target.closest(".reset-grade")
    ) {
      const button = e.target.classList.contains("reset-grade")
        ? e.target
        : e.target.closest(".reset-grade");
      const idx = parseInt(button.dataset.idx);
      const originalGrade = button.dataset.originalGrade;

      // Reset the grade in the semesterCourses array
      if (idx >= 0 && idx < semesterCourses.length) {
        semesterCourses[idx].grade = originalGrade;

        // Re-render the inputs and update the calculation
        renderInputs(semesterCourses);
        update();
      }
    }
  });

  function bindHypControlsIfNeeded() {
    // Buttons are rendered inside the main table, so bind after rendering.
    const addSemBtn = document.getElementById("nsurb-add-semester");

    if (addSemBtn && !addSemBtn.dataset.nsurbBound) {
      addSemBtn.dataset.nsurbBound = "1";
      addSemBtn.addEventListener("click", async () => {
        const res = await promptNewSemester();
        if (!res) return;
        renderHypotheticalRowsInMainTable();
        update();
      });
    }

    // Delegate per-semester controls
    const tbody = semesterTable?.querySelector("tbody");
    if (tbody && !tbody.dataset.nsurbDelegated) {
      tbody.dataset.nsurbDelegated = "1";
      tbody.addEventListener("click", (e) => {
        const addBtn = e.target.closest?.(".nsurb-btn-add-course");
        const resetBtn = e.target.closest?.(".nsurb-btn-reset-semester");

        if (addBtn) {
          const key = addBtn.dataset.key || "";
          if (!key) return;
          const [semester, year] = key.split(" ");
          semesterCourses.push({
            code: "",
            title: "Unknown",
            credits: 3,
            grade: null,
            _isHypothetical: true,
            semester,
            year,
          });
          nsurbActiveHypKey = key;
          renderHypotheticalRowsInMainTable();
          update();
          setTimeout(() => {
            const inputs = Array.from(
              semesterTable.querySelectorAll("tr.nsurb-hyp-row input.nsurb-hyp-code")
            );
            const last = inputs[inputs.length - 1];
            if (last) {
              last.focus();
              last.select?.();
            }
          }, 0);
          return;
        }

        if (resetBtn) {
          const key = resetBtn.dataset.key || "";
          if (!key) return;

          // 1) Remove hypothetical courses for this semester
          semesterCourses = semesterCourses.filter(
            (c) => !(c._isHypothetical && semKeyFromCourse(c) === key)
          );

          // 2) Reset edited grades for original courses for this semester
          for (let i = 0; i < semesterCourses.length && i < originalCourses.length; i++) {
            const c = semesterCourses[i];
            const o = originalCourses[i];
            if (!c || !o) continue;
            if (c._isHypothetical) continue;
            if (semKeyFromCourse(c) === key) {
              c.grade = o.grade;
            }
          }

          renderHypotheticalRowsInMainTable();
          refreshInlineEditorsFromState();
          update();
        }
      });
    }
  }

  // Storage functionality for persisting edits
  function saveEditsToStorage() {
    const courseEdits = semesterCourses.map((c, idx) => {
      const original = originalCourses[idx];
      if (!c._isHypothetical && original && c.grade !== original.grade) {
        return { idx, grade: c.grade };
      }
      return null;
    }).filter(Boolean);

    const hypotheticalCourses = semesterCourses.filter(c => c._isHypothetical);

    chrome.storage.local.set({
      "nsu-cgpa-edits": {
        courseEdits,
        hypotheticalCourses,
        timestamp: new Date().toISOString(),
      }
    });
    console.log("Edits saved to storage");
  }

  function loadEditsFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["nsu-cgpa-edits"], (result) => {
        if (result["nsu-cgpa-edits"]) {
          const { courseEdits, hypotheticalCourses } = result["nsu-cgpa-edits"];

          // Restore grade edits for original courses
          if (courseEdits && Array.isArray(courseEdits)) {
            courseEdits.forEach(({ idx, grade }) => {
              if (idx >= 0 && idx < semesterCourses.length) {
                semesterCourses[idx].grade = grade;
              }
            });
          }

          // Restore hypothetical courses
          if (hypotheticalCourses && Array.isArray(hypotheticalCourses)) {
            hypotheticalCourses.forEach(hyp => {
              semesterCourses.push(hyp);
            });
          }

          console.log("Edits loaded from storage");
        }
        resolve();
      });
    });
  }

  function clearEditsFromStorage() {
    chrome.storage.local.remove(["nsu-cgpa-edits"], () => {
      console.log("Edits cleared from storage");
    });
  }

  // Add course modal HTML to the page
  function createAddCourseModal() {
    const modalContainer = document.createElement("div");
    modalContainer.id = "add-course-modal";
    modalContainer.style.display = "none";
    modalContainer.style.position = "fixed";
    modalContainer.style.zIndex = "10000";
    modalContainer.style.left = "0";
    modalContainer.style.top = "0";
    modalContainer.style.width = "100%";
    modalContainer.style.height = "100%";
    modalContainer.style.backgroundColor = "rgba(0,0,0,0.5)";
    modalContainer.style.alignItems = "center";
    modalContainer.style.justifyContent = "center";

    modalContainer.innerHTML = `
      <div class="panel panel-primary" style="width: 400px; margin: 100px auto;">
        <div class="panel-heading">
          <h3 class="panel-title">Add New Course</h3>
        </div>
        <div class="panel-body">
          <form id="add-course-form">
            <div class="form-group">
              <label for="new-course-code">Course Code*</label>
              <input type="text" class="form-control" id="new-course-code" placeholder="e.g. CSE115" required>
            </div>
            <div class="form-group">
              <label for="new-course-credits">Credits*</label>
              <input type="number" class="form-control" id="new-course-credits" min="0" max="5" step="0.5" value="3" required>
            </div>
            <div class="form-group">
              <label for="new-course-grade">Grade*</label>
              <select class="form-control" id="new-course-grade" required>
                <option value="">Select Grade</option>
                ${Object.keys(gradeMap)
                  .map((g) => `<option value="${g}">${g}</option>`)
                  .join("")}
              </select>
            </div>
            <div class="alert alert-danger" id="course-validation-error" style="display: none;">
              Please fill in all required fields.
            </div>
            <div class="text-right">
              <button type="button" class="btn btn-danger" id="cancel-add-course">Cancel</button>
              <button type="submit" class="btn btn-primary" id="confirm-add-course">Add Course</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);

    // Add event listeners for the modal
    document
      .getElementById("cancel-add-course")
      .addEventListener("click", () => {
        document.getElementById("add-course-modal").style.display = "none";
      });

    document
      .getElementById("add-course-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();

        const codeInput = document.getElementById("new-course-code");
        const creditsInput = document.getElementById("new-course-credits");
        const gradeInput = document.getElementById("new-course-grade");

        // Validate inputs
        if (
          !codeInput.value ||
          !creditsInput.value ||
          !gradeInput.value
        ) {
          document.getElementById("course-validation-error").style.display =
            "block";
          return;
        }

        // Validate course code format: only Latin letters and digits
        const courseCodeRegex = /^[A-Za-z0-9]+$/;
        if (!courseCodeRegex.test(codeInput.value)) {
          document.getElementById("course-validation-error").textContent =
            "Course code should only contain Latin letters and digits.";
          document.getElementById("course-validation-error").style.display =
            "block";
          return;
        }

        // Convert course code to uppercase for Latin letters
        const formattedCourseCode = codeInput.value.toUpperCase();

        // Add the new course
        semesterCourses.push({
          code: formattedCourseCode,
          title: formattedCourseCode,
          credits: parseFloat(creditsInput.value),
          grade: gradeInput.value,
          _isHypothetical: true,
        });

        // Hide modal and update view
        document.getElementById("add-course-modal").style.display = "none";
        renderInputs(semesterCourses);
        renderHypotheticalRowsInMainTable();
        update(); // Reset form for next use
        codeInput.value = "";
        creditsInput.value = "3";
        gradeInput.value = "";
        document.getElementById("course-validation-error").textContent =
          "Please fill in all required fields.";
        document.getElementById("course-validation-error").style.display =
          "none";
      });
  }

  // Create the modal on page load
  createAddCourseModal();

  // Note: setupInlineGradeEditing is called after loading saved edits

  // ——— C.4 Handle updates & storage ———
  function formatChangeBadge(newValue, delta, label) {
    const d = Number(delta);
    const nv = Number(newValue);
    if (!isFinite(d) || !isFinite(nv)) return "";
    const cls = d > 0 ? "pos" : d < 0 ? "neg" : "zero";
    const sign = d > 0 ? "+" : "";
    return `<span class="nsurb-sem-delta ${cls}">${label} → ${nv.toFixed(
      2
    )} (${sign}${d.toFixed(2)})</span>`;
  }

  function getSemesterMapsForDeltas(courses) {
    // Ignore hypothetical courses (no semester/year) for per-semester deltas
    const filtered = courses.filter((c) => c.semester && c.year);
    const data = calculateSemesterCGPA(filtered);
    const map = {};
    data.semesters.forEach((k, i) => {
      map[k] = {
        tgpa: Number(data.semesterGPAs[i]),
        cgpa: Number(data.cgpaValues[i]),
      };
    });
    return map;
  }

  function applyPerSemesterDeltaBadges() {
    if (!NSURB_INLINE_EDIT_MAIN_TABLE) return;
    if (!semesterTable) return;

    const originalMap = getSemesterMapsForDeltas(originalCourses);
    const whatIfMap = getSemesterMapsForDeltas(semesterCourses);

    const tbodyRows = Array.from(semesterTable.querySelectorAll("tbody tr"));
    let currentKey = "";

    tbodyRows.forEach((row) => {
      if (row.classList.contains("divider-td")) return;
      if (row.classList.contains("nsurb-hyp-row")) return;
      if (row.classList.contains("nsurb-hyp-summary")) return;

      // Track current semester key from the course rows
      if (!row.classList.contains("summary-row")) {
        const tds = row.querySelectorAll("td");
        if (tds.length >= 2) {
          const sem = (tds[0].textContent || "").trim();
          const yr = (tds[1].textContent || "").trim();
          if (sem && yr) currentKey = `${sem} ${yr}`;
        }
        return;
      }

      // Summary row: append TGPA/CGPA delta badges
      // First remove any existing badges to avoid duplicates
      row.querySelectorAll(".nsurb-sem-delta").forEach((n) => n.remove());

      const base = originalMap[currentKey];
      const now = whatIfMap[currentKey];
      if (!base || !now) return;

      const dT = now.tgpa - base.tgpa;
      const dC = now.cgpa - base.cgpa;

      // If nothing changed, keep clean
      const hasChange = Math.abs(dT) >= 0.01 || Math.abs(dC) >= 0.01;
      if (!hasChange) return;

      // Find the cells that contain TGPA / CGPA text
      const cells = Array.from(row.querySelectorAll("td"));
      const tgpaCell = cells.find((td) =>
        (td.textContent || "").toUpperCase().includes("TGPA")
      );
      const cgpaCell = cells.find((td) =>
        (td.textContent || "").toUpperCase().includes("CGPA")
      );

      if (tgpaCell) {
        tgpaCell.insertAdjacentHTML(
          "beforeend",
          ` ${formatChangeBadge(now.tgpa, dT, "TGPA")}`
        );
      }
      if (cgpaCell) {
        cgpaCell.insertAdjacentHTML(
          "beforeend",
          ` ${formatChangeBadge(now.cgpa, dC, "CGPA")}`
        );
      }
    });
  }

  function updateCreditSummaryCGPA(whatIfCGPA) {
    const row = getCreditSummaryRow();
    if (!row) return;

    const tds = row.querySelectorAll("td");
    if (tds.length < 3) return;

    const cgpaCell = tds[2];

    // Cache original displayed CGPA once
    if (!cgpaCell.dataset.nsurbOriginalCgpa) {
      const base = parseFloat((cgpaCell.textContent || "").trim());
      if (isFinite(base)) cgpaCell.dataset.nsurbOriginalCgpa = base.toFixed(2);
    }

    const baseStr = cgpaCell.dataset.nsurbOriginalCgpa;
    const base = parseFloat(baseStr);
    if (!isFinite(base)) return;

    const delta = Number(whatIfCGPA) - base;
    const hasChange = Math.abs(delta) >= 0.01;

    // Reset any previous badge
    cgpaCell.querySelectorAll(".nsurb-sem-delta").forEach((n) => n.remove());

    // Always show original number; append what-if only when changed
    cgpaCell.textContent = base.toFixed(2);

    if (!hasChange) return;

    cgpaCell.insertAdjacentHTML(
      "beforeend",
      ` ${formatChangeBadge(Number(whatIfCGPA), delta, "CGPA")}`
    );
  }

  function updateCreditSummaryTotalCredits() {
    const row = getCreditSummaryRow();
    if (!row) return;
    const tds = row.querySelectorAll("td");
    if (tds.length < 2) return;

    const creditCell = tds[1];

    // Cache original completed credits once
    if (!creditCell.dataset.nsurbOriginalCompletedCredits) {
      const base = parseFloat((creditCell.textContent || "").trim());
      if (isFinite(base)) {
        creditCell.dataset.nsurbOriginalCompletedCredits = base.toFixed(2);
      }
    }

    const baseStr = creditCell.dataset.nsurbOriginalCompletedCredits;
    const base = parseFloat(baseStr);
    if (!isFinite(base)) return;

    // Add credits from hypothetical courses that have a countable grade (not W/I) and credits > 0
    const addedCredits = semesterCourses
      .filter((c) => c._isHypothetical)
      .filter(
        (c) =>
          isValidCourseCode(c.code) &&
          c.grade &&
          gradeMap[c.grade] !== undefined &&
          gradeMap[c.grade] !== null &&
          (Number(c.credits) || 0) > 0
      )
      .reduce((s, c) => s + (Number(c.credits) || 0), 0);

    const total = base + addedCredits;
    const delta = total - base;

    // Reset any previous badge
    creditCell.querySelectorAll(".nsurb-sem-delta").forEach((n) => n.remove());
    creditCell.textContent = base.toFixed(2);

    if (Math.abs(delta) < 0.01) return;

    creditCell.insertAdjacentHTML(
      "beforeend",
      ` ${formatChangeBadge(total, delta, "Credits")}`
    );
  }

  function update() {
    // gather form state
    const selects = Array.from(
      document.querySelectorAll("#course-inputs .grade-select")
    );
    const credits = Array.from(
      document.querySelectorAll("#course-inputs .credit-input")
    );

    // Update the semesterCourses array with current values from the form
    selects.forEach((select, i) => {
      const idx = parseInt(select.dataset.idx);
      const courseCode = select.dataset.code;
      if (idx >= 0 && idx < semesterCourses.length) {
        // Update the grade in the semesterCourses array
        semesterCourses[idx].grade = select.value;

        // Check if this is an original course with changed grade
        const originalCourse = originalCourses.find(
          (oc) => oc.code === courseCode
        );
        const isOriginalCourse = !!originalCourse;
        const isGradeChanged =
          isOriginalCourse && originalCourse.grade !== select.value;

        // Get the row containing this select
        const row = select.closest("tr");

        // Apply or remove highlighting based on whether grade has changed
        if (isGradeChanged) {
          row.style.backgroundColor = "#fff3cd";
          row.style.borderLeft = "3px solid #ffc107";
          select.style.backgroundColor = "#fff3cd";
          select.style.fontWeight = "bold";

          // Check if reset button exists
          const actionsCell = row.querySelector("td:last-child .btn-group");
          let resetButton = actionsCell.querySelector(".reset-grade");

          // If the button doesn't exist, create it
          if (!resetButton) {
            resetButton = document.createElement("button");
            resetButton.className = "reset-grade btn btn-warning btn-sm";
            resetButton.dataset.idx = idx;
            resetButton.dataset.originalGrade = originalCourse.grade;
            resetButton.title = "Reset to original grade";
            resetButton.innerHTML =
              '<span class="glyphicon glyphicon-refresh"></span>';

            // Insert as the first child in the btn-group
            actionsCell.insertBefore(resetButton, actionsCell.firstChild);
          }
        } else if (isOriginalCourse) {
          // Remove highlighting if grade is same as original
          row.style.backgroundColor = "";
          row.style.borderLeft = "";
          select.style.backgroundColor = "";
          select.style.fontWeight = "";

          // Remove the reset button if it exists
          const resetButton = row.querySelector(".reset-grade");
          if (resetButton) {
            resetButton.remove();
          }
        }
      }
    });

    // Update credit values for new courses (original courses have disabled inputs)
    credits.forEach((input, i) => {
      if (!input.disabled) {
        const idx = parseInt(input.dataset.idx);
        if (idx >= 0 && idx < semesterCourses.length) {
          semesterCourses[idx].credits = parseFloat(input.value) || 0;
        }
      }
    });

    // Get current values for CGPA calculation
    const current = semesterCourses.map((c) => ({
      credits: c.credits || 0,
      grade: c.grade,
      code: c.code,
      title: c.title,
    }));

    // compute & display
    const currentCGPA = parseFloat(currentCGPAValue);
    const whatIfCGPA = parseFloat(calcWhatIfCgpa(current));
    const resultElement = document.getElementById("whatif-result");

    // Color coding based on improvement or decline with delta badge
    if (whatIfCGPA > currentCGPA) {
      // Green for improvement
      const delta = (whatIfCGPA - currentCGPA).toFixed(2);
      resultElement.style.color = "#28a745";
      resultElement.innerHTML = `${whatIfCGPA.toFixed(
        2
      )} <span class="badge" style="background-color: #28a745; margin-left: 5px;">+${delta}</span>`;
    } else if (whatIfCGPA < currentCGPA) {
      // Red for decline
      const delta = (whatIfCGPA - currentCGPA).toFixed(2);
      resultElement.style.color = "#dc3545";
      resultElement.innerHTML = `${whatIfCGPA.toFixed(
        2
      )} <span class="badge" style="background-color: #dc3545; margin-left: 5px;">${delta}</span>`;
    } else {
      // Original blue for no change
      resultElement.style.color = "#4285f4";
      resultElement.innerHTML = whatIfCGPA.toFixed(2);
    }

    console.log(
      "Updated CGPA calculation: Current=" +
        currentCGPA +
        ", What-If=" +
        whatIfCGPA
    );

    // Inline mode: show per-semester TGPA/CGPA deltas at the end of each semester
    applyPerSemesterDeltaBadges();

    // Update the top "Student Name / Credit Completed / CGPA" table too
    updateCreditSummaryCGPA(whatIfCGPA);
    updateCreditSummaryTotalCredits();

    // Re-render hypothetical blocks so TGPA/CGPA rows update live
    if (NSURB_INLINE_EDIT_MAIN_TABLE) {
      const hasHyp =
        nsurbHypSemesters.length > 0 ||
        semesterCourses.some((c) => c && c._isHypothetical);
      if (hasHyp) {
        const active = document.activeElement;
        const typingInHyp =
          active &&
          (active.classList?.contains("nsurb-hyp-code") ||
            active.classList?.contains("nsurb-hyp-credits"));
        if (!nsurbSkipHypRender && !typingInHyp) {
          renderHypotheticalRowsInMainTable();
          bindHypControlsIfNeeded();
        }
      }
    }

    // Save edits to storage
    saveEditsToStorage();
  }

  // (removed) CGPA chart feature + Chart.js dependency
})();
