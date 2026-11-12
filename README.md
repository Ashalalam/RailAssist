# 🚆 RailAssist
### Enterprise Duty Logging & Allowance Automation Platform for Indian Railways

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/API-Express-000000?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)](https://www.mongodb.com/)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)](https://ai.google.dev/)

## 1. Project Overview

RailAssist is an enterprise-oriented duty logging and allowance automation platform designed to simplify railway employees' daily operational record management and financial documentation.

Railway employees such as Travelling Ticket Examiners (TTEs), Ticket Collectors (TCs), Guards, Loco Pilots, Assistant Loco Pilots, Station Masters and other railway staff regularly maintain duty records, calculate allowances, track journeys, manage rosters and prepare monthly statements.

Traditional manual processes can involve repetitive paperwork, calculation errors, fragmented records and time-consuming report preparation.

RailAssist addresses these challenges through a unified digital platform that combines duty management, automated allowance calculations, AI-powered document processing, financial reporting and offline-first capabilities.

The platform aims to reduce manual effort, improve record accuracy and provide railway employees with a centralized system for managing their professional duty information.

## 2. Problem Statement

Railway employees encounter several challenges while managing duty-related information:

- Manual maintenance of duty diaries and journey records.
- Time-consuming calculation of TA and NDA allowances.
- Difficulty tracking Mileage Reports (MR) and remittance details.
- Repetitive preparation of monthly allowance statements.
- Manual extraction of information from duty slips.
- Difficulty accessing records during poor network connectivity.
- Fragmented management of train, station and roster information.
- Risk of calculation mistakes and inconsistent records.

Traditional record-keeping approaches do not always provide a unified, automated and easily accessible solution.

Therefore, there is a need for a centralized digital platform that supports duty logging, allowance automation, AI-assisted data entry, financial reporting and reliable offline access.

## 3. Project Objectives

The primary objective of RailAssist is to develop an integrated platform for railway duty management and allowance automation.

The specific objectives are:

1. Digitize railway employee duty and journey records.
2. Automate applicable TA and NDA allowance calculations.
3. Provide structured Mileage Report management.
4. Introduce AI-powered duty slip scanning and information extraction.
5. Support voice-assisted duty logging.
6. Provide duty roster management and scheduling.
7. Maintain searchable train and station directories.
8. Generate monthly financial statements and reports.
9. Support PDF, Excel and CSV report exports where implemented.
10. Provide offline-first access and data synchronization.
11. Offer an AI-powered assistant for railway-related guidance.
12. Improve record accessibility, consistency and operational efficiency.

## 4. System Features

### 4.1 Staff Profile Management

RailAssist provides employee profile management with railway-related professional information.

Profile information includes:

- Employee name and email.
- Railway designation.
- Railway zone and division.
- Branch or department.
- Cadre or squad.
- Headquarters station code.
- Employee level and basic pay.
- Pay scale and grade pay.
- Bill unit.
- Date of appointment.
- Assigned or preferred stations.
- Relevant locomotive or equipment model information, where applicable.

The profile provides the employee information used across the platform.

### 4.2 Duty Logging and Journey Management

The Duty Logs module allows railway employees to maintain structured records of their duty activities.

Key information includes:

- Train number and train name.
- Origin and destination stations.
- Scheduled departure and arrival.
- Actual departure and arrival.
- Duty date.
- Journey distance.
- Duty category.
- Delay information.
- Claim eligibility.
- NDA eligibility.
- Remarks and additional details.

Supported duty categories include:

- Ticket Checking
- On Duty
- Station Duty
- PF Check
- Others

The module provides facilities for creating, editing, searching and filtering duty records.

### 4.3 Mileage Report (MR) Management

The MR module supports recording and tracking mileage-related financial information.

Key fields include:

- MR number.
- MR amount.
- Remitted-at station.
- MR claim pending status.

MR information is associated with relevant duty records to support financial tracking and reporting.

### 4.4 Automated Allowance Calculation

RailAssist includes an allowance calculation module intended to reduce manual calculation effort.

The system supports:

- Travelling Allowance (TA).
- Night Duty Allowance (NDA).
- Claim eligibility information.
- Applicable allowance rules.
- Duty-related financial summaries.

Calculations depend on the applicable employee information, duty details and configured allowance rules.

Official railway rules and applicable rates must be maintained and verified before production use.

### 4.5 Duty Roster Management

The Roster module helps railway employees organize their upcoming duty schedules.

It supports:

- Duty date management.
- Train and station information.
- Reporting time.
- Expected departure and arrival.
- Duty category.
- Remarks.
- Roster viewing and management.
- Conversion of roster entries into duty records, where supported.

### 4.6 AI-Powered Duty Slip Scanner

RailAssist integrates AI-assisted document processing to reduce manual duty entry.

The duty slip scanning workflow is designed to:

1. Accept an uploaded duty slip.
2. Process the document using OCR and AI assistance.
3. Extract relevant duty information.
4. Display extracted fields for review.
5. Allow the employee to verify and correct information.
6. Support confirmation before saving the duty record.

The employee should verify extracted information before it is treated as an official record.

### 4.7 AI Voice Duty Logging

The voice-assisted duty logging feature aims to simplify data entry through spoken instructions.

The workflow includes:

- Capturing voice input.
- Processing speech into text.
- Identifying relevant duty information.
- Extracting structured journey details.
- Allowing the employee to review the generated information.

This feature is intended to make duty entry more convenient, particularly when manual typing is difficult.

### 4.8 Train Directory

The Train Directory provides searchable train information.

It supports:

- Train number and name.
- Origin and destination stations.
- Journey distance.
- Train information lookup.
- Integration with duty entry workflows.

### 4.9 Station Directory

The Station Directory provides searchable railway station information.

Its intended capabilities include:

- Station name lookup.
- Station code lookup.
- Station autocomplete.
- Station selection in duty forms.
- Integration with roster and profile workflows.
- Administrative station management where authorized.

### 4.10 Monthly Statements and Financial Reporting

The financial reporting module helps employees organize and review their duty-related financial information.

Reporting capabilities include:

- Monthly duty summaries.
- TA summaries.
- NDA summaries.
- MR summaries.
- Combined statements.
- Date-range filtering.
- Financial reconciliation.
- Report history.
- Excel export.
- PDF and print-oriented reporting.
- CSV export where supported.

### 4.11 AI Copilot and Knowledge Assistance

RailAssist includes an AI-assisted support interface intended to help users understand platform features and railway-related information.

The AI assistant is designed to support:

- Natural-language questions.
- Railway-related knowledge assistance.
- Feature guidance.
- Contextual information retrieval.
- Document and knowledge-based responses.

AI-generated information should be verified against applicable official railway instructions and circulars.

### 4.12 Offline-First Functionality

RailAssist is designed to support access in environments with unreliable internet connectivity.

The offline-first architecture uses:

- IndexedDB for local application data.
- Service Workers for application caching.
- Local data persistence.
- Queued synchronization workflows.
- Backend synchronization when connectivity becomes available.

Offline records must be handled carefully to prevent duplicate entries, synchronization conflicts and accidental data loss.

### 4.13 Help and Support

The Help and Support module provides guidance for users through:

- Getting Started documentation.
- Feature guides.
- Frequently Asked Questions.
- Support contact information.

**Support Contacts**

- WhatsApp: +91 8639271771
- Email: lalamashag31fsd@gmail.com

## 5. Technology Stack

RailAssist uses a modern web application architecture.

### Frontend

- React – Component-based user interface.
- Vite – Frontend development and build tooling.
- Tailwind CSS – Styling and responsive layouts.
- Lucide Icons – Interface icons.
- Recharts – Data visualization.
- IndexedDB – Local structured data storage.
- Service Workers – Offline application support.

### Backend

- Node.js – Server-side JavaScript runtime.
- Express.js – REST API development.
- Mongoose – MongoDB object modeling.
- JWT – Authentication and authorization.
- bcrypt – Password hashing.
- Multer – File upload handling.

### Database

- MongoDB – Persistent application data.
- IndexedDB – Browser-side offline data storage.

### Artificial Intelligence

- Google Gemini API – AI-assisted processing and language understanding.
- OCR and document extraction workflows – Duty slip information processing.
- Speech recognition and AI-assisted parsing – Voice duty logging.

### Development Tools

- Visual Studio Code.
- Git and GitHub.
- Postman.
- MongoDB tools.
- npm.

## 6. System Architecture

RailAssist follows a modular client-server architecture.

### Module 1: Frontend Application

Responsible for:

- User authentication interfaces.
- Staff profile management.
- Duty logging.
- Roster management.
- Train and station directories.
- Financial dashboards.
- Reports and statements.
- AI assistant interface.
- Offline user interactions.

### Module 2: Backend REST API

Responsible for:

- Authentication and authorization.
- Employee profile management.
- Duty record operations.
- Allowance-related processing.
- Roster management.
- Train and station APIs.
- Financial reporting.
- File upload handling.
- Data validation and business logic.

### Module 3: Database Layer

MongoDB stores persistent application information, including:

- Users.
- Journeys.
- Trains.
- Stations.
- Divisions.
- Allowance rules.
- Rosters.
- Report history.
- Audit information.
- Other application records.

### Module 4: Offline Data Layer

IndexedDB supports local data storage and offline workflows.

The synchronization layer coordinates local changes with the backend when connectivity is available.

### Module 5: AI Processing Layer

The AI processing layer supports:

- Duty slip extraction.
- Voice-based duty information parsing.
- Natural-language assistance.
- Knowledge-based responses.

## 7. Working Methodology

The RailAssist workflow can be understood through the following stages:

**Stage 1: User Authentication**

The employee signs in to access the application.

**Stage 2: Staff Profile Setup**

The employee provides the relevant railway and professional information.

**Stage 3: Duty Information Entry**

The employee creates duty records manually or uses supported AI-assisted input methods.

**Stage 4: Information Validation**

Duty information is reviewed and validated before saving.

**Stage 5: Allowance Processing**

The system processes applicable allowance information using configured rules.

**Stage 6: MR Management**

Mileage Report information is associated with relevant duty records.

**Stage 7: Roster Management**

Employees organize and review upcoming duty schedules.

**Stage 8: Data Persistence**

Application data is stored locally and/or in the backend according to the supported workflow.

**Stage 9: Synchronization**

Offline changes are synchronized when network connectivity is available.

**Stage 10: Financial Reporting**

The system organizes duty and allowance information into monthly statements and reports.

**Stage 11: AI Assistance**

Employees can use available AI features for document processing, voice-assisted entry and information assistance.

## 8. Data Management and Security

RailAssist is designed with data protection and controlled access as important considerations.

Security-related capabilities include:

- Authentication-based application access.
- Password hashing.
- Protected API endpoints.
- Role-based access where configured.
- Input validation.
- Controlled file uploads.
- Audit logging.
- Local and backend data management.
- Protected account-management operations.

Database backup, recovery, access control and synchronization policies should be verified before production deployment.

## 9. Application Interface

RailAssist provides a centralized interface for railway duty management.

Major application areas include:

- Home Dashboard.
- Staff Profile Management.
- Duty Logs.
- Duty Roster.
- Allowances.
- Train Directory.
- Station Directory.
- Financial Reports.
- Monthly Statements.
- AI Assistant.
- Help and Support.

The interface uses a Sky Blue and White visual theme to provide a clean and readable application experience.

## 10. Installation and Execution

### System Requirements

- Windows, Linux or macOS.
- Node.js 18+ and npm.
- MongoDB 6+.
- Git.
- Modern web browser (Chrome, Firefox, Edge, Safari).
- Internet connectivity for backend services and AI integrations.

### Step 1: Clone the Repository

```bash
git clone https://github.com/Ashalalam/RailAssist.git
cd RailAssist
```

### Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 3: Configure Environment Variables

Create `server/.env` file with the following configuration:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/railassist
JWT_SECRET=your_secure_jwt_secret_key
GEMINI_API_KEY=your_google_gemini_api_key
```

**Important:** Never commit real API keys or credentials to GitHub. Use the `.env.example` file as a template.

### Step 4: Seed the Database (Optional)

To populate initial railway data:

```bash
cd server
npm run seed
```

### Step 5: Start the Backend

```bash
cd server
npm start
```

The backend will run on `http://localhost:5000`.

### Step 6: Install Frontend Dependencies

Open another terminal:

```bash
cd client
npm install
```

### Step 7: Start the Frontend

```bash
cd client
npm run dev
```

The frontend will run on `http://localhost:5173`.

### Step 8: Access the Application

Open your browser and navigate to `http://localhost:5173`.

### Default Credentials

After seeding, you can log in with:

- **Email:** staff@railassist.com
- **Password:** Password123

or

- **Email:** admin@railassist.com
- **Password:** Password123

## 11. Demonstration Workflow

A typical RailAssist demonstration can follow these steps:

1. Open the RailAssist application.
2. Sign in using an authorized account.
3. Navigate to Staff Profile Management.
4. Review employee information.
5. Open Duty Logs.
6. Create or review a duty record.
7. Enter train and station information.
8. Review TA and NDA-related information.
9. Record MR details where applicable.
10. Open Duty Roster and review scheduled duties.
11. Explore Train and Station Directories.
12. Demonstrate AI-assisted duty slip processing.
13. Demonstrate voice-assisted duty logging.
14. Open Financial Reports.
15. Generate a monthly statement.
16. Review available export and print options.
17. Demonstrate offline capabilities where supported.

## 12. Testing and Quality Assurance

RailAssist requires functional, integration, security and usability testing.

Important testing areas include:

- Authentication and account management.
- Profile creation and updates.
- Duty record creation and editing.
- MR information persistence.
- TA and NDA calculations.
- Duty roster operations.
- Train and station lookup.
- AI extraction accuracy.
- Voice input processing.
- Financial statement generation.
- Export and print functionality.
- Offline data persistence.
- Synchronization and conflict handling.
- Role-based access and API security.

Testing should use an isolated test database and test accounts. Existing operational data must not be used for destructive test operations.

## 13. Limitations and Considerations

The following considerations apply to the platform:

1. **Railway Rule Accuracy:** Allowance calculations depend on the correctness and currency of configured railway rules.
2. **AI Extraction:** OCR and AI-generated information may contain errors and requires employee verification.
3. **Network Connectivity:** Certain backend and AI services require internet access.
4. **Offline Synchronization:** Offline changes require reliable conflict handling and synchronization validation.
5. **Data Quality:** Financial reports depend on accurate duty records and employee information.
6. **External AI Dependency:** AI-assisted features depend on the availability and configuration of the selected AI provider.
7. **Production Readiness:** Authentication, security, backup, recovery and railway-rule compliance must be thoroughly validated before production deployment.

## 14. Future Enhancements

Potential future improvements include:

- Advanced AI-assisted railway document understanding.
- Improved voice-based duty entry.
- Enhanced offline synchronization and conflict resolution.
- Advanced financial analytics.
- Additional railway circular and rule integrations.
- Improved mobile application experience.
- Automated notifications and reminders.
- Enhanced administrative dashboards.
- Advanced audit and reconciliation tools.
- Integration with authorized railway information systems.

## 15. Project Vision

RailAssist aims to provide railway employees with a unified digital workspace for managing duty records, allowances, rosters and financial documentation.

By combining automation, AI-assisted workflows, structured record management and offline-first technology, the platform seeks to reduce repetitive administrative work and improve the accessibility of duty-related information.

## 16. Conclusion

RailAssist demonstrates how modern web technologies, AI-assisted processing and offline-first application design can be combined to simplify railway duty management.

The platform brings together employee profiles, duty logging, allowance processing, Mileage Report management, roster scheduling, financial reporting and intelligent assistance in a single application.

Its goal is to support a more organized, efficient and accessible approach to railway employee duty and allowance management.

---

## Support and Contact

**Project:** RailAssist  
**WhatsApp:** +91 8639271771  
**Email:** lalamashag31fsd@gmail.com

---

## License

This project is proprietary software. All rights reserved.

---

*RailAssist — Simplifying Railway Duty Management Through Technology.*
