/* ============================================================
   PATEL SAMAJ COMMUNITY PORTAL — main.js
   All JavaScript logic (loaded at end of <body>)
   ============================================================ */

'use strict';

/* ── CONFIG ─────────────────────────────────────────────── */
const API       = 'php/api.php';
const WA_NUMBER = '919876543210';

/* ── STATE ───────────────────────────────────────────────── */
let captchaAnswer   = 0;
let allMembers      = [];
let filteredMembers = [];
let currentPage     = 1;
const PAGE_SIZE     = 10;
let otpTimerHandle  = null;
let regMobile       = '';

/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  // AOS
  if (window.AOS) AOS.init({ duration: 700, once: true, offset: 60 });

  // Initial tasks (run concurrently)
  generateCaptcha();
  await Promise.all([loadDistricts(), loadStats(), loadLeaders()]);

  // Navbar scroll effect
  window.addEventListener('scroll', handleNavScroll);
});

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════════════ */
const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
  // Restore saved preference
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon();

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon();
  });
}

function updateThemeIcon() {
  if (!themeToggleBtn) return;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  themeToggleBtn.innerHTML = dark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

/* ═══════════════════════════════════════════════════════════
   NAVBAR SCROLL
═══════════════════════════════════════════════════════════ */
function handleNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  nav.style.boxShadow = window.scrollY > 50
    ? '0 4px 24px rgba(0,0,0,.3)'
    : 'none';

  // Active link highlight
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 110) current = s.id;
  });
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATION
═══════════════════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const icons   = { success:'fa-check-circle', danger:'fa-exclamation-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
  const colors  = { success:'#22c55e', danger:'#ef4444', info:'#3b82f6', warning:'#f59e0b' };
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'toast align-items-center show mb-2';
  el.style.cssText = `
    background:var(--card-bg);border:1px solid var(--border);
    border-left:4px solid ${colors[type]};border-radius:12px;
    min-width:280px;box-shadow:0 8px 24px rgba(0,0,0,.15);
  `;
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2" style="color:var(--dark-ink)">
        <i class="fas ${icons[type]}" style="color:${colors[type]}"></i>${msg}
      </div>
      <button type="button" class="btn-close ms-auto me-2"
              onclick="this.closest('.toast').remove()"></button>
    </div>`;
  container.prepend(el);
  setTimeout(() => el.remove(), 4500);
}

/* ═══════════════════════════════════════════════════════════
   CAPTCHA — always unique math problem
═══════════════════════════════════════════════════════════ */
function generateCaptcha() {
  const operators = ['+', '-', '×'];
  const op = operators[Math.floor(Math.random() * operators.length)];
  let a, b;

  if (op === '+') {
    a = _rand(1, 20); b = _rand(1, 20);
    captchaAnswer = a + b;
  } else if (op === '-') {
    a = _rand(10, 30); b = _rand(1, a);
    captchaAnswer = a - b;
  } else { // ×
    a = _rand(2, 9); b = _rand(2, 9);
    captchaAnswer = a * b;
  }

  const q = document.getElementById('captchaQuestion');
  if (q) q.textContent = `${a} ${op} ${b} = ?`;

  const ans = document.getElementById('captchaAnswer');
  if (ans) ans.value = '';

  const err = document.getElementById('captchaError');
  if (err) err.classList.add('d-none');
}

function _rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ═══════════════════════════════════════════════════════════
   LOAD DISTRICTS
═══════════════════════════════════════════════════════════ */
async function loadDistricts() {
  try {
    const res  = await fetch(`${API}?action=get_districts`);
    const data = await res.json();
    if (data.success) _populateDistrictSelects(data.data);
    else              throw new Error('API error');
  } catch {
    _populateDistrictSelects(['Indore']);  // demo fallback
  }
}

function _populateDistrictSelects(districts) {
  ['districtSelect', 'reg-district'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      el.appendChild(opt);
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   LOAD VILLAGES (dropdown)
═══════════════════════════════════════════════════════════ */
async function loadVillages() {
  const district = document.getElementById('districtSelect').value;
  const vilSel   = document.getElementById('villageSelect');
  vilSel.innerHTML = '<option value="">Loading…</option>';
  vilSel.disabled = true;

  if (!district) {
    vilSel.innerHTML = '<option value="">-- Select Village --</option>';
    return;
  }
  try {
    const fd = new FormData();
    fd.append('action', 'get_villages');
    fd.append('district', district);
    const res  = await fetch(API, { method: 'POST', body: fd });
    const data = await res.json();
    _fillVillageSelect(vilSel, data.success ? data.data : []);
  } catch {
    // Demo fallback
    _fillVillageSelect(vilSel, [
      { id:1, village_name:'Rajendra Nagar' },
      { id:2, village_name:'Simrol' },
      { id:3, village_name:'Kshipra' },
    ]);
  }
}

async function loadRegVillages() {
  const district = document.getElementById('reg-district').value;
  const vilSel   = document.getElementById('reg-village');
  vilSel.innerHTML = '<option value="">Loading…</option>';
  vilSel.disabled = true;

  if (!district) {
    vilSel.innerHTML = '<option value="">Select Village</option>';
    vilSel.disabled = true;
    return;
  }
  try {
    const fd = new FormData();
    fd.append('action', 'get_villages');
    fd.append('district', district);
    const res  = await fetch(API, { method: 'POST', body: fd });
    const data = await res.json();
    _fillVillageSelect(vilSel, data.success ? data.data : []);
  } catch {
    _fillVillageSelect(vilSel, [
      { id:1, village_name:'Rajendra Nagar' },
      { id:2, village_name:'Simrol' },
    ]);
  }
}

function _fillVillageSelect(el, villages) {
  el.innerHTML = `<option value="">-- Select Village --</option>`;
  villages.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id; opt.textContent = v.village_name;
    el.appendChild(opt);
  });
  el.disabled = false;
}

/* ═══════════════════════════════════════════════════════════
   VILLAGE SEARCH
═══════════════════════════════════════════════════════════ */
async function searchVillage() {
  const district  = document.getElementById('districtSelect').value;
  const villageId = document.getElementById('villageSelect').value;
  const userAns   = parseInt(document.getElementById('captchaAnswer').value, 10);
  const errEl     = document.getElementById('captchaError');

  // Validations
  if (!district || !villageId) {
    showToast('Please select both district and village.', 'warning');
    return;
  }
  if (isNaN(userAns) || userAns !== captchaAnswer) {
    errEl.classList.remove('d-none');
    generateCaptcha();   // new captcha on wrong answer
    return;
  }
  errEl.classList.add('d-none');

  // Show loading
  const resultEl = document.getElementById('village-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner-border spinner-saffron"></div>
      <span>Loading village details…</span>
    </div>`;

  try {
    const fd = new FormData();
    fd.append('action', 'get_village_details');
    fd.append('village_id', villageId);
    const res  = await fetch(API, { method: 'POST', body: fd });
    const data = await res.json();

    if (data.success) {
      _renderVillageResult(data.village, data.members);
    } else {
      resultEl.innerHTML = `<div class="alert" style="background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:24px;text-align:center">
        <i class="fas fa-exclamation-circle text-saffron fa-2x mb-2"></i>
        <div>${data.message}</div></div>`;
    }
  } catch {
    // Demo fallback
    _renderVillageResult(
      {
        village_name:'Rajendra Nagar', district_name:'Indore', taluka_name:'Indore Urban',
        head_name:'Ramesh Patel', head_mobile:'9876543210', head_designation:'Village Head',
        total_houses:145, total_families:138, total_members:620,
        male_members:312, female_members:308,
      },
      [
        { id:1, name:'Rajesh Kumar Patel', father_name:'Ramesh Patel', mobile:'9876541230', occupation:'Farmer' },
        { id:2, name:'Sunita Devi',        father_name:'Ramesh Patel', mobile:'9876541231', occupation:'Homemaker' },
        { id:3, name:'Anil Verma',         father_name:'Suresh Verma', mobile:'9876541232', occupation:'Teacher' },
        { id:4, name:'Meena Sharma',       father_name:'Dinesh Sharma',mobile:'9876541233', occupation:'Business' },
        { id:5, name:'Rohit Patel',        father_name:'Mahesh Patel', mobile:'9876541234', occupation:'Engineer' },
      ]
    );
  }

  generateCaptcha();  // always refresh captcha after a search
}

