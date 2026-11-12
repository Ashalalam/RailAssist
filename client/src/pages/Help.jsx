import { useState } from 'react';
import { 
  Search, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  ChevronDown, 
  ChevronRight,
  Info,
  Shield,
  Rocket,
  FileText,
  Camera,
  Mic,
  Calendar,
  BarChart3,
  Train,
  IndianRupee,
  Settings,
  AlertCircle
} from 'lucide-react';

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [expandedFAQs, setExpandedFAQs] = useState(new Set());

  const toggleFAQ = (id) => {
    const newExpanded = new Set(expandedFAQs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFAQs(newExpanded);
  };

  // Help content categories
  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: Rocket },
    { id: 'features', name: 'Feature Guides', icon: BookOpen },
    { id: 'faqs', name: 'FAQs', icon: MessageCircle },
    { id: 'support', name: 'Contact Support', icon: Mail },
    { id: 'about', name: 'About & Disclaimer', icon: Info }
  ];

  // Getting Started articles
  const gettingStarted = [
    {
      id: 'gs-1',
      title: 'Account Registration and Login',
      icon: Shield,
      content: `
**Creating Your Account:**
1. Click "Sign Up" on the login page
2. Fill in your details:
   - Full Name
   - Email Address
   - Phone Number
   - Employee ID
   - Password (minimum 6 characters)
   - Select your Railway Division
   - Choose your Role (TTE, TC, Guard, Loco Pilot, etc.)
3. Click "Create Account"
4. You'll be automatically logged in

**Logging In:**
1. Enter your email and password
2. Click "Login"
3. Your session is saved securely with JWT authentication
4. You'll stay logged in until you explicitly logout

**Password Recovery:**
1. Click "Forgot Password?" on login page
2. Enter your registered email
3. Check your email for reset instructions
4. Follow the link to create a new password
      `
    },
    {
      id: 'gs-2',
      title: 'Completing Your Staff Profile',
      icon: FileText,
      content: `
**Profile Information:**
Your profile contains essential information for allowance calculations and statement generation.

**To Update Your Profile:**
1. Click your name in the sidebar
2. Or navigate to Settings → Profile
3. Update fields:
   - Name
   - Phone
   - Employee ID
   - Division
   - Role/Designation

**Important Notes:**
- Your employee ID and division are used in monthly statements
- Role determines duty-specific workflows
- Profile information appears on generated TA/NDA statements
- Changes are saved immediately when you click "Update Profile"
      `
    },
    {
      id: 'gs-3',
      title: 'Creating Duty Logs',
      icon: FileText,
      content: `
**Three Ways to Create Duty Logs:**

**1. Manual Entry:**
- Navigate to Duty Logs → "Log New Shift Duty"
- Fill in train details, stations, times, distance
- Add MR details if applicable
- Select duty category and claim status
- Click "Save Duty Log"

**2. AI Duty Slip Scanner (OCR):**
- Click "Snap / Upload Slip" on journey form
- Take photo or upload image of duty slip
- AI extracts train number, stations, times automatically
- Review extracted fields (confidence scores shown)
- Edit any incorrect fields
- Save

**3. Voice Duty Logging:**
- Click "Log Duty by Voice" button
- Speak naturally: "I worked train 12951 from Mumbai Central to New Delhi on November 10"
- AI extracts all journey details
- Review extracted fields
- Click "Apply to Form"
- Save

**Required Fields:**
- Train Number & Name
- From/To Stations
- Scheduled & Actual Departure/Arrival times
- Distance in kilometers
      `
    },
    {
      id: 'gs-4',
      title: 'Using the Duty Roster',
      icon: Calendar,
      content: `
**Duty Roster Management:**

**Viewing Your Roster:**
1. Navigate to "Duty Roster" in sidebar
2. Select month and year
3. View all scheduled duties in calendar grid

**Creating Roster Entries:**
1. Click "Add Roster Entry"
2. Fill in:
   - Date
   - Train Number/Name
   - From/To stations
   - Scheduled times
   - Duty type
3. Save roster entry

**Convert Roster to Duty Log:**
- Click "Convert to Log" on any roster entry
- System creates actual duty entry
- Fill in actual times and MR details
- Save as completed duty

**Monthly Planning:**
- Use roster for advance duty planning
- Track scheduled vs actual performance
- Identify gaps in duty coverage
      `
    },
    {
      id: 'gs-5',
      title: 'Understanding TA and NDA Statements',
      icon: IndianRupee,
      content: `
**TA (Travelling Allowance):**
- Calculated based on distance and hours away from headquarters
- Default rate: ₹800 per day (configurable)
- Automatically calculated from journey times
- Shown in monthly statements

**NDA (Night Duty Allowance):**
- Paid for work between 10 PM and 6 AM
- Default rate: ₹180 per hour (configurable)
- Automatically calculated from duty hours
- Only eligible duties included

**Generating Statements:**
1. Navigate to "Monthly Statements"
2. Select month
3. Choose statement type (TA, NDA, Diary, MR)
4. Select or create statement template
5. Click "Print / Save as PDF"

**Template Customization:**
- Navigate to "Statement Templates"
- Create templates with custom columns
- Set default templates per statement type
- Customize headers, footers, page layout
      `
    }
  ];

  // Feature guides
  const featureGuides = [
    {
      id: 'feat-1',
      title: 'Staff Profile Management',
      icon: Shield,
      content: `
**Profile Fields:**
- Name, Email, Phone
- Employee ID
- Division & Zone
- Role/Designation
- Subscription Tier

**Updating Profile:**
Settings → Profile → Edit fields → Save

**Profile in Statements:**
Your profile information automatically appears in:
- Monthly TA statements
- NDA statements
- Duty diary reports
- All exported documents
      `
    },
    {
      id: 'feat-2',
      title: 'Duty Logs (Journey Management)',
      icon: FileText,
      content: `
**Creating Duty Logs:**
- Manual entry via form
- AI OCR scan of duty slips
- Voice natural language input

**Editing Duty Logs:**
- Navigate to Duty Logs
- Click edit icon on any entry
- Modify fields
- Save changes

**Deleting Duty Logs:**
- Click delete icon
- Confirm deletion
- Cannot be undone

**Validation:**
- System validates date ranges
- Checks for overlapping duties
- Ensures all required fields present
      `
    },
    {
      id: 'feat-3',
      title: 'MR (Money Remittance) Management',
      icon: IndianRupee,
      content: `
**MR Fields in Duty Log:**
- MR Number: Tracking number
- MR Amount: Amount in ₹
- Remitted At Station: Station code

**Claim Status:**
- Check "MR Claim Pending" if awaiting processing
- Uncheck if MR already settled

**MR Statement:**
- Monthly Statements → Select "MR Statement"
- Shows all MR transactions for selected month
- Includes MR number, amount, station, train details
- Export to CSV or print as PDF
      `
    },
    {
      id: 'feat-4',
      title: 'Claim/No-Claim Status',
      icon: AlertCircle,
      content: `
**Claim Status Options:**
- **Claim Eligible:** Default, TA/NDA will be calculated
- **No Claim Reasons:**
  - CL (Casual Leave)
  - CR (Compensation Rest)
  - HQRS (Headquarters)
  - LAP, LHAP, NH, PL, REST, SCL
  - OTHER

**Duty Categories:**
- Ticket Checking
- On Duty
- Station Duty
- PF Check
- Other

**NDA Eligibility:**
- Toggle "NDA Required" checkbox
- Controls whether night duty allowance calculated
- Independent of general claim status
      `
    },
    {
      id: 'feat-5',
      title: 'Allowances Matrix',
      icon: BarChart3,
      content: `
**Viewing Allowance Rules:**
- Navigate to "Allowances Matrix"
- See current TA daily rate
- See current NDA hourly rate
- View calculation rules

**Understanding Calculations:**
- TA = (Hours away from HQ / 24) × Daily Rate
- NDA = Night hours (10 PM - 6 AM) × Hourly Rate
- Distance affects eligibility thresholds
- No-claim duties excluded from calculations

**Note:** Actual rates may vary by division and pay grade. Always verify with official railway circulars.
      `
    },
    {
      id: 'feat-6',
      title: 'Duty Roster Planning',
      icon: Calendar,
      content: `
**Roster Features:**
- Monthly calendar view
- Add scheduled duties in advance
- Convert roster entries to actual logs
- Track planned vs actual duties

**Roster Entry Fields:**
- Date
- Train Number/Name
- From/To stations
- Scheduled times
- Duty type

**Best Practices:**
- Plan roster at start of month
- Convert to logs after duty completion
- Use for shift planning and coordination
      `
    },
    {
      id: 'feat-7',
      title: 'Train Directory',
      icon: Train,
      content: `
**Train Directory Features:**
- Search trains by number or name
- View train details (stations, distance)
- Filter by division or type
- Train autocomplete in duty forms

**Using Train Autocomplete:**
- Start typing train number in duty log form
- System suggests matching trains
- Click suggestion to auto-fill train name and route
- Distance auto-populated if available

**Offline Access:**
- Train directory cached locally
- Works without internet connection
- Syncs when online
      `
    },
    {
      id: 'feat-8',
      title: 'Statement Templates',
      icon: BookOpen,
      content: `
**Creating Templates:**
1. Navigate to Statement Templates
2. Click "Create Template"
3. Name your template
4. Select statement type (TA, NDA, Diary, MR)
5. Choose columns to display
6. Set display preferences:
   - Show/hide employee info
   - Show/hide summary totals
   - Show/hide signature section
7. Customize header/footer text
8. Set page orientation (portrait/landscape)
9. Choose font size (small/medium/large)
10. Save template

**Using Templates:**
- Set as default for auto-selection
- Select template in Reports page
- Template controls which columns appear
- Template controls PDF layout

**Managing Templates:**
- Edit existing templates
- Duplicate templates
- Delete unused templates
- One default template per statement type
      `
    },
    {
      id: 'feat-9',
      title: 'AI Duty Slip Scanner (OCR)',
      icon: Camera,
      content: `
**How to Use OCR:**
1. Navigate to duty log form
2. Click "Snap / Upload Slip"
3. Take photo or select image file
4. Wait for AI processing (1-3 seconds)
5. Review extracted fields with confidence scores

**Confidence Indicators:**
- **Green (≥95%):** High confidence, likely accurate
- **Orange (80-94%):** Medium confidence, verify field
- **Red (<80%):** Low confidence, check carefully

**Fields Extracted:**
- Train number and name
- Departure and arrival stations
- Scheduled and actual times
- Distance in kilometers
- Coach information
- Duty type

**Tips for Best Results:**
- Use clear, well-lit photos
- Ensure text is readable
- Avoid blurry or angled images
- Review all extracted fields before saving
      `
    },
    {
      id: 'feat-10',
      title: 'Voice Duty Logging',
      icon: Mic,
      content: `
**Browser Support:**
- ✅ Chrome (desktop/mobile)
- ✅ Edge (desktop/mobile)
- ✅ Safari (macOS/iOS 14.5+)
- ❌ Firefox (use manual entry or OCR)

**How to Use Voice Logging:**
1. Click "Log Duty by Voice" button
2. Click "Start Recording"
3. Speak naturally describing your duty
4. Click "Stop Recording"
5. AI processes transcript and extracts fields
6. Review extracted fields in grid
7. Click "Apply to Form"
8. Edit any field if needed
9. Save duty log

**Example Phrases:**
- "I worked train 12951 from Mumbai Central to New Delhi on November 10"
- "Departed at 5:30 PM, arrived at 9:00 AM next day"
- "Ticket checking duty, distance 1384 kilometers"
- "MR number 12345, remitted 5000 rupees at NDLS"
- "Delayed 30 minutes"

**Fields Extracted:**
- Train number and name
- Stations (with intelligent mapping)
- Dates and times (relative dates supported)
- Distance, delay
- Duty category
- MR details
- Claim status
- Notes/remarks
      `
    }
  ];

  // FAQs
  const faqs = [
    {
      id: 'faq-1',
      question: 'How do I create a duty entry?',
      answer: 'You have three options: 1) Manual entry via "Duty Logs → Log New Shift Duty", 2) AI OCR by uploading a duty slip photo, or 3) Voice input by speaking your duty details naturally. All methods guide you through entering train details, stations, times, and allowance information.'
    },
    {
      id: 'faq-2',
      question: 'How do I correct an incorrect duty entry?',
      answer: 'Navigate to "Duty Logs", find the entry you want to correct, click the edit icon (pencil), modify the fields, and click "Update Log". Changes are saved immediately. Note: Train number cannot be changed in edit mode for data integrity.'
    },
    {
      id: 'faq-3',
      question: 'How does offline mode work?',
      answer: 'RailAssist is a Progressive Web App (PWA) that works offline. When offline: You can create, edit, and view duty logs stored in your device. Train directory and templates are cached locally. Data syncs automatically when you reconnect to the internet. The offline indicator shows your connection status.'
    },
    {
      id: 'faq-4',
      question: 'How does synchronization work?',
      answer: 'Synchronization happens automatically when online. Your locally created/edited data syncs to the server in the background. Server data syncs to your device for access across multiple devices. Conflicts are resolved by timestamp (latest wins). Sync status shown in dashboard and settings.'
    },
    {
      id: 'faq-5',
      question: 'How do I generate monthly statements?',
      answer: 'Navigate to "Monthly Statements", select the desired month, choose statement type (TA, NDA, Diary, or MR), select a template (or use default), and click "Print / Save as PDF". You can also export to CSV. Customize output using Statement Templates.'
    },
    {
      id: 'faq-6',
      question: 'How do I use OCR to scan duty slips?',
      answer: 'In the duty log form, click "Snap / Upload Slip", take a photo or upload an image of your duty slip. The AI processes it (1-3 seconds) and extracts train number, stations, times, distance, and other fields. Review confidence scores (green = high confidence, orange/red = verify), edit any incorrect fields, and save.'
    },
    {
      id: 'faq-7',
      question: 'How do I use voice input for duty logging?',
      answer: 'Click "Log Duty by Voice" in the journey form, click "Start Recording", speak naturally (e.g., "I worked train 12951 from Mumbai Central to New Delhi on November 10"), click "Stop Recording", review the extracted fields, and click "Apply to Form". Voice works in Chrome, Edge, and Safari only.'
    },
    {
      id: 'faq-8',
      question: 'What browsers support voice input?',
      answer: 'Voice input is supported in Chrome (desktop/mobile), Microsoft Edge (desktop/mobile), and Safari (macOS and iOS 14.5+). Firefox does not support the Web Speech API. If your browser doesn\'t support voice, you can still use manual entry or OCR.'
    },
    {
      id: 'faq-9',
      question: 'How are TA and NDA calculated?',
      answer: 'TA (Travelling Allowance) = (Hours away from HQ / 24) × Daily Rate (default ₹800). NDA (Night Duty Allowance) = Night hours worked (10 PM - 6 AM) × Hourly Rate (default ₹180). Calculations are automatic based on your departure/arrival times. No-claim duties are excluded.'
    },
    {
      id: 'faq-10',
      question: 'Can I customize statement templates?',
      answer: 'Yes! Navigate to "Statement Templates", create a new template, choose which columns to show/hide, customize headers/footers, set page orientation (portrait/landscape), choose font size, and save. You can set one template as default per statement type.'
    },
    {
      id: 'faq-11',
      question: 'What is the difference between Roster and Duty Logs?',
      answer: 'Roster is for planning future duties (scheduled shifts). Duty Logs are actual completed duties. You can create roster entries in advance, then convert them to duty logs after completion. Roster helps with shift planning; duty logs generate allowance statements.'
    },
    {
      id: 'faq-12',
      question: 'How do I contact support?',
      answer: 'You can contact RailAssist support via WhatsApp at +91 8639271771 or email at lalamashag31fsd@gmail.com. Please include your employee ID and describe your issue clearly. Support is provided for technical issues and feature guidance only.'
    },
    {
      id: 'faq-13',
      question: 'Is my data secure?',
      answer: 'Yes. Your data is encrypted in transit (HTTPS) and stored securely. Passwords are hashed using bcrypt. JWT tokens are used for authentication. Each user can only access their own data. The application uses industry-standard security practices.'
    },
    {
      id: 'faq-14',
      question: 'Can I use RailAssist on multiple devices?',
      answer: 'Yes! Log in with the same email and password on any device. Your data syncs across devices when online. Changes made on one device appear on others after sync. Note: Offline data syncs only when that device connects to the internet.'
    },
    {
      id: 'faq-15',
      question: 'What if OCR extraction is incorrect?',
      answer: 'OCR is not 100% accurate. Always review extracted fields before saving. The system shows confidence scores for each field (green = high, orange = medium, red = low). You can manually edit any incorrect field before saving the duty log.'
    }
  ];

  // Filter content based on search
  const filterContent = (items) => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.title?.toLowerCase().includes(query) ||
      item.question?.toLowerCase().includes(query) ||
      item.content?.toLowerCase().includes(query) ||
      item.answer?.toLowerCase().includes(query)
    );
  };

  const filteredGettingStarted = filterContent(gettingStarted);
  const filteredFeatures = filterContent(featureGuides);
  const filteredFAQs = filterContent(faqs);

  const renderMarkdown = (text) => {
    // Simple markdown renderer for bold and line breaks
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h6 key={i} className="text-white fw-bold mt-3 mb-2" style={{ fontSize: '14px' }}>{line.replace(/\*\*/g, '')}</h6>;
      }
      if (line.trim().startsWith('-')) {
        return <li key={i} className="text-secondary-custom mb-1" style={{ fontSize: '13px', lineHeight: '1.6' }}>{line.replace(/^-\s*/, '')}</li>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-secondary-custom mb-2" style={{ fontSize: '13px', lineHeight: '1.6' }}>{line}</p>;
    });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-white mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
          Help & Support Centre
        </h2>
        <p className="text-secondary-custom mb-0" style={{ fontSize: '14px' }}>
          Find answers, learn features, and get support for RailAssist
        </p>
      </div>

      {/* Search */}
      <div className="card-saas mb-4">
        <div className="position-relative">
          <Search size={18} className="position-absolute text-secondary-custom" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-control form-control-saas ps-5"
            placeholder="Search help articles, FAQs, features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '44px' }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery('');
              }}
              className={`btn px-3 py-2 d-inline-flex align-items-center gap-2 ${
                activeCategory === cat.id 
                  ? 'btn-glow-primary' 
                  : 'btn-saas-secondary'
              }`}
              style={{ fontSize: '13px' }}
            >
              <Icon size={16} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="row g-4">
        <div className="col-12">
          
          {/* Getting Started */}
          {(activeCategory === 'getting-started' || searchQuery) && (
            <div className="mb-4">
              {!searchQuery && (
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Rocket size={20} className="text-primary" />
                  <h4 className="text-white mb-0" style={{ fontSize: '18px', fontWeight: '600' }}>Getting Started</h4>
                </div>
              )}
              
              {filteredGettingStarted.length > 0 ? (
                <div className="row g-3">
                  {filteredGettingStarted.map(article => {
                    const Icon = article.icon;
                    return (
                      <div key={article.id} className="col-12">
                        <div className="card-saas">
                          <div className="d-flex align-items-start gap-3">
                            <div className="flex-shrink-0 rounded p-2" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                              <Icon size={20} className="text-primary" />
                            </div>
                            <div className="flex-grow-1">
                              <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>
                                {article.title}
                              </h5>
                              <div className="text-secondary-custom" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                {renderMarkdown(article.content)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card-saas text-center py-5">
                  <p className="text-secondary-custom mb-0">No articles found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* Feature Guides */}
          {(activeCategory === 'features' || searchQuery) && (
            <div className="mb-4">
              {!searchQuery && (
                <div className="d-flex align-items-center gap-2 mb-3">
                  <BookOpen size={20} className="text-primary" />
                  <h4 className="text-white mb-0" style={{ fontSize: '18px', fontWeight: '600' }}>Feature Guides</h4>
                </div>
              )}
              
              {filteredFeatures.length > 0 ? (
                <div className="row g-3">
                  {filteredFeatures.map(guide => {
                    const Icon = guide.icon;
                    return (
                      <div key={guide.id} className="col-12 col-md-6">
                        <div className="card-saas h-100">
                          <div className="d-flex align-items-start gap-3">
                            <div className="flex-shrink-0 rounded p-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                              <Icon size={18} className="text-success" />
                            </div>
                            <div className="flex-grow-1">
                              <h5 className="text-white mb-3" style={{ fontSize: '14px', fontWeight: '600' }}>
                                {guide.title}
                              </h5>
                              <div className="text-secondary-custom" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                {renderMarkdown(guide.content)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card-saas text-center py-5">
                  <p className="text-secondary-custom mb-0">No guides found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* FAQs */}
          {(activeCategory === 'faqs' || searchQuery) && (
            <div className="mb-4">
              {!searchQuery && (
                <div className="d-flex align-items-center gap-2 mb-3">
                  <MessageCircle size={20} className="text-primary" />
                  <h4 className="text-white mb-0" style={{ fontSize: '18px', fontWeight: '600' }}>Frequently Asked Questions</h4>
                </div>
              )}
              
              {filteredFAQs.length > 0 ? (
                <div className="card-saas">
                  {filteredFAQs.map((faq, idx) => (
                    <div key={faq.id}>
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="btn w-100 text-start p-3 d-flex align-items-center justify-content-between border-0 bg-transparent"
                        style={{ fontSize: '14px' }}
                      >
                        <span className="text-white fw-medium">{faq.question}</span>
                        {expandedFAQs.has(faq.id) ? (
                          <ChevronDown size={18} className="text-secondary-custom flex-shrink-0" />
                        ) : (
                          <ChevronRight size={18} className="text-secondary-custom flex-shrink-0" />
                        )}
                      </button>
                      
                      {expandedFAQs.has(faq.id) && (
                        <div className="px-3 pb-3">
                          <p className="text-secondary-custom mb-0" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                            {faq.answer}
                          </p>
                        </div>
                      )}
                      
                      {idx < filteredFAQs.length - 1 && (
                        <div className="border-top border-secondary mx-3"></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-saas text-center py-5">
                  <p className="text-secondary-custom mb-0">No FAQs found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* Contact Support */}
          {activeCategory === 'support' && !searchQuery && (
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Mail size={20} className="text-primary" />
                <h4 className="text-white mb-0" style={{ fontSize: '18px', fontWeight: '600' }}>Contact Support</h4>
              </div>
              
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="card-saas h-100">
                    <div className="text-center py-4">
                      <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                        <MessageCircle size={28} className="text-success" />
                      </div>
                      <h5 className="text-white mb-2" style={{ fontSize: '15px', fontWeight: '600' }}>WhatsApp Support</h5>
                      <p className="text-secondary-custom mb-3" style={{ fontSize: '13px' }}>
                        Get instant help via WhatsApp
                      </p>
                      <a
                        href="https://wa.me/918639271771"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-glow-success px-4"
                        style={{ fontSize: '13px' }}
                      >
                        Open WhatsApp
                      </a>
                      <p className="text-secondary-custom mt-3 mb-0" style={{ fontSize: '12px' }}>
                        +91 8639271771
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="card-saas h-100">
                    <div className="text-center py-4">
                      <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                        <Mail size={28} className="text-info" />
                      </div>
                      <h5 className="text-white mb-2" style={{ fontSize: '15px', fontWeight: '600' }}>Email Support</h5>
                      <p className="text-secondary-custom mb-3" style={{ fontSize: '13px' }}>
                        Send us an email for detailed queries
                      </p>
                      <a
                        href="mailto:lalamashag31fsd@gmail.com"
                        className="btn btn-outline-info px-4"
                        style={{ fontSize: '13px' }}
                      >
                        Send Email
                      </a>
                      <p className="text-secondary-custom mt-3 mb-0" style={{ fontSize: '12px' }}>
                        lalamashag31fsd@gmail.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-saas mt-3">
                <div className="d-flex align-items-start gap-3">
                  <Info size={18} className="text-info mt-1 flex-shrink-0" />
                  <div>
                    <h6 className="text-white mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>Support Guidelines</h6>
                    <ul className="text-secondary-custom mb-0 ps-3" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      <li>Include your employee ID in support requests</li>
                      <li>Describe the issue clearly with steps to reproduce</li>
                      <li>Attach screenshots if applicable</li>
                      <li>Support is provided for technical issues and feature guidance</li>
                      <li>For railway rule clarifications, consult official circulars</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About & Disclaimer */}
          {activeCategory === 'about' && !searchQuery && (
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Info size={20} className="text-primary" />
                <h4 className="text-white mb-0" style={{ fontSize: '18px', fontWeight: '600' }}>About & Disclaimer</h4>
              </div>

              {/* About RailAssist */}
              <div className="card-saas mb-3">
                <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>About RailAssist</h5>
                <p className="text-secondary-custom mb-3" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  RailAssist is an independent Progressive Web Application (PWA) designed to help Indian Railway employees manage their duty logs, calculate allowances, and generate monthly statements. The application provides offline-first functionality with AI-powered features for enhanced productivity.
                </p>
                
                <div className="border-top border-secondary pt-3 mt-3">
                  <h6 className="text-white mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>Version Information</h6>
                  <p className="text-secondary-custom mb-0" style={{ fontSize: '13px' }}>
                    <strong>Application Version:</strong> 0.0.0<br />
                    <strong>Build:</strong> Production<br />
                    <strong>Last Updated:</strong> November 2026
                  </p>
                </div>
              </div>

              {/* Key Features */}
              <div className="card-saas mb-3">
                <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>Key Features</h5>
                <div className="row g-2">
                  {[
                    'Offline-first duty log management',
                    'AI-powered duty slip scanner (OCR)',
                    'Voice-based duty logging',
                    'Automatic TA/NDA calculation',
                    'Customizable statement templates',
                    'Monthly report generation',
                    'Train directory with autocomplete',
                    'Duty roster planning',
                    'MR (Money Remittance) tracking',
                    'Cross-device data synchronization',
                    'PWA for mobile installation',
                    'AI copilot assistance'
                  ].map((feature, idx) => (
                    <div key={idx} className="col-12 col-md-6">
                      <div className="d-flex align-items-center gap-2">
                        <ChevronRight size={14} className="text-success flex-shrink-0" />
                        <span className="text-secondary-custom" style={{ fontSize: '13px' }}>{feature}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support Details */}
              <div className="card-saas mb-3">
                <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>Support Details</h5>
                <p className="text-secondary-custom mb-2" style={{ fontSize: '13px' }}>
                  <strong>WhatsApp:</strong> +91 8639271771<br />
                  <strong>Email:</strong> lalamashag31fsd@gmail.com
                </p>
                <p className="text-secondary-custom mb-0" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  Support is provided for technical issues, feature guidance, and application usage. For official railway rule clarifications, please consult your division's official circulars.
                </p>
              </div>

              {/* Disclaimer */}
              <div className="card-saas border-warning" style={{ borderWidth: '2px' }}>
                <div className="d-flex align-items-start gap-3">
                  <AlertCircle size={20} className="text-warning mt-1 flex-shrink-0" />
                  <div>
                    <h5 className="text-warning mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>Important Disclaimer</h5>
                    
                    <h6 className="text-white mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>Independent Application</h6>
                    <p className="text-secondary-custom mb-3" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      RailAssist is an <strong>independent application</strong> and is <strong>NOT an official Indian Railways application</strong>. It is not affiliated with, endorsed by, or sponsored by Indian Railways, the Ministry of Railways, or any railway division. The application is developed independently to assist railway employees with duty log management.
                    </p>

                    <h6 className="text-white mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>Allowance Calculation Verification</h6>
                    <p className="text-secondary-custom mb-3" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      All allowance calculations (TA, NDA, etc.) provided by RailAssist are <strong>estimates based on default rates and may not reflect your actual entitlements</strong>. Actual allowance rates vary by:
                    </p>
                    <ul className="text-secondary-custom mb-3 ps-3" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      <li>Railway zone and division</li>
                      <li>Employee pay level and grade</li>
                      <li>Applicable railway circulars and orders</li>
                      <li>Special duty conditions and exemptions</li>
                    </ul>
                    <p className="text-secondary-custom mb-3" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      <strong>Always verify allowance calculations with official railway circulars and your accounts department before submission.</strong> The application developers are not responsible for any financial discrepancies or claim rejections.
                    </p>

                    <h6 className="text-white mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>Data Accuracy</h6>
                    <p className="text-secondary-custom mb-3" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      Users are responsible for verifying the accuracy of all data entered, including duty times, distances, train details, and allowance claims. AI-powered features (OCR, voice logging) are assistive tools and may produce errors. Always review extracted data before saving.
                    </p>

                    <h6 className="text-white mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>Official Documentation</h6>
                    <p className="text-secondary-custom mb-0" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      For official railway rules, allowance rates, and claim procedures, refer to:
                    </p>
                    <ul className="text-secondary-custom mb-0 ps-3" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      <li>Railway Board circulars</li>
                      <li>Zonal/divisional office orders</li>
                      <li>Travelling Allowance Rules</li>
                      <li>Your division's accounts department</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Help;
