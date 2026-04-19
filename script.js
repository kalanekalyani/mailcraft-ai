// ═══════════════════════════════════════════════════════
//  MailCraft AI — Full Script
//  Features: Auth, AI Mode, Offline Mode, History, Drafts,
//  Analytics, Admin, Tone Converter, Smart Reply, Summarize
// ═══════════════════════════════════════════════════════

// ─── STATE ───────────────────────────────────────────────
let currentUser  = null;
let selectedTone = 'formal';
let currentMode  = 'offline';  // 'offline' | 'ai'
let currentPage  = 'generator';
let emailHistory = [];
let emailDrafts  = [];
let feedbackData = [];

// ─── PLAN SYSTEM ─────────────────────────────────────────
const PLANS = {
  free:  { name: 'Free',  dailyLimit: 5,   price: 0,   badge: 'Free'  },
  pro:   { name: 'Pro',   dailyLimit: 999, price: 299,  badge: 'Pro'   },
  admin: { name: 'Admin', dailyLimit: 999, price: 0,    badge: 'Admin' },
};
const CREDITS_PER_STAR = 2;

function getUserPlan() {
  if (!currentUser) return 'free';
  if (currentUser.role === 'admin') return 'admin';
  return currentUser.plan || 'free';
}
function getDailyCount() {
  const key = 'mc_' + currentUser.id + '_daily_' + new Date().toDateString();
  return parseInt(localStorage.getItem(key) || '0');
}
function incrementDailyCount() {
  const key = 'mc_' + currentUser.id + '_daily_' + new Date().toDateString();
  localStorage.setItem(key, getDailyCount() + 1);
  updatePlanBadge();
}
function getUserCredits() {
  return parseInt(localStorage.getItem('mc_' + currentUser.id + '_credits') || '0');
}
function addCredits(n) {
  const c = getUserCredits() + n;
  localStorage.setItem('mc_' + currentUser.id + '_credits', c);
  updatePlanBadge();
  showToast('⭐ +' + n + ' credits earned!');
  return c;
}
function updatePlanBadge() {
  const plan    = getUserPlan();
  const info    = PLANS[plan] || PLANS.free;
  const used    = getDailyCount();
  const credits = getUserCredits();
  const el = document.getElementById('planBadge');
  if (!el) return;
  if (plan === 'free') {
    el.innerHTML = '<span class="plan-tag plan-' + plan + '">' + info.badge + '</span> ' +
      used + '/' + PLANS.free.dailyLimit + ' emails today &nbsp;·&nbsp; ⭐ ' + credits + ' credits';
  } else {
    el.innerHTML = '<span class="plan-tag plan-' + plan + '">' + info.badge + '</span> ' +
      'Unlimited emails &nbsp;·&nbsp; ⭐ ' + credits + ' credits';
  }
}
function canGenerateEmail() {
  const plan = getUserPlan();
  if (plan !== 'free') return true;
  return getDailyCount() < PLANS.free.dailyLimit;
}
function showUpgradePopup() { document.getElementById('upgradePopup').classList.remove('hidden'); }
function hideUpgradePopup() { document.getElementById('upgradePopup').classList.add('hidden'); }
function activatePro() {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx > -1) { users[idx].plan = 'pro'; saveUsers(users); }
  currentUser.plan = 'pro';
  localStorage.setItem('mc_session', JSON.stringify(currentUser));
  hideUpgradePopup();
  updatePlanBadge();
  document.getElementById('sidebarRole').textContent = '✦ Pro Member';
  showToast('Welcome to Pro! Unlimited emails unlocked!');
}

// ─── AUTH DATA (localStorage-based) ──────────────────────
function getUsers() {
  const stored = localStorage.getItem('mc_users');
  if (stored) return JSON.parse(stored);
  const defaults = [
    { id: 'u1', name: 'Demo User',  email: 'user@demo.com',  password: 'demo123',  role: 'user',  created: Date.now(), defaultTone: 'formal', defaultMode: 'offline' },
    { id: 'u2', name: 'Admin User', email: 'admin@demo.com', password: 'admin123', role: 'admin', created: Date.now(), defaultTone: 'professional', defaultMode: 'ai' },
  ];
  saveUsers(defaults);
  return defaults;
}
function saveUsers(users) { localStorage.setItem('mc_users', JSON.stringify(users)); }

// ─── AUTH FUNCTIONS ───────────────────────────────────────
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  const users = getUsers();
  const user  = users.find(u => u.email === email && u.password === pass);
  if (!user) { showAuthError('loginError', 'Invalid email or password.'); return; }
  currentUser = user;
  localStorage.setItem('mc_session', JSON.stringify(user));
  initApp();
}

function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPassword').value;
  if (!name || !email || !pass) { showAuthError('regError', 'All fields are required.'); return; }
  const users = getUsers();
  if (users.find(u => u.email === email)) { showAuthError('regError', 'Email already registered.'); return; }
  const newUser = { id: 'u' + Date.now(), name, email, password: pass, role: 'user', created: Date.now(), defaultTone: 'formal', defaultMode: 'offline' };
  users.push(newUser);
  saveUsers(users);
  currentUser = newUser;
  localStorage.setItem('mc_session', JSON.stringify(newUser));
  initApp();
}

function doLogout() {
  localStorage.removeItem('mc_session');
  currentUser = null;
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('mainApp').classList.add('hidden');
  clearAuthForms();
}

function changePassword() {
  const np = document.getElementById('newPassword').value;
  if (!np || np.length < 4) { alert('Password must be at least 4 characters.'); return; }
  const users = getUsers();
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx > -1) { users[idx].password = np; saveUsers(users); }
  currentUser.password = np;
  document.getElementById('newPassword').value = '';
  showToast('Password updated!');
}

function clearAuthForms() {
  ['loginEmail','loginPassword','regName','regEmail','regPassword'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['loginError','regError'].forEach(id => hideAuthError(id));
}

function showLogin()    { document.getElementById('loginForm').classList.add('active'); document.getElementById('registerForm').classList.remove('active'); }
function showRegister() { document.getElementById('registerForm').classList.add('active'); document.getElementById('loginForm').classList.remove('active'); }
function showAuthError(id, msg) { const el = document.getElementById(id); el.textContent = msg; el.style.display = 'block'; }
function hideAuthError(id) { const el = document.getElementById(id); el.textContent = ''; el.style.display = 'none'; }
function fillDemo(email, pass) { document.getElementById('loginEmail').value = email; document.getElementById('loginPassword').value = pass; }

// ─── APP INIT ─────────────────────────────────────────────
function initApp() {
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('mainApp').classList.remove('hidden');

  document.getElementById('sidebarAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarRole').textContent = currentUser.role === 'admin' ? '🛡 Admin' : (currentUser.plan === 'pro' ? '✦ Pro Member' : 'Free Member');

  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  } else {
    const adminPage = document.getElementById('page-admin');
    if (adminPage) adminPage.remove();
    document.querySelectorAll('.admin-only').forEach(el => el.remove());
  }
  updatePlanBadge();

  setMode(currentUser.defaultMode || 'offline');
  selectedTone = currentUser.defaultTone || 'formal';
  document.querySelectorAll('.tone-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tone === selectedTone);
  });

  loadUserData();
  updateBadges();
  loadSettingsForm();
  switchPage('generator');
}

