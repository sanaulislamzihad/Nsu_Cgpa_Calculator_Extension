# NSU CGPA Calculator Extension (What‑If)

A lightweight **Chrome / Microsoft Edge extension** for **North South University (NSU) RDS** that adds a **what‑if CGPA calculator** directly on the **Grade History** page.

- Works on: `https://rds3.northsouth.edu/students/grade_history*`
- Manifest: **MV3**
- Version: **0.1.2**

---

### Features

- **Edit grades inline** on the original RDS “Regular Courses” table
- **Instant TGPA/CGPA updates** (and per‑semester delta badges)
- **Add hypothetical semesters** (Spring/Summer/Fall/Intersession)
- **Add hypothetical courses** inside those semesters (credits + grade)
- **Retake handling**: CGPA uses the **best grade per course code**
- **Runs locally** (no external servers)

---

### Screenshots

![Screenshot 1](images/Screenshot%202025-12-30%20221725.png)
![Screenshot 2](images/Screenshot%202025-12-30%20222123.png)

---

### Installation (Chrome / Edge)

- **Download** this repository (or clone it).
- Open Extensions page:
  - **Chrome**: `chrome://extensions`
  - **Edge**: `edge://extensions`
- Turn on **Developer mode**
- Click **Load unpacked**
- Select the project folder: `Nsu_Cgpa_Calculator_Extension`
- Open the NSU RDS grade history page:
  - `https://rds3.northsouth.edu/students/grade_history`

---

### How to use

- Go to the **grade history** page.
- In each semester’s table, use the **Course Grade** dropdown to change grades.
- To plan future results:
  - Click **Add New Semester**
  - Then click **Add New Course** inside that semester
  - Fill **course code**, **credits**, and **grade**
- The page will show updated:
  - **CGPA**
  - **TGPA**
  - **Credit Completed** (includes hypothetical graded credits)

---

### Permissions & Privacy

- **Host permissions**: only the grade history page  
  `https://rds3.northsouth.edu/students/grade_history*`
- **Privacy**: this extension **runs locally in your browser** and **does not send** your grade data to any external server.

---

### Project files

- `manifest.json`: extension metadata + page match rules
- `content-script.js`: injects UI + performs calculations on the grade history page
- `popup.html` / `popup.js`: extension popup (quick guide + developer link)
- `styles/style.css`: popup styles

---

### Developer

- **Md Sanaul Islam Zihad**: `https://github.com/sanaulislamzihad`