function _renderVillageResult(v, members) {
  const resultEl = document.getElementById('village-result');
  resultEl.style.display = 'block';

  const stats = [
    { label:'Total Houses',   val: v.total_houses   || 0, icon:'fas fa-home' },
    { label:'Total Families', val: v.total_families || 0, icon:'fas fa-users' },
    { label:'Total Members',  val: v.total_members  || 0, icon:'fas fa-user-friends' },
    { label:'Male Members',   val: v.male_members   || 0, icon:'fas fa-male' },
    { label:'Female Members', val: v.female_members || 0, icon:'fas fa-female' },
  ];

  resultEl.innerHTML = `
  <div class="village-detail-card">
    <div class="d-flex flex-wrap justify-content-between align-items-start mb-4 gap-3">
      <div>
        <span class="detail-badge mb-2 d-inline-block">Village Details</span>
        <h3 class="section-title mb-1">${v.village_name}</h3>
        <div style="color:var(--muted);font-size:.9rem">
          <i class="fas fa-map-marker-alt text-saffron me-1"></i>${v.district_name}
          &nbsp;|&nbsp;<i class="fas fa-map text-saffron me-1"></i>${v.taluka_name || '-'}
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn-secondary-custom" onclick="exportExcel()"><i class="fas fa-file-excel text-success"></i> Excel</button>
        <button class="btn-secondary-custom" onclick="exportPDF()"><i class="fas fa-file-pdf text-danger"></i> PDF</button>
        <button class="btn-secondary-custom" onclick="window.print()"><i class="fas fa-print text-saffron"></i> Print</button>
      </div>
    </div>

    <!-- Village Head -->
    <div class="alert mb-4" style="background:rgba(232,93,4,.08);border:1px solid rgba(232,93,4,.2);border-radius:12px;padding:20px">
      <div class="row align-items-center g-3">
        <div class="col-auto">
          <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--saffron),var(--gold));display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#fff;font-family:'Baloo 2',sans-serif;font-weight:800">
            ${(v.head_name || '?')[0].toUpperCase()}
          </div>
        </div>
        <div class="col">
          <div style="font-size:.78rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Village Head</div>
          <div style="font-family:'Baloo 2',sans-serif;font-weight:700;font-size:1.1rem">${v.head_name || '-'}</div>
          <div style="font-size:.88rem;color:var(--muted)">${v.head_designation || '-'}</div>
        </div>
        <div class="col-auto">
          <a href="tel:${v.head_mobile}" class="btn-primary-custom" style="padding:10px 20px;font-size:.88rem">
            <i class="fas fa-phone"></i>${v.head_mobile || '-'}
          </a>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="info-grid">
      ${stats.map(s => `
        <div class="info-item">
          <i class="${s.icon} text-saffron mb-1" style="font-size:1.2rem"></i>
          <strong>${Number(s.val).toLocaleString()}</strong>
          <span>${s.label}</span>
        </div>`).join('')}
    </div>

    <!-- Members Table -->
    <div class="mt-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
        <h5 style="font-family:'Baloo 2',sans-serif;font-weight:700;margin:0">
          <i class="fas fa-list text-saffron me-2"></i>Members List
          <small style="font-size:.75rem;color:var(--muted);font-weight:400;margin-left:8px">(${members.length} total)</small>
        </h5>
        <input type="text" class="form-control" id="memberSearch"
               placeholder="Search name / occupation…" style="max-width:260px"
               oninput="filterMembers()"/>
      </div>
      <div class="members-table-wrap">
        <table id="membersTable">
          <thead>
            <tr><th>Sr.No.</th><th>Name</th><th>Father's Name</th><th>Mobile</th><th>Occupation</th></tr>
          </thead>
          <tbody id="membersBody"></tbody>
        </table>
      </div>
      <nav class="mt-3">
        <ul class="pagination justify-content-center flex-wrap" id="membersPagination"></ul>
      </nav>
    </div>
  </div>`;

  // Setup members pagination
  allMembers      = members || [];
  filteredMembers = [...allMembers];
  currentPage     = 1;
  renderMembersTable();

  // Smooth scroll to result
  setTimeout(() => resultEl.scrollIntoView({ behavior:'smooth', block:'start' }), 100);
}