function checkSession() {
  const sess = localStorage.getItem('mc_session');
  if (sess) {
    currentUser = JSON.parse(sess);
    initApp();
  }
}

// ─── USER DATA ────────────────────────────────────────────
function getUserKey(suffix) { return `mc_${currentUser.id}_${suffix}`; }

function loadUserData() {
  emailHistory = JSON.parse(localStorage.getItem(getUserKey('history')) || '[]');
  emailDrafts  = JSON.parse(localStorage.getItem(getUserKey('drafts'))  || '[]');
  feedbackData = JSON.parse(localStorage.getItem(getUserKey('feedback'))|| '[]');
}
function saveHistory() { localStorage.setItem(getUserKey('history'), JSON.stringify(emailHistory)); }
function saveDraftsStore() { localStorage.setItem(getUserKey('drafts'), JSON.stringify(emailDrafts)); }
function saveFeedback() { localStorage.setItem(getUserKey('feedback'), JSON.stringify(feedbackData)); }

function updateBadges() {
  document.getElementById('historyBadge').textContent = emailHistory.length;
  document.getElementById('draftsBadge').textContent  = emailDrafts.length;
}

// ─── PAGE SWITCHING ───────────────────────────────────────
function switchPage(page) {
  if (page === 'admin') {
    if (!currentUser || currentUser.role !== 'admin') {
      page = 'generator';
    }
  }
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = { generator: 'Email Generator', improve: 'Improve Email', tone: 'Tone Converter',
    reply: 'Smart Reply', summary: 'Email Summarizer', history: 'Email History',
    drafts: 'Saved Drafts', analytics: 'Analytics', settings: 'Settings', admin: 'Admin Dashboard' };
  document.getElementById('topbarTitle').textContent = titles[page] || 'MailCraft';

  if (page === 'history')   renderHistory();
  if (page === 'drafts')    renderDrafts();
  if (page === 'analytics') renderAnalytics();
  if (page === 'admin')     renderAdmin();

  if (window.innerWidth <= 700) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── MODE TOGGLE ──────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.getElementById('modeOffline').classList.toggle('active', mode === 'offline');
  document.getElementById('modeAI').classList.toggle('active', mode === 'ai');
}

// ─── DYNAMIC FIELDS ───────────────────────────────────────
const dynamicConfigs = {
  leave_application: { title: '📅 Leave Details', fields: [
    { id:'leaveFrom', label:'Leave From Date', type:'date' },
    { id:'leaveTo', label:'Leave To Date', type:'date' },
    { id:'leaveReason', label:'Reason for Leave', type:'text', placeholder:'e.g. Family function' },
  ]},
  sick_leave: { title: '🤒 Sick Leave Details', fields: [
    { id:'sickFrom', label:'Sick Leave From', type:'date' },
    { id:'sickTo', label:'Expected Return', type:'date' },
    { id:'sickDetail', label:'Brief Medical Reason', type:'text', placeholder:'e.g. Fever, doctor advised rest' },
  ]},
  billing: { title: '💳 Billing Details', fields: [
    { id:'invoiceNo', label:'Invoice / Bill Number', type:'text', placeholder:'e.g. INV-2024-1043' },
    { id:'amount', label:'Amount (₹ / $)', type:'text', placeholder:'e.g. ₹15,000' },
    { id:'dueDate', label:'Payment Due Date', type:'date' },
    { id:'billingNote', label:'Note / Clarification', type:'text', placeholder:'e.g. Reminder, dispute' },
  ]},
  file_request: { title: '📁 File Request Details', fields: [
    { id:'fileNeeded', label:'File / Document Name', type:'text', placeholder:'e.g. Q3 Sales Report' },
    { id:'fileDeadline', label:'Needed By', type:'date' },
    { id:'fileReason', label:'Why You Need It', type:'text', placeholder:'e.g. Audit review' },
  ]},
  meeting_invitation: { title: '📅 Meeting Details', fields: [
    { id:'meetDate', label:'Meeting Date', type:'date' },
    { id:'meetTime', label:'Meeting Time', type:'text', placeholder:'e.g. 3:00 PM IST' },
    { id:'meetAgenda', label:'Agenda', type:'text', placeholder:'e.g. Q4 planning, project kick-off' },
    { id:'meetLink', label:'Meeting Link / Venue (Optional)', type:'text', placeholder:'e.g. Zoom link' },
  ]},
  resignation: { title: '📝 Resignation Details', fields: [
    { id:'lastDay', label:'Last Working Day', type:'date' },
    { id:'noticePeriod', label:'Notice Period', type:'text', placeholder:'e.g. 30 days' },
    { id:'resignReason', label:'Brief Reason (Optional)', type:'text', placeholder:'e.g. Personal growth' },
  ]},
  job_application: { title: '💼 Job Details', fields: [
    { id:'jobRole', label:'Position Applying For', type:'text', placeholder:'e.g. Senior Software Engineer' },
    { id:'companyName', label:'Company Name', type:'text', placeholder:'e.g. Google' },
    { id:'experience', label:'Years of Experience', type:'text', placeholder:'e.g. 3 years' },
    { id:'keySkills', label:'Key Skills', type:'text', placeholder:'e.g. React, Node.js, Python' },
  ]},
  interview_followup: { title: '🎯 Interview Details', fields: [
    { id:'interviewDate', label:'Interview Date', type:'date' },
    { id:'interviewRole', label:'Position Interviewed For', type:'text', placeholder:'e.g. Product Manager' },
  ]},
  assignment_submission: { title: '📚 Assignment Details', fields: [
    { id:'assignmentTitle', label:'Assignment / Subject Name', type:'text', placeholder:'e.g. Data Structures' },
    { id:'assignmentDeadline', label:'Submission Deadline', type:'date' },
  ]},
  birthday: { title: '🎂 Birthday Details', fields: [
    { id:'birthdayPerson', label:"Recipient's Full Name", type:'text', placeholder:'e.g. Ananya Mehta' },
    { id:'relationship', label:'Your Relationship', type:'text', placeholder:'e.g. colleague, friend' },
  ]},
  invitation: { title: '🎉 Event Details', fields: [
    { id:'eventName', label:'Event Name', type:'text', placeholder:'e.g. Annual Team Dinner' },
    { id:'eventDate', label:'Event Date', type:'date' },
    { id:'eventVenue', label:'Venue / Link', type:'text', placeholder:'e.g. The Grand Ballroom' },
  ]},
};

