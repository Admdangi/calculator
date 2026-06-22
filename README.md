# 🏛️ Patel Samaj — District Community Portal

A professional, fully responsive community website for district-level caste organizations.
Built with **HTML5 · CSS3 · Bootstrap 5 · JavaScript · PHP 8+ · MySQL**.

---

## 📁 Project Folder Structure

```
community-website/
│
├── index.html              ← Main homepage (frontend)
├── css/
│   └── style.css           ← All custom styles
├── js/
│   └── main.js             ← All JavaScript logic
├── php/
│   ├── config.php          ← DB config + helper functions
│   └── api.php             ← Public-facing API (AJAX)
├── admin/
│   ├── index.html          ← Admin dashboard (frontend)
│   └── api.php             ← Admin CRUD API (secured)
├── uploads/                ← Gallery images (auto-created)
├── admin/uploads/          ← Leader photos (auto-created)
└── sql/
    └── schema.sql          ← Full database schema + seed data
```

---

## ⚙️ Features

| Feature | Status |
|---|---|
| Responsive Homepage (Hero, About, Stats, Leaders) | ✅ |
| Village Directory with Captcha (unique every time) | ✅ |
| Mobile OTP Verification before Registration | ✅ |
| Members List with Search, Pagination, Export (CSV/PDF) | ✅ |
| District Leaders Cards with hover effects | ✅ |
| Head Office with Google Maps | ✅ |
| Animated Statistics Counters | ✅ |
| Photo Gallery with Category Filter | ✅ |
| Contact Form (stores in DB) | ✅ |
| Google Feedback Form embed | ✅ |
| Dark Mode Toggle (remembered) | ✅ |
| WhatsApp Floating Button | ✅ |
| Admin Panel (Login + Full CRUD) | ✅ |
| SQL Injection Protection (PDO prepared statements) | ✅ |
| Session-based Admin Auth | ✅ |

---

## 🗄️ Database Setup

### Step 1 — Create Database

Open **phpMyAdmin** (usually `http://localhost/phpmyadmin`) or MySQL CLI:

```sql
CREATE DATABASE community_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2 — Import Schema

In phpMyAdmin:
1. Click your `community_portal` database
2. Click **Import** tab
3. Choose file: `sql/schema.sql`
4. Click **Go**

OR via terminal:

```bash
mysql -u root -p community_portal < sql/schema.sql
```

This creates all tables AND inserts sample data automatically.

---

## 🔧 Configuration

Open `php/config.php` and edit:

```php
define('DB_HOST', 'localhost');   // Your MySQL host
define('DB_USER', 'root');        // Your MySQL username
define('DB_PASS', '');            // Your MySQL password
define('DB_NAME', 'community_portal');

define('SITE_NAME',     'Patel Samaj');       // Your community name
define('SITE_DISTRICT', 'Indore');            // Your district name