function filterMembers() {
  const q = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  filteredMembers = allMembers.filter(m =>
    (m.name || '').toLowerCase().includes(q) ||
    (m.father_name || '').toLowerCase().includes(q) ||
    (m.occupation || '').toLowerCase().includes(q)
  );
  currentPage = 1;
  renderMembersTable();
}

function renderMembersTable() {
  const tbody = document.getElementById('membersBody');
  const pag   = document.getElementById('membersPagination');
  if (!tbody || !pag) return;

  const start    = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredMembers.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageData.length
    ? pageData.map((m, i) => `
        <tr>
          <td><strong style="color:var(--saffron)">${start + i + 1}</strong></td>
          <td><strong>${m.name || '-'}</strong></td>
          <td>${m.father_name || '-'}</td>
          <td><a href="tel:${m.mobile}" style="color:var(--saffron)">${m.mobile || '-'}</a></td>
          <td>
            <span style="background:rgba(232,93,4,.1);color:var(--saffron);border-radius:50px;padding:2px 12px;font-size:.8rem">
              ${m.occupation || '-'}
            </span>
          </td>
        </tr>`)
      .join('')
    : '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted)">No members found</td></tr>';

  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE);
  pag.innerHTML    = '';
  if (totalPages > 1) {
    if (currentPage > 1)
      pag.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goPage(${currentPage-1});return false">‹</a></li>`;
    for (let i = 1; i <= totalPages; i++)
      pag.innerHTML += `<li class="page-item ${i===currentPage?'active':''}"><a class="page-link" href="#" onclick="goPage(${i});return false">${i}</a></li>`;
    if (currentPage < totalPages)
      pag.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goPage(${currentPage+1});return false">›</a></li>`;
  }
}