function onTypeChange() {
  const type = document.getElementById('emailType').value;
  const container = document.getElementById('dynamicFields');
  const config = dynamicConfigs[type];
  if (!config) { container.innerHTML = ''; return; }
  let html = `<div class="dynamic-fields"><div class="dyn-title">✦ ${config.title}</div>`;
  const fields = config.fields;
  let i = 0;
  while (i < fields.length) {
    if (i + 1 < fields.length) {
      html += `<div class="row-2">${renderField(fields[i])}${renderField(fields[i+1])}</div>`;
      i += 2;
    } else {
      html += `<div class="field">${renderFieldInner(fields[i])}</div>`;
      i++;
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

function renderField(f) { return `<div class="field">${renderFieldInner(f)}</div>`; }
function renderFieldInner(f) {
  const ph = f.placeholder ? `placeholder="${f.placeholder}"` : '';
  return `<label>${f.label}</label><input type="${f.type}" id="${f.id}" ${ph}/>`;
}

function getDynamicValues() {
  const type = document.getElementById('emailType').value;
  const config = dynamicConfigs[type];
  if (!config) return {};
  const vals = {};
  config.fields.forEach(f => { const el = document.getElementById(f.id); if (el) vals[f.label] = el.value.trim(); });
  return vals;
}

// ─── TONE SELECTION ───────────────────────────────────────
function selectTone(btn) {
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedTone = btn.dataset.tone;
}

// ─── WORD COUNT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const extra = document.getElementById('extraDetails');
  if (extra) {
    extra.addEventListener('input', function () {
      const words = this.value.trim().split(/\s+/).filter(w => w).length;
      document.getElementById('wordCount').textContent = words;
      const hint = document.getElementById('contextHint');
      if (words === 0) hint.textContent = '';
      else if (words < 10) hint.textContent = 'Short notes — we\'ll expand ✨';
      else if (words < 25) hint.textContent = 'Good detail — will shape nicely';
      else hint.textContent = 'Great context — very personal email';
    });
  }
  checkSession();
});

// ─── GENERATE EMAIL ───────────────────────────────────────
function generateEmail() {
  clearError();
  if (!canGenerateEmail()) { showUpgradePopup(); return; }
  const sender   = document.getElementById('senderName').value.trim();
  const receiver = document.getElementById('receiverName').value.trim();
  const type     = document.getElementById('emailType').value;
  const extra    = document.getElementById('extraDetails').value.trim();

  if (!sender)   { showError('Please enter your name.'); return; }
  if (!receiver) { showError("Please enter the receiver's name."); return; }

  const dynVals   = getDynamicValues();
  const typeLabel = document.getElementById('emailType').selectedOptions[0].text;

  showLoading('emailBox');
  const genBtn = document.getElementById('genBtn');
  genBtn.disabled = true;
  genBtn.innerHTML = '<span>⏳</span> Writing…';

  document.getElementById('scoreCard').classList.add('hidden');
  document.getElementById('feedbackRow').classList.add('hidden');
  document.getElementById('variationsPanel').classList.add('hidden');

  if (currentMode === 'ai') {
    generateWithAI({ sender, receiver, type, typeLabel, tone: selectedTone, extra, dynVals })
      .then(result => {
        displayEmail(result, 'emailBox');
        const toneLabel = cap(selectedTone);
        document.getElementById('metaBadge').textContent = toneLabel + ' · ✨ AI Generated';
        saveToAnalytics(type, selectedTone, 'ai');
        incrementDailyCount();
        showScoreAndFeedback();
      })
      .catch(err => {
        showEmailBoxError('AI failed: ' + err.message + ' — switching to offline mode.');
        const result = generateEmailLocally({ sender, receiver, type, typeLabel, tone: selectedTone, extra, dynVals });
        displayEmail(result.subject ? `Subject: ${result.subject}\n\n${result.body}` : result, 'emailBox');
        document.getElementById('metaBadge').textContent = cap(selectedTone) + ' · Offline';
        saveToAnalytics(type, selectedTone, 'offline');
        showScoreAndFeedback();
      })
      .finally(() => { genBtn.disabled = false; genBtn.innerHTML = '<span>✨</span> Generate Email'; });
  } else {
    setTimeout(() => {
      try {
        const result = generateEmailLocally({ sender, receiver, type, typeLabel, tone: selectedTone, extra, dynVals });
        const text = result.subject ? `Subject: ${result.subject}\n\n${result.body}` : result;
        displayEmail(text, 'emailBox');
        document.getElementById('metaBadge').textContent = cap(selectedTone) + ' · ⚡ Offline Template';
        saveToAnalytics(type, selectedTone, 'offline');
        incrementDailyCount();
        showScoreAndFeedback();
      } catch (err) {
        showEmailBoxError('Could not generate: ' + err.message);
      } finally {
        genBtn.disabled = false;
        genBtn.innerHTML = '<span>✨</span> Generate Email';
      }
    }, 700);
  }
}

// ─── AI API CALL (secure — routes through /api/chat) ──────
async function callAI(systemPrompt, userMessage) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  if (!response.ok) throw new Error('API error ' + response.status);
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function generateWithAI({ sender, receiver, type, typeLabel, tone, extra, dynVals }) {
  const dynStr = Object.entries(dynVals).map(([k, v]) => v ? `${k}: ${v}` : '').filter(Boolean).join('\n');

  const toneGuide = {
    formal:       'Very structured, respectful, precise. No contractions. Sophisticated vocabulary.',
    polite:       'Warm but professional. Courteous phrasing. Gentle, considerate requests.',
    friendly:     'Conversational, warm, uses contractions naturally. Personal and engaging.',
    professional: 'Confident, clear, results-focused. Direct. No fluff or filler.',
    casual:       'Relaxed and direct, like messaging a colleague. Short sentences, informal.',
    empathetic:   'Understanding, caring, emotionally aware. Acknowledge feelings first.'
  };

  const systemPrompt = `You are an expert email writer who crafts highly personalised, human-sounding emails.

STRICT RULES:
- NEVER use these generic phrases: "I hope this email finds you well", "I am writing to inform you", "Please do not hesitate", "Please find attached", "As per our conversation"
- Write like a real person — vary sentence length, use specific details, avoid corporate fluff
- The additional context MUST be woven naturally into sentences — never paste it as a standalone line
- AI emails must feel noticeably smarter, more personal, and more fluid than a basic template
- Subject line must be specific and compelling — never generic
- Closing must match the tone exactly`;

  const userMessage = `Write a ${tone} ${typeLabel} email.

Sender: ${sender}
Recipient: ${receiver}
Tone: ${toneGuide[tone] || tone}
${dynStr ? 'Details:\n' + dynStr : ''}
${extra ? 'Weave this context naturally into the email (do NOT paste as-is): ' + extra : ''}

Make it feel genuinely written by ${sender} — personal, specific, and ${tone}. Include Subject line first.`;

  return callAI(systemPrompt, userMessage);
}

// ─── SHOW SCORE & FEEDBACK ───────────────────────────────
function showScoreAndFeedback() {
  const pro = 70 + Math.floor(Math.random() * 30);
  const cla = 65 + Math.floor(Math.random() * 35);
  const ton = 72 + Math.floor(Math.random() * 28);

  document.getElementById('scorePro').style.width = pro + '%';
  document.getElementById('scoreCla').style.width = cla + '%';
  document.getElementById('scoreTon').style.width = ton + '%';
  document.getElementById('scoreProVal').textContent = pro + '%';
  document.getElementById('scoreClaVal').textContent = cla + '%';
  document.getElementById('scoreTonVal').textContent = ton + '%';

  document.getElementById('scoreCard').classList.remove('hidden');
  document.getElementById('feedbackRow').classList.remove('hidden');

  document.querySelectorAll('#starRating span').forEach(s => s.classList.remove('lit'));
}

function rateStar(n) {
  const stars = document.querySelectorAll('#starRating span');
  stars.forEach((s, i) => s.classList.toggle('lit', i < n));

  const text = document.getElementById('emailBox').textContent;
  feedbackData.push({ rating: n, text: text.substring(0, 100), date: Date.now(), type: document.getElementById('emailType').value });
  saveFeedback();
  const earned = n * CREDITS_PER_STAR;
  addCredits(earned);
}

// ─── GENERATE VARIATIONS ─────────────────────────────────
async function generateVariations() {
  const text = document.getElementById('emailBox').textContent;
  if (!text || text.includes('email will appear')) { showError('Generate an email first.'); return; }

  const panel = document.getElementById('variationsPanel');
  const list  = document.getElementById('variationsList');
  panel.classList.remove('hidden');
  list.innerHTML = '<div class="loading-state" style="min-height:80px"><div class="loading-dots"><span></span><span></span><span></span></div><div class="loading-label">Generating variations…</div></div>';

  if (currentMode === 'ai') {
    try {
      const result = await callAI(
        'You are an email variation generator. Given an email, produce 2 alternative versions with different styles. Label them "Version A:" and "Version B:" and separate with "---".',
        'Generate 2 variations of this email:\n\n' + text.substring(0, 500)
      );
      const parts = result.split(/---|\n---\n/);
      list.innerHTML = parts.slice(0, 2).map((p, i) =>
        `<div class="variation-item" onclick="useVariation(this)">
          <div class="variation-label">Version ${String.fromCharCode(65+i)}</div>
          <div>${p.trim()}</div>
        </div>`
      ).join('');
    } catch {
      list.innerHTML = '<p style="color:var(--muted);font-size:0.84rem;padding:10px">Could not generate variations. Enable AI mode.</p>';
    }
  } else {
    const variations = ['Variation A (Direct):\n' + text.replace(/^Subject:.*\n/, '').trim(),
                        'Variation B (Formal):\n' + text.replace(/^Subject:.*\n/, '').trim()];
    list.innerHTML = variations.map((v, i) =>
      `<div class="variation-item" onclick="useVariation(this)">
        <div class="variation-label">Version ${String.fromCharCode(65+i)}</div>
        <div>${v}</div>
      </div>`
    ).join('');
  }
}

function useVariation(el) {
  const text = el.querySelector('div:last-child').textContent;
  const box = document.getElementById('emailBox');
  box.className = 'email-box';
  box.textContent = text;
}

// ─── SAVE TO HISTORY ─────────────────────────────────────
function saveToHistory() {
  const text = document.getElementById('emailBox').textContent;
  if (!text || text.includes('email will appear')) { showError('No email to save.'); return; }
  const type = document.getElementById('emailType').value;
  const typeLabel = document.getElementById('emailType').selectedOptions[0].text;

  emailHistory.unshift({
    id: Date.now(), text, type, typeLabel, tone: selectedTone,
    mode: currentMode, date: Date.now(), rating: 0,
    sender: document.getElementById('senderName').value.trim(),
    receiver: document.getElementById('receiverName').value.trim()
  });
  if (emailHistory.length > 100) emailHistory.pop();
  saveHistory();
  updateBadges();
  showToast('Saved to history!');
}

function saveToAnalytics(type, tone, mode) {
  const statsKey = getUserKey('stats');
  const stats = JSON.parse(localStorage.getItem(statsKey) || '{"total":0,"types":{},"tones":{},"modes":{"ai":0,"offline":0}}');
  stats.total++;
  stats.types[type] = (stats.types[type] || 0) + 1;
  stats.tones[tone] = (stats.tones[tone] || 0) + 1;
  stats.modes[mode] = (stats.modes[mode] || 0) + 1;
  localStorage.setItem(statsKey, JSON.stringify(stats));
}

function getStats() {
  return JSON.parse(localStorage.getItem(getUserKey('stats')) || '{"total":0,"types":{},"tones":{},"modes":{"ai":0,"offline":0}}');
}

// ─── DRAFTS ───────────────────────────────────────────────
function saveDraft() {
  const sender   = document.getElementById('senderName').value.trim();
  const receiver = document.getElementById('receiverName').value.trim();
  const extra    = document.getElementById('extraDetails').value.trim();
  const type     = document.getElementById('emailType').value;
  const typeLabel = document.getElementById('emailType').selectedOptions[0].text;

  if (!sender && !extra) { showError('Fill in at least some details to save as draft.'); return; }

  emailDrafts.unshift({
    id: Date.now(), sender, receiver, extra, type, typeLabel,
    tone: selectedTone, date: Date.now()
  });
  saveDraftsStore();
  updateBadges();
  showToast('Draft saved!');
}

function loadDraft(draft) {
  document.getElementById('senderName').value = draft.sender || '';
  document.getElementById('receiverName').value = draft.receiver || '';
  document.getElementById('extraDetails').value = draft.extra || '';
  document.getElementById('emailType').value = draft.type;
  onTypeChange();
  selectedTone = draft.tone || 'formal';
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.toggle('active', b.dataset.tone === selectedTone));
  switchPage('generator');
  showToast('Draft loaded!');
}