// Replace with your Google Form embed URL for Feedback section:
define('GOOGLE_FORM_LINK', 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?embedded=true');

// WhatsApp number (country code + number, no spaces):
define('WHATSAPP_NUMBER', '919876543210');
```

---

## 🌐 Customization Checklist

Open `index.html` and find/replace:

| Placeholder | Replace With |
|---|---|
| `पटेल समाज` | Your community name in Hindi |
| `Patel Samaj` | Your community name in English |
| `Indore District` | Your district name |
| `INDORE DISTRICT` | Your district (uppercase) |
| `Patel Samaj Bhawan` | Your office name |
| `Near Rajwada, Indore` | Your office address |
| `+91 0731-234567` | Your phone number |
| `info@patelsamaj-indore.org` | Your email |
| `919876543210` | Your WhatsApp number |
| Google Maps iframe URL | Your office location |
| `GOOGLE_FORM_LINK` | Your Google Form embed URL |

---

## 🔑 Admin Panel

### Access
URL: `http://yoursite.com/admin/index.html`

### Demo Login
- Username: `admin`
- Password: `admin123`

### Change Password (Production)
Run this in MySQL to change the admin password:

```sql
UPDATE admin_users
SET password = '$2y$10$YOUR_BCRYPT_HASH_HERE'
WHERE username = 'admin';
```

Generate a bcrypt hash using PHP:
```php
echo password_hash('YourNewPassword', PASSWORD_DEFAULT);
```

---

## 📱 OTP System

Currently in **demo mode** — OTP `123456` always works.

To enable real SMS:

1. Sign up at [MSG91](https://msg91.com/) or [Twilio](https://www.twilio.com/)
2. Open `php/config.php`
3. Replace the `sendOTP()` function with your SMS gateway API call:

```php
function sendOTP(string $mobile, string $otp): bool {
    // Example: MSG91
    $url = "https://api.msg91.com/api/v5/otp";
    $data = [
        'template_id' => 'YOUR_TEMPLATE_ID',
        'mobile'      => '91' . $mobile,
        'authkey'     => 'YOUR_AUTH_KEY',
        'otp'         => $otp,
    ];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
    return true;
}
```

4. Remove the `demo_otp` from the API response (in `php/api.php`, `send_otp` case)

---

## 🖼️ Adding Your Photos / Content

### Gallery Images
- Upload via Admin Panel → Gallery → Upload Image
- OR manually copy image files to `uploads/` folder
- Then add to DB: `INSERT INTO gallery (image, title, category) VALUES ('filename.jpg', 'Title', 'Events');`

### Leader Photos
- Upload via Admin Panel → Leaders → Edit Leader → Upload Photo
- Photos are saved in `admin/uploads/`

---

## 🚀 Deployment on Web Server (Hostinger / cPanel)

1. **Create a database** in cPanel → MySQL Databases
2. **Import `sql/schema.sql`** via phpMyAdmin
3. **Update `php/config.php`** with your live DB credentials
4. **Upload all files** via File Manager or FTP to `public_html/`
5. Visit your domain — done!

---

## 🐙 How to Push to GitHub (Step-by-Step)

### STEP 1 — Install Git
Download from: https://git-scm.com/downloads
After install, open **Git Bash** (Windows) or **Terminal** (Mac/Linux).

---

### STEP 2 — Configure Git (first time only)
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

### STEP 3 — Create a GitHub Account
Go to https://github.com → Sign Up (free)

---

### STEP 4 — Create a New Repository on GitHub
1. Click the **+** button → **New repository**
2. Repository name: `patel-samaj-community-portal`
3. Description: `District level community portal website`
4. Set to **Public** or **Private**
5. Do NOT check "Initialize with README" (we have our own)
6. Click **Create repository**

---

### STEP 5 — Open Your Project Folder
In Git Bash / Terminal, navigate to your project folder:

```bash
cd C:/xampp/htdocs/community-website
# (adjust path to where you saved the files)
```

---

### STEP 6 — Initialize Git & Push

```bash
# Initialize git in your project folder
git init

# Stage all files
git add .

# First commit
git commit -m "Initial commit: Complete community portal website"

# Connect to your GitHub repository (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/patel-samaj-community-portal.git

# Push to GitHub
git branch -M main
git push -u origin main
```

GitHub will ask for your **username** and **password** (use a Personal Access Token as password).

---

### STEP 7 — Get a Personal Access Token (PAT)
*(GitHub no longer accepts plain passwords)*

1. GitHub → Settings → Developer Settings
2. Personal Access Tokens → Tokens (classic)
3. Generate new token → check **repo** scope
4. Copy the token — use it as your password when git asks

---

### STEP 8 — Future Updates

Whenever you make changes:

```bash
git add .
git commit -m "Updated village directory section"
git push
```

---

### STEP 9 — Create `.gitignore`
Create a file named `.gitignore` in your project root:

```
# Ignore uploaded files (large binary files)
uploads/
admin/uploads/

# Ignore PHP config with DB passwords in production
# php/config.php

# IDE files
.vscode/
.idea/
*.DS_Store
Thumbs.db
```

---

## 📦 Local Development (XAMPP / WAMP)

1. Install **XAMPP** from https://www.apachefriends.org/
2. Copy project folder to `C:/xampp/htdocs/community-website/`
3. Start **Apache** and **MySQL** from XAMPP Control Panel
4. Open browser: `http://localhost/community-website/`
5. Admin panel: `http://localhost/community-website/admin/`

---

## 🔒 Security Notes

- All DB queries use **PDO prepared statements** (SQL injection safe)
- Admin panel is **session-protected**
- Passwords are **bcrypt hashed**
- File uploads are **type-validated**
- OTP expires in **10 minutes**
- Input is **sanitized** via `htmlspecialchars()`

---

## 📞 Support

For queries about this portal, contact the community admin at:
`info@patelsamaj-indore.org`

---

*Made with ❤️ for Patel Samaj, Indore District*