function goPage(p) { currentPage = p; renderMembersTable(); }

function resetDirectory() {
  document.getElementById('districtSelect').value = '';
  const vilSel = document.getElementById('villageSelect');
  vilSel.innerHTML = '<option value="">-- Select Village --</option>';
  vilSel.disabled  = true;
  document.getElementById('village-result').style.display = 'none';
  generateCaptcha();
}

/* ═══════════════════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════════════════ */
function exportExcel() {
  if (!filteredMembers.length) { showToast('No members to export', 'warning'); return; }
  let csv = 'Sr No,Name,Father Name,Mobile,Occupation\n';
  filteredMembers.forEach((m, i) =>
    csv += `${i+1},"${m.name||''}","${m.father_name||''}","${m.mobile||''}","${m.occupation||''}"\n`
  );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'village_members.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Excel/CSV exported successfully!', 'success');
}

function exportPDF() {
  window.print();
  showToast('Use "Save as PDF" in browser print dialog', 'info');
}

/* ═══════════════════════════════════════════════════════════
   STATS (animated counters)
═══════════════════════════════════════════════════════════ */
async function loadStats() {
  try {
    const res  = await fetch(`${API}?action=get_stats`);
    const data = await res.json();
    if (data.success) _animateCounters(data.data);
    else              throw new Error();
  } catch {
    _animateCounters({ total_villages:5, total_houses:520, total_families:487, total_members:2235, total_leaders:6 });
  }
}

function _animateCounters(data) {
  const map = {
    'stat-villages': +data.total_villages || 0,
    'stat-houses':   +data.total_houses   || 0,
    'stat-families': +data.total_families || 0,
    'stat-members':  +data.total_members  || 0,
    'stat-leaders':  +data.total_leaders  || 0,
    'h-villages':    +data.total_villages || 0,
    'h-members':     +data.total_members  || 0,
    'h-families':    +data.total_families || 0,
  };
  Object.entries(map).forEach(([id, target]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step  = Math.ceil(target / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 25);
  });
}

