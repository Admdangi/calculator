<?php
// ============================================================
// ADMIN API — admin/api.php
// Handles all admin CRUD operations securely
// ============================================================
require_once '../php/config.php';
header('Content-Type: application/json');

// ── AUTH CHECK ──────────────────────────────────────────────
if (!isset($_SESSION[ADMIN_SESSION_KEY]) || $_SESSION[ADMIN_SESSION_KEY] !== true) {
    if (($_POST['action'] ?? '') !== 'login') {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        exit;
    }
}

$action = sanitize($_POST['action'] ?? '');

switch ($action) {

    // ── LOGIN ───────────────────────────────────────────────
    case 'login':
        $username = sanitize($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        if (!$username || !$password) {
            echo json_encode(['success' => false, 'message' => 'Credentials required']); break;
        }
        $db   = getDB();
        $stmt = $db->prepare("SELECT id, password, name FROM admin_users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION[ADMIN_SESSION_KEY] = true;
            $_SESSION['admin_name']      = $user['name'];
            echo json_encode(['success' => true, 'name' => $user['name']]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
        }
        break;

    // ── LOGOUT ──────────────────────────────────────────────
    case 'logout':
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    // ── DASHBOARD STATS ─────────────────────────────────────
    case 'dashboard_stats':
        $db    = getDB();
        $stats = $db->query("SELECT COUNT(*) as villages, SUM(total_members) as members, SUM(total_houses) as houses FROM villages")->fetch();
        $fb    = $db->query("SELECT COUNT(*) FROM feedback WHERE is_read=0")->fetchColumn();
        $regs  = $db->query("SELECT COUNT(*) FROM registered_users WHERE is_approved=0")->fetchColumn();
        echo json_encode(['success'=>true,'data'=>['villages'=>$stats['villages'],'members'=>$stats['members'],'houses'=>$stats['houses'],'unread_feedback'=>$fb,'pending_regs'=>$regs]]);
        break;

    // ── GET ALL VILLAGES ─────────────────────────────────────
    case 'get_villages':
        $db   = getDB();
        $rows = $db->query("SELECT * FROM villages ORDER BY district_name, village_name")->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
        break;

    // ── SAVE VILLAGE (Add / Edit) ────────────────────────────
    case 'save_village':
        $id      = (int)($_POST['id'] ?? 0);
        $fields  = [
            'district_name'  => sanitize($_POST['district_name']  ?? ''),
            'taluka_name'    => sanitize($_POST['taluka_name']     ?? ''),
            'village_name'   => sanitize($_POST['village_name']    ?? ''),
            'head_name'      => sanitize($_POST['head_name']       ?? ''),
            'head_mobile'    => sanitize($_POST['head_mobile']     ?? ''),
            'total_houses'   => (int)($_POST['total_houses']       ?? 0),
            'total_families' => (int)($_POST['total_families']     ?? 0),
            'total_members'  => (int)($_POST['total_members']      ?? 0),
            'male_members'   => (int)($_POST['male_members']       ?? 0),
            'female_members' => (int)($_POST['female_members']     ?? 0),
        ];
        if (!$fields['village_name'] || !$fields['district_name']) {
            echo json_encode(['success'=>false,'message'=>'Village name and district are required']); break;
        }
        $db = getDB();
        if ($id) {
            $sql  = "UPDATE villages SET district_name=?,taluka_name=?,village_name=?,head_name=?,head_mobile=?,total_houses=?,total_families=?,total_members=?,male_members=?,female_members=? WHERE id=?";
            $vals = array_values($fields);
            $vals[] = $id;
            $db->prepare($sql)->execute($vals);
            echo json_encode(['success'=>true,'message'=>'Village updated']);
        } else {
            $db->prepare("INSERT INTO villages (district_name,taluka_name,village_name,head_name,head_mobile,total_houses,total_families,total_members,male_members,female_members) VALUES (?,?,?,?,?,?,?,?,?,?)")->execute(array_values($fields));
            echo json_encode(['success'=>true,'message'=>'Village added','id'=>$db->lastInsertId()]);
        }
        break;

    // ── DELETE VILLAGE ───────────────────────────────────────
    case 'delete_village':
        $id = (int)($_POST['id'] ?? 0);
        if (!$id) { echo json_encode(['success'=>false,'message'=>'ID required']); break; }
        getDB()->prepare("DELETE FROM villages WHERE id=?")->execute([$id]);
        echo json_encode(['success'=>true,'message'=>'Village deleted']);
        break;

    // ── GET ALL MEMBERS ──────────────────────────────────────
    case 'get_members':
        $db   = getDB();
        $rows = $db->query("SELECT m.*, v.village_name FROM members m LEFT JOIN villages v ON m.village_id=v.id ORDER BY m.id DESC")->fetchAll();
        echo json_encode(['success'=>true,'data'=>$rows]);
        break;

    // ── SAVE MEMBER ──────────────────────────────────────────
    case 'save_member':
        $id     = (int)($_POST['id'] ?? 0);
        $fields = [
            'village_id'  => (int)($_POST['village_id']  ?? 0) ?: null,
            'name'        => sanitize($_POST['name']        ?? ''),
            'father_name' => sanitize($_POST['father_name'] ?? ''),
            'mobile'      => sanitize($_POST['mobile']      ?? ''),
            'occupation'  => sanitize($_POST['occupation']  ?? ''),
            'gender'      => sanitize($_POST['gender']      ?? 'Male'),
            'age'         => (int)($_POST['age']            ?? 0) ?: null,
        ];
        if (!$fields['name']) { echo json_encode(['success'=>false,'message'=>'Name required']); break; }
        $db = getDB();
        if ($id) {
            $db->prepare("UPDATE members SET village_id=?,name=?,father_name=?,mobile=?,occupation=?,gender=?,age=? WHERE id=?")->execute([...array_values($fields),$id]);
            echo json_encode(['success'=>true,'message'=>'Member updated']);
        } else {
            $db->prepare("INSERT INTO members (village_id,name,father_name,mobile,occupation,gender,age) VALUES (?,?,?,?,?,?,?)")->execute(array_values($fields));
            echo json_encode(['success'=>true,'message'=>'Member added']);
        }
        break;

    // ── DELETE MEMBER ────────────────────────────────────────
    case 'delete_member':
        $id = (int)($_POST['id'] ?? 0);
        getDB()->prepare("DELETE FROM members WHERE id=?")->execute([$id]);
        echo json_encode(['success'=>true,'message'=>'Member deleted']);
        break;

    // ── GET LEADERS ──────────────────────────────────────────
    case 'get_leaders':
        $rows = getDB()->query("SELECT * FROM district_leaders ORDER BY sort_order")->fetchAll();
        echo json_encode(['success'=>true,'data'=>$rows]);
        break;

    // ── SAVE LEADER ──────────────────────────────────────────
    case 'save_leader':
        $id     = (int)($_POST['id'] ?? 0);
        $fields = [
            'name'        => sanitize($_POST['name']        ?? ''),
            'designation' => sanitize($_POST['designation'] ?? ''),
            'mobile'      => sanitize($_POST['mobile']      ?? ''),
            'email'       => sanitize($_POST['email']       ?? ''),
            'address'     => sanitize($_POST['address']     ?? ''),
            'sort_order'  => (int)($_POST['sort_order']     ?? 1),
            'is_active'   => 1,
        ];
        if (!$fields['name'] || !$fields['designation']) {
            echo json_encode(['success'=>false,'message'=>'Name and designation required']); break;
        }
        // Handle photo upload
        $photo = '';
        if (!empty($_FILES['photo']['tmp_name'])) {
            $allowed = ['image/jpeg','image/png','image/webp','image/gif'];
            if (!in_array($_FILES['photo']['type'], $allowed)) {
                echo json_encode(['success'=>false,'message'=>'Invalid image type']); break;
            }
            $ext   = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
            $fname = uniqid('leader_', true) . '.' . $ext;
            move_uploaded_file($_FILES['photo']['tmp_name'], __DIR__ . '/uploads/' . $fname);
            $photo = $fname;
        }
        $db = getDB();
        if ($id) {
            if ($photo) $db->prepare("UPDATE district_leaders SET name=?,designation=?,mobile=?,email=?,address=?,sort_order=?,is_active=?,photo=? WHERE id=?")->execute([...array_values($fields),$photo,$id]);
            else        $db->prepare("UPDATE district_leaders SET name=?,designation=?,mobile=?,email=?,address=?,sort_order=?,is_active=? WHERE id=?")->execute([...array_values($fields),$id]);
            echo json_encode(['success'=>true,'message'=>'Leader updated']);
        } else {
            $db->prepare("INSERT INTO district_leaders (name,designation,mobile,email,address,sort_order,is_active,photo) VALUES (?,?,?,?,?,?,?,?)")->execute([...array_values($fields),$photo]);
            echo json_encode(['success'=>true,'message'=>'Leader added']);
        }
        break;

    // ── DELETE LEADER ────────────────────────────────────────
    case 'delete_leader':
        $id = (int)($_POST['id'] ?? 0);
        getDB()->prepare("DELETE FROM district_leaders WHERE id=?")->execute([$id]);
        echo json_encode(['success'=>true,'message'=>'Leader deleted']);
        break;

    // ── GET FEEDBACK ─────────────────────────────────────────
    case 'get_feedback':
        $rows = getDB()->query("SELECT * FROM feedback ORDER BY created_at DESC")->fetchAll();
        echo json_encode(['success'=>true,'data'=>$rows]);
        break;

    // ── GET REGISTRATIONS ────────────────────────────────────
    case 'get_registrations':
        $db   = getDB();
        $rows = $db->query("SELECT r.*, v.village_name FROM registered_users r LEFT JOIN villages v ON r.village_id=v.id ORDER BY r.created_at DESC")->fetchAll();
        echo json_encode(['success'=>true,'data'=>$rows]);
        break;

    // ── APPROVE REGISTRATION ─────────────────────────────────
    case 'approve_registration':
        $id = (int)($_POST['id'] ?? 0);
        $db = getDB();
        // Copy to members table
        $reg = $db->prepare("SELECT * FROM registered_users WHERE id=?");
        $reg->execute([$id]);
        $r = $reg->fetch();
        if ($r) {
            $db->prepare("INSERT INTO members (village_id,name,father_name,mobile,occupation,gender,age,is_verified) VALUES (?,?,?,?,?,?,?,1)")->execute([$r['village_id'],$r['name'],$r['father_name'],$r['mobile'],$r['occupation'],$r['gender'],$r['age']]);
            $db->prepare("UPDATE registered_users SET is_approved=1 WHERE id=?")->execute([$id]);
            echo json_encode(['success'=>true,'message'=>'Registration approved and member added']);
        } else {
            echo json_encode(['success'=>false,'message'=>'Record not found']);
        }
        break;

    // ── GALLERY UPLOAD ───────────────────────────────────────
    case 'upload_gallery':
        if (empty($_FILES['image']['tmp_name'])) {
            echo json_encode(['success'=>false,'message'=>'No image uploaded']); break;
        }
        $allowed = ['image/jpeg','image/png','image/webp','image/gif'];
        if (!in_array($_FILES['image']['type'],$allowed)) {
            echo json_encode(['success'=>false,'message'=>'Invalid image type']); break;
        }
        $ext   = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $fname = uniqid('gallery_',true) . '.' . $ext;
        $dest  = __DIR__ . '/../uploads/' . $fname;
        if (move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
            $title = sanitize($_POST['title']    ?? '');
            $cat   = sanitize($_POST['category'] ?? 'General');
            getDB()->prepare("INSERT INTO gallery (image,title,category) VALUES (?,?,?)")->execute([$fname,$title,$cat]);
            echo json_encode(['success'=>true,'message'=>'Image uploaded','file'=>$fname]);
        } else {
            echo json_encode(['success'=>false,'message'=>'Upload failed. Check folder permissions.']);
        }
        break;

    // ── GET GALLERY ──────────────────────────────────────────
    case 'get_gallery':
        $rows = getDB()->query("SELECT * FROM gallery ORDER BY uploaded_at DESC")->fetchAll();
        echo json_encode(['success'=>true,'data'=>$rows]);
        break;

    // ── DELETE GALLERY ITEM ──────────────────────────────────
    case 'delete_gallery':
        $id = (int)($_POST['id'] ?? 0);
        $db = getDB();
        $row = $db->prepare("SELECT image FROM gallery WHERE id=?");
        $row->execute([$id]);
        $img = $row->fetchColumn();
        if ($img) @unlink(__DIR__ . '/../uploads/' . $img);
        $db->prepare("DELETE FROM gallery WHERE id=?")->execute([$id]);
        echo json_encode(['success'=>true,'message'=>'Image deleted']);
        break;

    default:
        echo json_encode(['success'=>false,'message'=>'Invalid action']);
}
?>