function deleteDraft(id) {
  emailDrafts = emailDrafts.filter(d => d.id !== id);
  saveDraftsStore();
  updateBadges();
  renderDrafts();
}

// ─── HISTORY RENDER ───────────────────────────────────────
function renderHistory() {
  const list = document.getElementById('historyList');
  const search = (document.getElementById('historySearch')?.value || '').toLowerCase();
  const filter = document.getElementById('historyFilter')?.value || '';

  let items = emailHistory.filter(h => {
    const matchSearch = !search || h.text.toLowerCase().includes(search) || h.typeLabel.toLowerCase().includes(search);
    const matchFilter = !filter || h.type === filter;
    return matchSearch && matchFilter;
  });

  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">📂</span>No emails found.</div>`;
    return;
  }

  list.innerHTML = items.map(h => `
    <div class="history-item" id="hi_${h.id}">
      <div class="history-meta">
        <span class="history-type">${h.typeLabel}</span>
        <span class="history-date">${formatDate(h.date)} · ${cap(h.tone)} · ${h.mode === 'ai' ? '✨ AI' : '⚡ Offline'}</span>
      </div>
      <div class="history-preview">${h.text}</div>
      <div class="history-actions">
        <button class="copy-btn2" onclick="copyText(\`${escStr(h.text)}\`)">📋 Copy</button>
        <button onclick="loadIntoGenerator(${h.id})">✏️ Load</button>
        <button class="del-btn" onclick="deleteHistory(${h.id})">🗑️ Delete</button>
        ${h.rating ? `<span class="history-star">${'★'.repeat(h.rating)}</span>` : ''}
      </div>
    </div>`).join('');
}

