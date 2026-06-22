-- ============================================================
-- DISTRICT COMMUNITY PORTAL - DATABASE SCHEMA
-- ============================================================

CREATE DATABASE IF NOT EXISTS community_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE community_portal;

-- Admin Users
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (password: Admin@1234)
INSERT INTO admin_users (username, password, name) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator');

-- Villages Table
CREATE TABLE villages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    district_name VARCHAR(100) NOT NULL,
    taluka_name VARCHAR(100),
    village_name VARCHAR(100) NOT NULL,
    head_name VARCHAR(100),
    head_mobile VARCHAR(15),
    head_designation VARCHAR(100) DEFAULT 'Village Head',
    total_houses INT DEFAULT 0,
    total_families INT DEFAULT 0,
    total_members INT DEFAULT 0,
    male_members INT DEFAULT 0,
    female_members INT DEFAULT 0,
    population INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Members Table
CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    village_id INT,
    name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100),
    mobile VARCHAR(15),
    occupation VARCHAR(100),
    gender ENUM('Male','Female','Other') DEFAULT 'Male',
    age INT,
    is_verified TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE SET NULL
);

-- District Leaders Table
CREATE TABLE district_leaders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    photo VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback / Contact Table
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    email VARCHAR(100),
    subject VARCHAR(200),
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gallery Table
CREATE TABLE gallery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image VARCHAR(255) NOT NULL,
    title VARCHAR(200),
    category VARCHAR(100) DEFAULT 'General',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP Table (for registration)
CREATE TABLE otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile VARCHAR(15) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registered Users
CREATE TABLE registered_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    village_id INT,
    name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100),
    mobile VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    occupation VARCHAR(100),
    gender ENUM('Male','Female','Other'),
    age INT,
    address TEXT,
    is_approved TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE SET NULL
);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO villages (district_name, taluka_name, village_name, head_name, head_mobile, total_houses, total_families, total_members, male_members, female_members, population) VALUES
('Indore', 'Indore Urban', 'Rajendra Nagar', 'Ramesh Patel', '9876543210', 145, 138, 620, 312, 308, 655),
('Indore', 'Mhow', 'Simrol', 'Mahesh Verma', '9812345678', 89, 82, 380, 192, 188, 401),
('Indore', 'Depalpur', 'Kshipra', 'Suresh Sharma', '9898765432', 112, 105, 490, 248, 242, 512),
('Indore', 'Sanwer', 'Hatod', 'Dinesh Yadav', '9765432109', 76, 70, 320, 162, 158, 338),
('Indore', 'Mhow', 'Manpur', 'Vikram Singh', '9654321098', 98, 92, 425, 215, 210, 445);

INSERT INTO members (village_id, name, father_name, mobile, occupation, gender, age) VALUES
(1, 'Rajesh Kumar Patel', 'Ramesh Patel', '9876541230', 'Farmer', 'Male', 35),
(1, 'Sunita Devi', 'Ramesh Patel', '9876541231', 'Homemaker', 'Female', 30),
(1, 'Anil Verma', 'Suresh Verma', '9876541232', 'Teacher', 'Male', 42),
(1, 'Meena Sharma', 'Dinesh Sharma', '9876541233', 'Business', 'Female', 28),
(1, 'Rohit Patel', 'Mahesh Patel', '9876541234', 'Engineer', 'Male', 26),
(2, 'Priya Verma', 'Mahesh Verma', '9812345679', 'Teacher', 'Female', 32),
(2, 'Sunil Yadav', 'Ramesh Yadav', '9812345680', 'Farmer', 'Male', 45),
(3, 'Kavita Sharma', 'Suresh Sharma', '9898765433', 'Nurse', 'Female', 29),
(3, 'Deepak Patel', 'Rajesh Patel', '9898765434', 'Business', 'Male', 38);

INSERT INTO district_leaders (photo, name, designation, mobile, email, address, sort_order) VALUES
('', 'Shri Ramchandra Patel', 'District President', '9811111111', 'president@community.org', 'Indore, MP', 1),
('', 'Shri Mahendra Verma', 'Vice President', '9822222222', 'vp@community.org', 'Indore, MP', 2),
('', 'Shri Suresh Kumar', 'General Secretary', '9833333333', 'secretary@community.org', 'Indore, MP', 3),
('', 'Shri Dinesh Sharma', 'Treasurer', '9844444444', 'treasurer@community.org', 'Indore, MP', 4),
('', 'Shri Vijay Singh', 'Executive Member', '9855555555', '', 'Indore, MP', 5),
('', 'Smt. Kamla Devi', 'Executive Member', '9866666666', '', 'Indore, MP', 6);
