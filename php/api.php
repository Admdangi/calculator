<?php
require_once 'config.php';
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

$action = sanitize($_POST['action'] ?? $_GET['action'] ?? '');

switch ($action) {

    // ── GET DISTRICTS ──────────────────────────────────────────
    case 'get_districts':
        $db = getDB();
        $stmt = $db->query("SELECT DISTINCT district_name FROM villages ORDER BY district_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_COLUMN)]);
        break;

    // ── GET VILLAGES BY DISTRICT ───────────────────────────────
    case 'get_villages':
        $district = sanitize($_POST['district'] ?? '');
        if (!$district) { echo json_encode(['success' => false, 'message' => 'District required']); break; }
        $db = getDB();
        $stmt = $db->prepare("SELECT id, village_name FROM villages WHERE district_name = ? ORDER BY village_name");
        $stmt->execute([$district]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    // ── GET VILLAGE DETAILS ────────────────────────────────────
    case 'get_village_details':
        $village_id = (int)($_POST['village_id'] ?? 0);
        if (!$village_id) { echo json_encode(['success' => false, 'message' => 'Village ID required']); break; }
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM villages WHERE id = ?");
        $stmt->execute([$village_id]);
        $village = $stmt->fetch();
        if (!$village) { echo json_encode(['success' => false, 'message' => 'Village not found']); break; }
        
        $mstmt = $db->prepare("SELECT id, name, father_name, mobile, occupation FROM members WHERE village_id = ?");
        $mstmt->execute([$village_id]);
        $members = $mstmt->fetchAll();
        
        echo json_encode(['success' => true, 'village' => $village, 'members' => $members]);
        break;

    // ── GET LEADERS ────────────────────────────────────────────
    case 'get_leaders':
        $db = getDB();
        $stmt = $db->query("SELECT * FROM district_leaders WHERE is_active=1 ORDER BY sort_order");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    // ── GET STATS ──────────────────────────────────────────────
    case 'get_stats':
        $db = getDB();
        $stats = $db->query("SELECT COUNT(*) as total_villages, SUM(total_houses) as total_houses, SUM(total_families) as total_families, SUM(total_members) as total_members FROM villages")->fetch();
        $leaders = $db->query("SELECT COUNT(*) as cnt FROM district_leaders WHERE is_active=1")->fetchColumn();
        $stats['total_leaders'] = $leaders;
        echo json_encode(['success' => true, 'data' => $stats]);
        break;

    // ── SEND OTP ───────────────────────────────────────────────
    case 'send_otp':
        $mobile = sanitize($_POST['mobile'] ?? '');
        if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            echo json_encode(['success' => false, 'message' => 'Invalid mobile number']);
            break;
        }
        $db = getDB();
        // Invalidate old OTPs
        $db->prepare("UPDATE otp_verifications SET is_used=1 WHERE mobile=? AND is_used=0")->execute([$mobile]);
        
        $otp = generateOTP();
        $expires = date('Y-m-d H:i:s', strtotime('+' . OTP_EXPIRY_MINUTES . ' minutes'));
        $db->prepare("INSERT INTO otp_verifications (mobile, otp, expires_at) VALUES (?,?,?)")->execute([$mobile, $otp, $expires]);
        
        sendOTP($mobile, $otp);
        
        // FOR DEMO: return OTP (remove in production)
        echo json_encode(['success' => true, 'message' => 'OTP sent successfully', 'demo_otp' => $otp]);
        break;

    // ── VERIFY OTP ─────────────────────────────────────────────
    case 'verify_otp':
        $mobile = sanitize($_POST['mobile'] ?? '');
        $otp    = sanitize($_POST['otp'] ?? '');
        if (!$mobile || !$otp) { echo json_encode(['success' => false, 'message' => 'Mobile and OTP required']); break; }
        
        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM otp_verifications WHERE mobile=? AND otp=? AND is_used=0 AND expires_at > NOW()");
        $stmt->execute([$mobile, $otp]);
        $record = $stmt->fetch();
        
        if (!$record) {
            echo json_encode(['success' => false, 'message' => 'Invalid or expired OTP']);
            break;
        }
        $db->prepare("UPDATE otp_verifications SET is_used=1 WHERE id=?")->execute([$record['id']]);
        $_SESSION['otp_verified_mobile'] = $mobile;
        echo json_encode(['success' => true, 'message' => 'OTP verified successfully']);
        break;

    // ── REGISTER MEMBER ────────────────────────────────────────
    case 'register_member':
        $mobile = $_SESSION['otp_verified_mobile'] ?? '';
        if (!$mobile) { echo json_encode(['success' => false, 'message' => 'OTP not verified']); break; }
        
        $data = [
            'village_id'  => (int)($_POST['village_id'] ?? 0),
            'name'        => sanitize($_POST['name'] ?? ''),
            'father_name' => sanitize($_POST['father_name'] ?? ''),
            'mobile'      => $mobile,
            'email'       => sanitize($_POST['email'] ?? ''),
            'occupation'  => sanitize($_POST['occupation'] ?? ''),
            'gender'      => sanitize($_POST['gender'] ?? 'Male'),
            'age'         => (int)($_POST['age'] ?? 0),
            'address'     => sanitize($_POST['address'] ?? ''),
        ];
        
        if (!$data['name']) { echo json_encode(['success' => false, 'message' => 'Name is required']); break; }
        
        $db = getDB();
        // Check if already registered
        $existing = $db->prepare("SELECT id FROM registered_users WHERE mobile=?");
        $existing->execute([$mobile]);
        if ($existing->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Mobile number already registered']);
            break;
        }
        
        $stmt = $db->prepare("INSERT INTO registered_users (village_id, name, father_name, mobile, email, occupation, gender, age, address) VALUES (?,?,?,?,?,?,?,?,?)");
        $stmt->execute(array_values($data));
        unset($_SESSION['otp_verified_mobile']);
        echo json_encode(['success' => true, 'message' => 'Registration successful! Awaiting admin approval.']);
        break;

    // ── SUBMIT CONTACT ─────────────────────────────────────────
    case 'submit_contact':
        $data = [
            'name'    => sanitize($_POST['name'] ?? ''),
            'mobile'  => sanitize($_POST['mobile'] ?? ''),
            'email'   => sanitize($_POST['email'] ?? ''),
            'subject' => sanitize($_POST['subject'] ?? ''),
            'message' => sanitize($_POST['message'] ?? ''),
        ];
        if (!$data['name'] || !$data['message']) {
            echo json_encode(['success' => false, 'message' => 'Name and message are required']);
            break;
        }
        $db = getDB();
        $db->prepare("INSERT INTO feedback (name, mobile, email, subject, message) VALUES (?,?,?,?,?)")->execute(array_values($data));
        echo json_encode(['success' => true, 'message' => 'Message sent successfully!']);
        break;

    // ── GET GALLERY ────────────────────────────────────────────
    case 'get_gallery':
        $cat = sanitize($_GET['category'] ?? '');
        $db = getDB();
        if ($cat && $cat !== 'All') {
            $stmt = $db->prepare("SELECT * FROM gallery WHERE category=? ORDER BY uploaded_at DESC");
            $stmt->execute([$cat]);
        } else {
            $stmt = $db->query("SELECT * FROM gallery ORDER BY uploaded_at DESC");
        }
        $items = $stmt->fetchAll();
        $cats = $db->query("SELECT DISTINCT category FROM gallery ORDER BY category")->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode(['success' => true, 'data' => $items, 'categories' => $cats]);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