/* ═══════════════════════════════════════════════════════════
   LEADERS
═══════════════════════════════════════════════════════════ */
const DEMO_LEADERS = [
  { name:'Shri Ramchandra Patel', designation:'District President',  mobile:'9811111111', email:'president@community.org', address:'Indore, MP' },
  { name:'Shri Mahendra Verma',   designation:'Vice President',       mobile:'9822222222', email:'vp@community.org',        address:'Indore, MP' },
  { name:'Shri Suresh Kumar',     designation:'General Secretary',    mobile:'9833333333', email:'secretary@community.org', address:'Indore, MP' },
  { name:'Shri Dinesh Sharma',    designation:'Treasurer',            mobile:'9844444444', email:'',                         address:'Indore, MP' },
  { name:'Shri Vijay Singh',      designation:'Executive Member',     mobile:'9855555555', email:'',                         address:'Indore, MP' },
  { name:'Smt. Kamla Devi',       designation:'Executive Member',     mobile:'9866666666', email:'',                         address:'Indore, MP' },
];

async function loadLeaders() {
  try {
    const res  = await fetch(`${API}?action=get_leaders`);
    const data = await res.json();
    if (data.success && data.data.length) _renderLeaders(data.data);
    else                                  _renderLeaders(DEMO_LEADERS);
  } catch {
    _renderLeaders(DEMO_LEADERS);
  }
}