function loadIntoGenerator(id) {
  const h = emailHistory.find(x => x.id === id);
  if (!h) return;
  document.getElementById('senderName').value = h.sender || '';
  document.getElementById('receiverName').value = h.receiver || '';
  document.getElementById('emailType').value = h.type;
  onTypeChange();
  displayEmail(h.text, 'emailBox');
  switchPage('generator');
}

function deleteHistory(id) {
  emailHistory = emailHistory.filter(h => h.id !== id);
  saveHistory();
  updateBadges();
  renderHistory();
}

function clearHistory() {
  if (!confirm('Clear all email history?')) return;
  emailHistory = [];
  saveHistory();
  updateBadges();
  renderHistory();
}

// ─── DRAFTS RENDER ────────────────────────────────────────
function renderDrafts() {
  const list = document.getElementById('draftsList');
  if (!emailDrafts.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">📝</span>No saved drafts.</div>`;
    return;
  }
  list.innerHTML = emailDrafts.map(d => `
    <div class="history-item">
      <div class="history-meta">
        <span class="history-type">${d.typeLabel}</span>
        <span class="history-date">${formatDate(d.date)}</span>
      </div>
      <div class="history-preview">${d.sender ? 'From: ' + d.sender : ''} ${d.extra ? '— ' + d.extra.substring(0,80) : ''}</div>
      <div class="history-actions">
        <button onclick="loadDraft(${JSON.stringify(escObj(d)).replace(/"/g,'&quot;')})">✏️ Load Draft</button>
        <button class="del-btn" onclick="deleteDraft(${d.id})">🗑️ Delete</button>
      </div>
    </div>`).join('');
}

// ─── ANALYTICS RENDER ─────────────────────────────────────
function renderAnalytics() {
  const stats = getStats();
  const histLen = emailHistory.length;
  const avgRating = feedbackData.length ? (feedbackData.reduce((s,f) => s+f.rating, 0) / feedbackData.length).toFixed(1) : '—';

  document.getElementById('analyticsStats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${stats.total}</div><div class="stat-label">Emails Generated</div></div>
    <div class="stat-card"><div class="stat-num">${histLen}</div><div class="stat-label">Saved to History</div></div>
    <div class="stat-card"><div class="stat-num">${feedbackData.length}</div><div class="stat-label">Ratings Given</div></div>
    <div class="stat-card"><div class="stat-num">${avgRating}</div><div class="stat-label">Avg Rating</div></div>
  `;

  const topTypes = Object.entries(stats.types).sort((a,b) => b[1]-a[1]).slice(0,6);
  const maxType  = topTypes[0]?.[1] || 1;
  document.getElementById('typeChart').innerHTML = topTypes.length
    ? topTypes.map(([k,v]) => `<div class="bar-row"><span class="bar-label">${k.replace(/_/g,' ')}</span><div class="bar-track"><div class="bar-fill" style="width:${(v/maxType*100).toFixed(0)}%"></div></div><span class="bar-val">${v}</span></div>`).join('')
    : '<p style="color:var(--muted);font-size:0.84rem">No data yet. Generate some emails!</p>';

  const topTones = Object.entries(stats.tones).sort((a,b) => b[1]-a[1]);
  const maxTone  = topTones[0]?.[1] || 1;
  document.getElementById('toneChart').innerHTML = topTones.length
    ? topTones.map(([k,v]) => `<div class="bar-row"><span class="bar-label">${cap(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${(v/maxTone*100).toFixed(0)}%"></div></div><span class="bar-val">${v}</span></div>`).join('')
    : '<p style="color:var(--muted);font-size:0.84rem">No data yet.</p>';

  const aiCount  = stats.modes.ai || 0;
  const offCount = stats.modes.offline || 0;
  const total    = aiCount + offCount || 1;
  const aiPct    = Math.round(aiCount / total * 100);
  const offPct   = 100 - aiPct;
  const r = 50; const cx = 70; const cy = 70;
  const aiDash   = (aiPct / 100) * 2 * Math.PI * r;
  const offDash  = (offPct / 100) * 2 * Math.PI * r;

  document.getElementById('modeChart').innerHTML = `
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface3)" stroke-width="16"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#8b6ef5" stroke-width="16"
        stroke-dasharray="${aiDash} ${2*Math.PI*r}" stroke-linecap="round"
        transform="rotate(-90 ${cx} ${cy})"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="16"
        stroke-dasharray="${offDash} ${2*Math.PI*r}" stroke-linecap="round"
        transform="rotate(${-90 + aiPct*3.6} ${cx} ${cy})"/>
      <text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="14" fill="var(--text)" font-family="Outfit">${aiPct}%</text>
    </svg>
    <div class="donut-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#8b6ef5"></div>AI Mode (${aiCount})</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--accent)"></div>Offline Mode (${offCount})</div>
    </div>`;
}

// ─── SETTINGS ─────────────────────────────────────────────
function loadSettingsForm() {
  document.getElementById('settingName').value  = currentUser.name;
  document.getElementById('settingEmail').value = currentUser.email;
  document.getElementById('settingTone').value  = currentUser.defaultTone || 'formal';
  document.getElementById('settingMode').value  = currentUser.defaultMode || 'offline';
}

function saveProfile() {
  const name = document.getElementById('settingName').value.trim();
  if (!name) { alert('Name cannot be empty.'); return; }
  const users = getUsers();
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx > -1) { users[idx].name = name; saveUsers(users); }
  currentUser.name = name;
  localStorage.setItem('mc_session', JSON.stringify(currentUser));
  document.getElementById('sidebarName').textContent = name;
  document.getElementById('sidebarAvatar').textContent = name.charAt(0).toUpperCase();
  showToast('Profile saved!');
}

function saveSettings() {
  const tone = document.getElementById('settingTone').value;
  const mode = document.getElementById('settingMode').value;
  const users = getUsers();
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx > -1) { users[idx].defaultTone = tone; users[idx].defaultMode = mode; saveUsers(users); }
  currentUser.defaultTone = tone; currentUser.defaultMode = mode;
  localStorage.setItem('mc_session', JSON.stringify(currentUser));
  setMode(mode);
  selectedTone = tone;
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.toggle('active', b.dataset.tone === tone));
  showToast('Settings saved!');
}

