<?php
// ============================================================
// DATABASE CONFIGURATION
// ============================================================
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'community_portal');
define('DB_CHARSET', 'utf8mb4');

// Site Configuration
define('SITE_NAME', 'Patel Samaj');
define('SITE_DISTRICT', 'Indore');
define('SITE_TAGLINE', 'Indore District Patel Samaj Community Portal');
define('GOOGLE_FORM_LINK', 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?embedded=true');
define('WHATSAPP_NUMBER', '919876543210');

// Security
define('ADMIN_SESSION_KEY', 'community_admin_logged_in');
define('OTP_EXPIRY_MINUTES', 10);

// Create PDO connection
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Database connection failed.']));
        }
    }
    return $pdo;
}

// Sanitize input
function sanitize(string $input): string {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

// Generate OTP
function generateOTP(): string {
    return str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
}

// Send OTP (mock - integrate with SMS gateway)
function sendOTP(string $mobile, string $otp): bool {
    // TODO: Integrate with SMS gateway (e.g., MSG91, Twilio)
    // For demo, OTP is returned in response
    error_log("OTP for $mobile: $otp");
    return true;
}

// Start session safely
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