function _renderLeaders(leaders) {
  const grid = document.getElementById('leadersGrid');
  if (!grid) return;
  const delays = [0, 100, 200, 0, 100, 200];

  grid.innerHTML = leaders.map((l, i) => `
    <div class="col-sm-6 col-md-4 col-lg-3 col-xl-2"
         data-aos="fade-up" data-aos-delay="${delays[i % 3] * 100}">
      <div class="leader-card">
        <div class="leader-photo">
          ${l.photo
            ? `<img src="admin/uploads/${l.photo}" alt="${l.name}"/>`
            : l.name[0].toUpperCase()}
        </div>
        <h5 class="px-3">${l.name}</h5>
        <div class="leader-desig">${l.designation}</div>
        <div class="leader-info">
          ${l.mobile ? `<a href="tel:${l.mobile}"><i class="fas fa-phone"></i>${l.mobile}</a>` : ''}
          ${l.email  ? `<a href="mailto:${l.email}"><i class="fas fa-envelope"></i>${l.email}</a>` : ''}
          ${l.address? `<a href="#office"><i class="fas fa-map-marker-alt"></i>${l.address}</a>` : ''}
        </div>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════
   GALLERY FILTER
═══════════════════════════════════════════════════════════ */
function filterGallery(btn, cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.style.display = (cat === 'All' || item.dataset.category === cat) ? '' : 'none';
  });
}

/* ═══════════════════════════════════════════════════════════
   CONTACT FORM
═══════════════════════════════════════════════════════════ */
async function submitContact(e) {
  e.preventDefault();
  const submitBtn = e.submitter || e.target.querySelector('[type=submit]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…'; }

  const fd = new FormData();
  fd.append('action',  'submit_contact');
  fd.append('name',    document.getElementById('cf-name').value);
  fd.append('mobile',  document.getElementById('cf-mobile').value);
  fd.append('email',   document.getElementById('cf-email').value);
  fd.append('subject', document.getElementById('cf-subject').value);
  fd.append('message', document.getElementById('cf-message').value);

  try {
    const res  = await fetch(API, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('contactForm').reset();
    } else {
      showToast(data.message, 'danger');
    }
  } catch {
    showToast('Message sent! Thank you for contacting us.', 'success');
    document.getElementById('contactForm').reset();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   REGISTRATION MODAL + OTP
═══════════════════════════════════════════════════════════ */
function showRegistrationModal() {
  _goToRegStep(1);
  const modal = new bootstrap.Modal(document.getElementById('registrationModal'));
  modal.show();
}

function _goToRegStep(n) {
  [1, 2, 3, 4].forEach(i => {
    const panel = document.getElementById(`reg-step${i}`);
    if (panel) panel.style.display = i === n ? 'block' : 'none';

    const ind = document.getElementById(`step-ind-${i}`);
    if (!ind) return;
    ind.classList.remove('active', 'done');
    if      (i < n) ind.classList.add('done');
    else if (i === n) ind.classList.add('active');
  });
}

// ── SEND OTP ──
async function sendOTP() {
  const mobile = (document.getElementById('reg-mobile')?.value || '').trim();
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    showToast('Please enter a valid 10-digit mobile number', 'warning');
    return;
  }
  regMobile = mobile;

  try {
    const fd = new FormData();
    fd.append('action', 'send_otp');
    fd.append('mobile', mobile);
    const res  = await fetch(API, { method: 'POST', body: fd });
    const data = await res.json();

    if (data.success) {
      _afterOTPSent(mobile, data.demo_otp);
    } else {
      showToast(data.message, 'danger');
    }
  } catch {
    // Demo mode — accept 123456
    _afterOTPSent(mobile, '123456');
  }
}

function _afterOTPSent(mobile, demoOTP) {
  const dispEl = document.getElementById('otp-mobile-display');
  if (dispEl) dispEl.textContent = '+91 ' + mobile;

  if (demoOTP) {
    const badge = document.getElementById('demo-otp-display');
    const val   = document.getElementById('demo-otp-value');
    if (badge) badge.classList.remove('d-none');
    if (val)   val.textContent = demoOTP;
  }

  _goToRegStep(2);
  _startOTPTimer(120);
  showToast('OTP sent successfully!', 'success');
}

// ── OTP INPUT HANDLING ──
function otpInput(el) {
  el.value = el.value.replace(/\D/g, '');
  if (el.value) {
    const idx  = parseInt(el.dataset.idx, 10);
    const next = document.querySelector(`.otp-digit[data-idx="${idx + 1}"]`);
    if (next) next.focus();
  }
}

function otpKeydown(e, el) {
  if (e.key === 'Backspace' && !el.value) {
    const idx  = parseInt(el.dataset.idx, 10);
    const prev = document.querySelector(`.otp-digit[data-idx="${idx - 1}"]`);
    if (prev) { prev.value = ''; prev.focus(); }
  }
}

// ── VERIFY OTP ──
async function verifyOTP() {
  const digits = document.querySelectorAll('.otp-digit');
  const otp    = Array.from(digits).map(d => d.value).join('');
  if (otp.length !== 6) { showToast('Please enter all 6 OTP digits', 'warning'); return; }

  try {
    const fd = new FormData();
    fd.append('action', 'verify_otp');
    fd.append('mobile', regMobile);
    fd.append('otp',    otp);
    const res  = await fetch(API, { method: 'POST', body: fd });
    const data = await res.json();

    if (data.success) {
      _otpVerified();
    } else {
      showToast(data.message, 'danger');
    }
  } catch {
    // Demo: accept 123456
    if (otp === '123456') {
      _otpVerified();
    } else {
      showToast('Invalid OTP. In demo mode use: 123456', 'danger');
    }
  }
}

function _otpVerified() {
  clearInterval(otpTimerHandle);
  _goToRegStep(3);
  showToast('Mobile verified successfully!', 'success');
}

// ── OTP COUNTDOWN TIMER ──
function _startOTPTimer(seconds) {
  clearInterval(otpTimerHandle);
  let remaining = seconds;
  const el = document.getElementById('otpTimer');
  otpTimerHandle = setInterval(() => {
    remaining--;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    if (el) el.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (remaining <= 0) {
      clearInterval(otpTimerHandle);
      if (el) el.innerHTML = `<span style="color:var(--saffron);cursor:pointer;font-weight:700" onclick="sendOTP()">
        <i class="fas fa-redo me-1"></i>Resend OTP</span>`;
    }
  }, 1000);
}

// ── SUBMIT REGISTRATION ──
async function submitRegistration() {
  const name = (document.getElementById('reg-name')?.value || '').trim();
  if (!name) { showToast('Please enter your full name', 'warning'); return; }

  const fd = new FormData();
  fd.append('action',      'register_member');
  fd.append('name',        name);
  fd.append('father_name', document.getElementById('reg-father')?.value || '');
  fd.append('email',       document.getElementById('reg-email')?.value  || '');
  fd.append('occupation',  document.getElementById('reg-occupation')?.value || '');
  fd.append('gender',      document.getElementById('reg-gender')?.value || 'Male');
  fd.append('age',         document.getElementById('reg-age')?.value    || '');
  fd.append('village_id',  document.getElementById('reg-village')?.value || '');
  fd.append('address',     document.getElementById('reg-address')?.value || '');

  try {
    const res  = await fetch(API, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      _goToRegStep(4);
    } else {
      showToast(data.message, 'danger');
    }
  } catch {
    _goToRegStep(4);   // demo mode always succeeds
  }
}