// ─── ADMIN ────────────────────────────────────────────────
function renderAdmin() {
  if (currentUser.role !== 'admin') return;
  const users = getUsers();

  document.getElementById('adminUsersList').innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Credits</th><th>Actions</th></tr></thead>
      <tbody>${users.map(u => `
        <tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td><span class="role-badge role-${u.role}">${u.role}</span></td>
          <td><span class="plan-tag plan-${u.plan || 'free'}">${u.plan || 'free'}</span></td>
          <td>⭐ ${localStorage.getItem('mc_' + u.id + '_credits') || 0}</td>
          <td>
            <button class="action-btn" style="font-size:0.72rem;padding:4px 10px" onclick="adminToggleRole('${u.id}')">Toggle Role</button>
            <button class="action-btn" style="font-size:0.72rem;padding:4px 10px;margin-left:4px;background:#534AB7;color:#fff;border:none" onclick="adminTogglePlan('${u.id}')">Toggle Plan</button>
            ${u.id !== currentUser.id ? `<button class="action-btn clear-btn" style="font-size:0.72rem;padding:4px 10px;margin-left:4px" onclick="adminDeleteUser('${u.id}')">Delete</button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  const allHistory = users.flatMap(u => {
    const stored = localStorage.getItem(`mc_${u.id}_history`);
    return stored ? JSON.parse(stored).map(e => ({...e, userName: u.name})) : [];
  });

  document.getElementById('adminEmailsList').innerHTML = allHistory.length
    ? `<table class="admin-table">
        <thead><tr><th>User</th><th>Type</th><th>Tone</th><th>Mode</th><th>Date</th></tr></thead>
        <tbody>${allHistory.slice(0,50).map(e => `
          <tr>
            <td>${e.userName || '—'}</td>
            <td>${e.typeLabel || e.type}</td>
            <td>${cap(e.tone || '—')}</td>
            <td>${e.mode === 'ai' ? '✨ AI' : '⚡ Offline'}</td>
            <td>${formatDate(e.date)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    : '<p style="color:var(--muted);padding:20px">No emails generated yet.</p>';

  const totalEmails = allHistory.length;
  const aiEmails    = allHistory.filter(e => e.mode === 'ai').length;
  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${users.length}</div><div class="stat-label">Total Users</div></div>
    <div class="stat-card"><div class="stat-num">${totalEmails}</div><div class="stat-label">Total Emails</div></div>
    <div class="stat-card"><div class="stat-num">${aiEmails}</div><div class="stat-label">AI Generated</div></div>
    <div class="stat-card"><div class="stat-num">${totalEmails - aiEmails}</div><div class="stat-label">Offline Generated</div></div>
  `;

  const allFeedback = users.flatMap(u => {
    const stored = localStorage.getItem(`mc_${u.id}_feedback`);
    return stored ? JSON.parse(stored).map(f => ({...f, userName: u.name})) : [];
  });

  document.getElementById('adminFeedbackList').innerHTML = allFeedback.length
    ? allFeedback.slice(0,30).map(f => `
        <div class="history-item">
          <div class="history-meta">
            <span class="history-type">${f.userName}</span>
            <span class="history-date">${formatDate(f.date)}</span>
          </div>
          <div class="history-preview">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)} — "${f.text}"</div>
        </div>`).join('')
    : '<div class="empty-state"><span class="empty-icon">⭐</span>No feedback yet.</div>';
}

function showAdminTab(tab, btn) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('admin-' + tab).classList.remove('hidden');
  btn.classList.add('active');
}

function adminToggleRole(userId) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx > -1) {
    users[idx].role = users[idx].role === 'admin' ? 'user' : 'admin';
    saveUsers(users);
    renderAdmin();
    showToast('Role updated!');
  }
}

function adminTogglePlan(userId) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx > -1) {
    users[idx].plan = (users[idx].plan === 'pro') ? 'free' : 'pro';
    saveUsers(users);
    renderAdmin();
    showToast('Plan updated to ' + users[idx].plan + '!');
  }
}

function adminDeleteUser(userId) {
  if (!confirm('Delete this user?')) return;
  const users = getUsers().filter(u => u.id !== userId);
  saveUsers(users);
  renderAdmin();
  showToast('User deleted.');
}

// ─── TOOL PAGES: IMPROVE ──────────────────────────────────
async function improveEmail() {
  const text = document.getElementById('improveInput').value.trim();
  const goal = document.getElementById('improveGoal').value;
  if (!text) { alert('Please paste an email to improve.'); return; }

  const outEl = document.getElementById('improveOutput');
  showLoadingInEl(outEl);

  const result = await callAITool(
    `You are an expert email editor. ${goal === 'professional' ? 'Make the email more professional.' : goal === 'grammar' ? 'Fix all grammar and spelling errors while preserving meaning.' : goal === 'concise' ? 'Make the email more concise and to the point.' : goal === 'detailed' ? 'Add more detail and depth.' : 'Make the email friendlier and warmer.'} Return only the improved email, no explanation.`,
    'Improve this email:\n\n' + text
  );

  outEl.className = 'email-box';
  outEl.textContent = result;
  saveToAnalytics('improve', 'ai', 'ai');
}

async function convertTone() {
  const text = document.getElementById('toneInput').value.trim();
  const from = document.getElementById('toneFrom').value;
  const to   = document.getElementById('toneTo').value;
  if (!text) { alert('Please paste an email to convert.'); return; }

  const outEl = document.getElementById('toneOutput');
  showLoadingInEl(outEl);

  const result = await callAITool(
    `You are a tone conversion expert. Convert the given email from a ${from} tone to a ${to} tone. Keep the core meaning but completely change the style. Return only the converted email.`,
    text
  );

  outEl.className = 'email-box';
  outEl.textContent = result;
}

async function generateReply() {
  const text   = document.getElementById('replyInput').value.trim();
  const sender = document.getElementById('replySender').value.trim();
  const tone   = document.getElementById('replyTone').value;
  const intent = document.getElementById('replyIntent').value.trim();
  if (!text) { alert('Please paste the received email.'); return; }

  const outEl = document.getElementById('replyOutput');
  showLoadingInEl(outEl);

  const result = await callAITool(
    `You are an expert email reply writer. Write ${tone} replies that sound natural and human.`,
    `Write a reply to this email.\nMy name: ${sender || 'me'}\nMy intent: ${intent || 'Reply appropriately'}\nTone: ${tone}\n\nOriginal email:\n${text}`
  );

  outEl.className = 'email-box';
  outEl.textContent = result;
}

async function summarizeEmail() {
  const text  = document.getElementById('summaryInput').value.trim();
  const style = document.getElementById('summaryStyle').value;
  if (!text) { alert('Please paste an email to summarize.'); return; }

  const outEl = document.getElementById('summaryOutput');
  showLoadingInEl(outEl);

  const prompt = style === 'brief' ? 'Summarize in 2-3 sentences.' : style === 'bullets' ? 'Summarize as bullet points with key information.' : 'Write a detailed summary covering all important points.';

  const result = await callAITool('You are an email summarization expert. ' + prompt + ' Be clear and concise.', 'Summarize:\n\n' + text);

  outEl.className = 'email-box';
  outEl.textContent = result;
}

async function callAITool(system, userMsg) {
  try {
    return await callAI(system, userMsg);
  } catch (err) {
    return 'AI request failed. Please check your connection.\nError: ' + err.message;
  }
}

function saveImproved()      { saveTextToHistory(document.getElementById('improveOutput').textContent, 'improved'); }
function saveToneConverted() { saveTextToHistory(document.getElementById('toneOutput').textContent, 'tone_converted'); }
function saveReply()         { saveTextToHistory(document.getElementById('replyOutput').textContent, 'smart_reply'); }

function saveTextToHistory(text, type) {
  if (!text || text.includes('appears here')) return;
  emailHistory.unshift({ id: Date.now(), text, type, typeLabel: type.replace(/_/g,' '), tone: 'ai', mode: 'ai', date: Date.now(), rating: 0, sender: currentUser.name, receiver: '' });
  saveHistory();
  updateBadges();
  showToast('Saved!');
}

// ─── OFFLINE GENERATOR ───────────────────────────────────
function generateEmailLocally({ sender, receiver, type, typeLabel, tone, extra, dynVals }) {
  const ctx = extra ? smartExpand(extra, type, tone) : '';
  const opener = getOpener(tone, receiver);
  const closing = getClosing(tone, sender);

  switch (type) {
    case 'job_application': case 'resume_submission': case 'cover_letter': {
      const role     = dynVals['Position Applying For'] || 'the advertised position';
      const company  = dynVals['Company Name'] || 'your organization';
      const exp      = dynVals['Years of Experience'] || '';
      const skills   = dynVals['Key Skills'] || '';
      const expStr   = exp ? ` With ${exp} of hands-on experience` : '';
      const skillStr = skills ? `, and expertise in ${skills},` : ',';
      return {
        subject: `Application for ${role} — ${sender}`,
        body: `${opener}\n\nI am writing to express my strong interest in the ${role} position at ${company}.${expStr}${skillStr} ${ctx ? ctx + '.' : 'I am confident in my ability to contribute meaningfully to your team.'}\n\nI have attached my resume for your consideration and would welcome the opportunity to discuss how my background aligns with your needs. I look forward to the possibility of joining ${company}.\n\n${closing}`
      };
    }
    case 'sick_leave': {
      const from   = dynVals['Sick Leave From'] || 'today';
      const to     = dynVals['Expected Return'] || 'shortly';
      const detail = dynVals['Brief Medical Reason'] || 'feeling unwell';
      return {
        subject: `Sick Leave Application — ${sender}`,
        body: `${opener}\n\nI am writing to inform you that I am ${detail} and am unable to come to work from ${from}. I expect to resume by ${to}.\n\n${ctx ? ctx + '\n\n' : ''}I apologize for any inconvenience this may cause and will ensure all pending work is handled upon my return. Please let me know if any urgent matters need attention during my absence.\n\n${closing}`
      };
    }
    case 'leave_application': {
      const from   = dynVals['Leave From Date'] || '';
      const to     = dynVals['Leave To Date'] || '';
      const reason = dynVals['Reason for Leave'] || 'personal reasons';
      return {
        subject: `Leave Application — ${sender}`,
        body: `${opener}\n\nI would like to request leave${from ? ' from ' + from : ''}${to ? ' to ' + to : ''} due to ${reason}.\n\n${ctx ? ctx + '\n\n' : ''}I will ensure all my responsibilities are up to date before my leave and will remain reachable for any urgent matters. I kindly request your approval at the earliest.\n\n${closing}`
      };
    }
    case 'complaint': {
      return {
        subject: `Complaint — ${sender}`,
        body: `${opener}\n\nI am writing to formally bring a matter to your attention that has caused me significant concern.\n\n${ctx || 'I have experienced an issue that I believe requires immediate attention.'}\n\nI trust that you will look into this matter seriously and take the necessary steps to resolve it at the earliest. I look forward to a prompt response.\n\n${closing}`
      };
    }
    case 'thank_you': {
      return {
        subject: `Thank You — ${sender}`,
        body: `${opener}\n\nI wanted to take a moment to express my sincere gratitude${ctx ? ' for ' + ctx : ''}. Your support and kindness truly made a difference, and I deeply appreciate it.\n\nThank you once again — it means more than words can convey.\n\n${closing}`
      };
    }
    case 'meeting_invitation': {
      const date   = dynVals['Meeting Date'] || 'the scheduled date';
      const time   = dynVals['Meeting Time'] || 'the scheduled time';
      const agenda = dynVals['Agenda'] || 'important matters';
      const link   = dynVals['Meeting Link / Venue (Optional)'] || '';
      return {
        subject: `Meeting Invitation — ${agenda}`,
        body: `${opener}\n\nYou are cordially invited to a meeting scheduled on ${date} at ${time}.\n\nAgenda: ${agenda}\n${link ? 'Location/Link: ' + link + '\n' : ''}\n${ctx ? ctx + '\n\n' : ''}Please confirm your availability at the earliest. Your presence and input are valued.\n\n${closing}`
      };
    }
    case 'resignation': {
      const lastDay = dynVals['Last Working Day'] || 'the agreed date';
      const notice  = dynVals['Notice Period'] || '';
      const reason  = dynVals['Brief Reason (Optional)'] || '';
      return {
        subject: `Resignation Letter — ${sender}`,
        body: `${opener}\n\nI am writing to formally tender my resignation from my current position, effective ${lastDay}${notice ? ', serving the agreed notice period of ' + notice : ''}.\n\n${reason ? 'This decision has been made due to ' + reason + '.\n\n' : ''}${ctx ? ctx + '\n\n' : ''}I am grateful for the opportunities, learnings, and experiences I've gained during my tenure. I will ensure a smooth transition of all responsibilities and duties.\n\nThank you for everything.\n\n${closing}`
      };
    }
    case 'friendly_chat': case 'catchup': {
      return {
        subject: `Catching Up — ${sender}`,
        body: `Hey ${receiver},\n\nJust wanted to drop you a quick message${ctx ? ' — ' + ctx : ' — it\'s been a while!'}. Hope everything is going well on your end.\n\nWould love to find time to catch up soon. Let me know when you're free!\n\nTake care,\n${sender}`
      };
    }
    case 'apology': {
      return {
        subject: `Sincere Apology — ${sender}`,
        body: `${opener}\n\nI am writing to sincerely apologize${ctx ? ' for ' + ctx : ' for my actions'}. I understand how this may have affected you and I take full responsibility.\n\nPlease be assured that I am taking steps to ensure this does not happen again. I value our relationship greatly and hope to make things right.\n\n${closing}`
      };
    }
    case 'congratulations': {
      return {
        subject: `Congratulations! — ${sender}`,
        body: `Dear ${receiver},\n\nWarm congratulations on your achievement!${ctx ? ' ' + ctx : ''} This is truly a well-deserved recognition of your hard work and dedication.\n\nWishing you continued success in all that you do!\n\nWith warm regards,\n${sender}`
      };
    }
    case 'birthday': {
      const person = dynVals["Recipient's Full Name"] || receiver;
      return {
        subject: `Happy Birthday, ${person}!`,
        body: `Dear ${person},\n\nWishing you a very Happy Birthday! 🎂${ctx ? '\n\n' + ctx : ''}\n\nHope this year brings you endless joy, good health, and all the happiness you deserve.\n\nWith warm wishes,\n${sender}`
      };
    }
    case 'proposal': {
      return {
        subject: `Proposal — ${sender}`,
        body: `${opener}\n\nI hope this message finds you well. I wanted to reach out to share a proposal I believe could be mutually beneficial.\n\n${ctx || 'Please find the details of the proposal for your consideration.'}\n\nI would welcome the opportunity to discuss this further. Please do let me know a convenient time for a call or meeting.\n\n${closing}`
      };
    }
    default: {
      return {
        subject: `${typeLabel} — ${sender}`,
        body: `${opener}\n\n${ctx || 'I am reaching out regarding the above matter.'}\n\nI would appreciate your attention to this and look forward to your response.\n\n${closing}`
      };
    }
  }
}

function getOpener(tone, receiver) {
  if (tone === 'friendly' || tone === 'casual') return `Hi ${receiver},`;
  if (tone === 'empathetic') return `Dear ${receiver},`;
  return `Dear ${receiver},`;
}

function getClosing(tone, sender) {
  const closings = {
    formal: `Yours faithfully,\n${sender}`,
    polite: `Warm regards,\n${sender}`,
    friendly: `Cheers,\n${sender}`,
    professional: `Best regards,\n${sender}`,
    casual: `Thanks,\n${sender}`,
    empathetic: `With warmth,\n${sender}`,
  };
  return closings[tone] || `Regards,\n${sender}`;
}

function smartExpand(text, emailType, tone) {
  if (!text) return '';
  let t = text.trim();
  t = t.replace(/\bcant\b/gi,"can't").replace(/\bdont\b/gi,"don't")
        .replace(/\bwont\b/gi,"won't").replace(/\bisnt\b/gi,"isn't")
        .replace(/\bhavent\b/gi,"haven't").replace(/\bim\b/gi,"I'm")
        .replace(/\bi\b/g,"I");

  const words = t.split(/\s+/);
  const hasPunct = /[.,!?;]$/.test(t);
  if (words.length > 15 && hasPunct) return t;

  if (/job|application|cover|resume|position|role|apply/i.test(emailType)) {
    if (/software|developer|engineer|designer|manager|analyst|intern|tester|architect/i.test(t)) {
      const role = t.replace(/^(as a|as an|i am a|i am an)\s*/i, '').trim();
      return 'As a ' + role + ', I bring relevant skills and experience that align well with the requirements of this role';
    }
    if (/year[s]?\s*(of\s*)?(experience|exp)/i.test(t)) {
      return 'I have ' + t + ' in this field, which has equipped me with strong practical knowledge';
    }
    if (/skill[s]?|know|expert|proficient/i.test(t)) {
      return 'My expertise includes ' + t + ', which I believe will add significant value to your team';
    }
  }

  if (/sick|leave|absence/i.test(emailType)) {
    t = t.replace(/(\d+)\s*days?\s*rest/gi, (m,n) => n + ' day' + (n>1?'s':'') + ' of complete rest as advised by my doctor');
    t = t.replace(/\bfever\b/gi, 'a fever');
    t = t.replace(/sick\s*yesterday/gi, 'unwell since yesterday');
    t = t.replace(/\bcold\b/gi, 'a severe cold');
    if (words.length <= 6) return 'I have been experiencing ' + t + ' and am currently not in a condition to attend work';
    return t;
  }

  if (/meeting|invitation|schedule/i.test(emailType)) {
    if (words.length <= 6) return 'The agenda for this meeting will include ' + t + ', and your valuable input is needed';
    return t;
  }

  if (/complaint/i.test(emailType)) {
    if (words.length <= 8) return 'I am writing to bring to your attention that ' + t + ', which has caused considerable inconvenience';
    return t;
  }

  if (/thank/i.test(emailType)) {
    if (words.length <= 8) return 'your kind support regarding ' + t + ' has truly made a difference, and I am deeply grateful';
    return t;
  }

  if (/resign/i.test(emailType)) {
    if (words.length <= 8) return 'After careful consideration, ' + t + ' has led me to make this difficult decision';
    return t;
  }

  if (words.length <= 5) return 'I would like to mention that ' + t + ', which I hope you will take into consideration';
  if (words.length <= 10) return 'Additionally, ' + t.charAt(0).toLowerCase() + t.slice(1) + ', and I hope this provides useful context';
  return t;
}

// ─── DISPLAY ─────────────────────────────────────────────
function displayEmail(text, boxId) {
  const box = document.getElementById(boxId);
  box.className = 'email-box';
  box.textContent = '';
  let i = 0;
  const speed = text.length > 600 ? 5 : 9;
  function tick() {
    if (i < text.length) { box.textContent += text[i++]; box.scrollTop = box.scrollHeight; setTimeout(tick, speed); }
  }
  tick();
}

function showLoading(boxId) {
  const box = document.getElementById(boxId);
  box.className = '';
  box.innerHTML = `<div class="loading-state"><div class="loading-dots"><span></span><span></span><span></span></div><div class="loading-label">Writing your email…</div></div>`;
}

function showLoadingInEl(el) {
  el.className = '';
  el.innerHTML = `<div class="loading-state" style="min-height:150px"><div class="loading-dots"><span></span><span></span><span></span></div><div class="loading-label">Processing…</div></div>`;
}

function showEmailBoxError(msg) {
  const box = document.getElementById('emailBox');
  box.className = 'email-box empty';
  box.innerHTML = `<span class="empty-icon">⚠️</span><span>${msg}</span>`;
}

// ─── COPY / CLEAR ─────────────────────────────────────────
function copyEmail() {
  const text = document.getElementById('emailBox').textContent;
  if (!text || document.getElementById('emailBox').classList.contains('empty')) return;
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}

function copyFromEl(id) {
  const text = document.getElementById(id).textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}

function clearAll() {
  ['senderName','receiverName','extraDetails'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  document.getElementById('wordCount').textContent = '0';
  document.getElementById('contextHint').textContent = '';
  document.getElementById('emailType').selectedIndex = 0;
  document.getElementById('dynamicFields').innerHTML = '';
  const box = document.getElementById('emailBox');
  box.className = 'email-box empty';
  box.innerHTML = `<span class="empty-icon">✉️</span><span>Your email will appear here…</span>`;
  document.getElementById('metaBadge').textContent = '—';
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-tone="formal"]').classList.add('active');
  selectedTone = 'formal';
  document.getElementById('scoreCard').classList.add('hidden');
  document.getElementById('feedbackRow').classList.add('hidden');
  document.getElementById('variationsPanel').classList.add('hidden');
  clearError();
}

// ─── ERROR ────────────────────────────────────────────────
function showError(msg) { const el=document.getElementById('errorMsg'); el.textContent=msg; el.style.display='block'; }
function clearError()   { const el=document.getElementById('errorMsg'); el.textContent=''; el.style.display='none'; }

// ─── TOAST ───────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ─── HELPERS ─────────────────────────────────────────────
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function escStr(s) { return (s||'').replace(/`/g,'\\`').replace(/\$/g,'\\$'); }
function escObj(o) { return JSON.parse(JSON.stringify(o, (k,v) => typeof v === 'string' ? v.replace(/"/g,"'") : v)); }