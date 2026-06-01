-- ============================================================================
-- AGRICULTURAL PROJECT MANAGEMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- Version: 2.0
-- Description: 15-stage workflow with comprehensive role-based access control

https://chat.deepseek.com/a/chat/s/2a4f9628-1480-4887-bfce-f8d9780a290b

-- ============================================================================

PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. ENUM/REFERENCE TABLES (No dependencies)
-- ============================================================================

-- Project Area Types
CREATE TABLE project_area_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    multiplier REAL DEFAULT 1.0,
    is_active INTEGER DEFAULT 1
);

INSERT INTO project_area_types (name, description, multiplier) VALUES
('Normal', 'Regular project areas', 1.0),
('Special', 'NE & Himalayan States, Scheduled areas, Vibrant villages, Andaman & Nicobar, Lakshadweep Islands', 1.15);

-- Contractor Specializations
CREATE TABLE contractor_specializations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO contractor_specializations (name, code, description) VALUES
('Structure Erection', 'STRUCT', 'Polyhouse, net house erection'),
('Drip Installation', 'DRIP', 'Drip irrigation system installation'),
('Bed Preparation', 'BED', 'Bed preparation and mulching'),
('Plantation', 'PLANT', 'Plantation and crop management'),
('Civil Works', 'CIVIL', 'Borewell, pond, pack house construction');

-- ============================================================================
-- 2. CROPS MASTER
-- ============================================================================

CREATE TABLE crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    crop_category TEXT NOT NULL CHECK(crop_category IN ('Vegetable', 'Floriculture', 'Orchid')),
    structure_type TEXT CHECK(structure_type IN ('Polyhouse', 'Net House', 'Both')),
    eligible_project_cost_per_sqm REAL NOT NULL,
    subsidy_per_sqm REAL NOT NULL,
    subsidy_percentage REAL GENERATED ALWAYS AS ((subsidy_per_sqm / eligible_project_cost_per_sqm) * 100) STORED,
    min_area_sqm INTEGER,
    max_area_sqm INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO crops (name, crop_category, structure_type, eligible_project_cost_per_sqm, subsidy_per_sqm, min_area_sqm, max_area_sqm) VALUES
-- Vegetables
('Cucumber', 'Vegetable', 'Both', 150, 75, 500, 10000),
('Capasicum', 'Vegetable', 'Both', 150, 75, 500, 10000),
('Tomato', 'Vegetable', 'Both', 150, 75, 500, 10000),

-- Floriculture - Polyhouse Only
('Rose', 'Floriculture', 'Polyhouse', 450, 225, 500, 5000),
('Anthurium', 'Floriculture', 'Polyhouse', 700, 350, 500, 5000),
('Carnation', 'Floriculture', 'Polyhouse', 600, 300, 500, 5000),
('Gerbera', 'Floriculture', 'Polyhouse', 600, 300, 500, 5000),
('Chrysanthemum', 'Floriculture', 'Polyhouse', 450, 225, 500, 5000),
('Lilium', 'Floriculture', 'Polyhouse', 450, 225, 500, 5000),

-- Orchid
('Orchid', 'Orchid', 'Polyhouse', 700, 350, 500, 5000);

-- ============================================================================
-- 3. STRUCTURE TABLES
-- ============================================================================

-- Structure Types
CREATE TABLE structure_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    description TEXT,
    is_subsidy_eligible INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO structure_types (name, code, description, is_subsidy_eligible) VALUES
('Poly House', 'NVPH', 'Naturally Ventilated Poly House', 1),
('Dome Shade Net House', 'DNH', 'Dome Shade Net House', 1),
('Flat Shade Net House', 'FNH', 'Flat Shade Net House', 1),
('Fan and Pad Poly House', 'FPPH', 'Fan and Pad Poly House', 1),
('Wire Ropes Shade Net House', 'WNH', 'Wire Ropes Shade Net House', 0);

-- Structures (Variants)
CREATE TABLE structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    structure_type_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    variant_code TEXT,
    eligible_project_cost_per_sqm REAL NOT NULL,
    subsidy_per_sqm REAL NOT NULL,
    subsidy_percentage REAL GENERATED ALWAYS AS ((subsidy_per_sqm / eligible_project_cost_per_sqm) * 100) STORED,
    min_area_sqm INTEGER,
    max_area_sqm INTEGER,
    is_active INTEGER DEFAULT 1,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (structure_type_id) REFERENCES structure_types(id)
);

INSERT INTO structures (structure_type_id, name, variant_code, eligible_project_cost_per_sqm, subsidy_per_sqm, min_area_sqm, max_area_sqm, description) VALUES
((SELECT id FROM structure_types WHERE code = 'NVPH'), 'Standard Poly House', 'Standard', 1000, 500, 500, 10000, 'Standard naturally ventilated poly house'),
((SELECT id FROM structure_types WHERE code = 'DNH'), 'Standard Dome Net House', 'Standard', 639, 319.5, 500, 10000, 'Standard dome shape shade net house'),
((SELECT id FROM structure_types WHERE code = 'FNH'), 'Flat Shade Net House 4x6', '4x6', 639, 319.5, 500, 10000, 'Flat shade net house with 4x6 meter structure'),
((SELECT id FROM structure_types WHERE code = 'FNH'), 'Flat Shade Net House 4x4', '4x4', 710, 355, 500, 10000, 'Flat shade net house with 4x4 meter structure'),
((SELECT id FROM structure_types WHERE code = 'FPPH'), 'Standard Fan & Pad House', 'Standard', 1500, 750, 500, 5000, 'Fan and pad cooled poly house'),
((SELECT id FROM structure_types WHERE code = 'WNH'), 'Wire Ropes Net House', 'Standard', 0, 0, 500, 10000, 'Wire ropes shade net house - not eligible for subsidy');

-- ============================================================================
-- 4. COMPONENT TABLES
-- ============================================================================

-- Component Categories
CREATE TABLE component_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO component_categories (name, description) VALUES
('Water Infrastructure', 'Borewell, water pond etc.'),
('Infrastructure', 'Pack house, labor room, store room'),
('Land Development', 'Land development and bed preparation');

-- Components
CREATE TABLE components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    unit_type TEXT CHECK(unit_type IN ('Per Project', 'Per Acre', 'Per SQM')),
    eligible_project_cost REAL NOT NULL,
    subsidy_amount REAL NOT NULL,
    subsidy_percentage REAL GENERATED ALWAYS AS ((subsidy_amount / eligible_project_cost) * 100) STORED,
    max_quantity INTEGER,
    unit TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES component_categories(id)
);

INSERT INTO components (category_id, name, unit_type, eligible_project_cost, subsidy_amount, max_quantity, unit) VALUES
-- Water Infrastructure
((SELECT id FROM component_categories WHERE name = 'Water Infrastructure'), 'Borewell', 'Per Project', 300000, 150000, 1, 'per project'),
((SELECT id FROM component_categories WHERE name = 'Water Infrastructure'), 'Water Pond', 'Per Project', 180000, 90000, 1, 'per project'),

-- Infrastructure
((SELECT id FROM component_categories WHERE name = 'Infrastructure'), 'Pack House', 'Per Project', 480000, 240000, 1, 'per project'),
((SELECT id FROM component_categories WHERE name = 'Infrastructure'), 'Labor Room', 'Per Acre', 20000, 10000, 10, 'per acre'),
((SELECT id FROM component_categories WHERE name = 'Infrastructure'), 'Store Room', 'Per Acre', 20000, 10000, 10, 'per acre'),

-- Land Development
((SELECT id FROM component_categories WHERE name = 'Land Development'), 'Land Development', 'Per SQM', 15, 7.5, NULL, 'per sqm'),
((SELECT id FROM component_categories WHERE name = 'Land Development'), 'Bed Preparation', 'Per SQM', 120, 60, NULL, 'per sqm');

-- ============================================================================
-- 5. PERSON TABLE (Users)
-- ============================================================================

CREATE TABLE person (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    full_name TEXT,
    role TEXT NOT NULL CHECK(role IN (
        'owner', 'admin', 'project_manager', 'office_staff', 'dealer',
        'bank_officer', 'nhb_officer', 'structure_contractor', 'drip_contractor',
        'bed_contractor', 'plantation_contractor', 'agronomist', 'farmer'
    )),
    phone_primary TEXT NOT NULL UNIQUE,
    phone_secondary TEXT,
    whatsapp_number TEXT,
    email TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    village TEXT,
    taluka TEXT,
    district TEXT,
    state TEXT,
    pincode TEXT,
    aadhaar_number TEXT UNIQUE,
    pan_number TEXT UNIQUE,
    firm_name TEXT,
    gst_number TEXT,
    land_area REAL,
    land_unit TEXT DEFAULT 'SQM',
    designation TEXT,
    joining_date DATE,
    is_active INTEGER DEFAULT 1,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE INDEX idx_person_role ON person(role);
CREATE INDEX idx_person_phone ON person(phone_primary);
CREATE INDEX idx_person_district ON person(district);
CREATE INDEX idx_person_village ON person(village);

CREATE TRIGGER update_person_timestamp 
AFTER UPDATE ON person
BEGIN
    UPDATE person SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ============================================================================
-- 6. BANK TABLES
-- ============================================================================

CREATE TABLE bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bank_branch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER NOT NULL,
    branch_name TEXT,
    branch_code TEXT,
    ifsc TEXT UNIQUE,
    address TEXT,
    village TEXT,
    taluka TEXT,
    district TEXT,
    state TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES bank(id) ON DELETE CASCADE
);

CREATE TABLE bank_contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    designation TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES bank_branch(id) ON DELETE CASCADE
);

-- ============================================================================
-- 7. COMPANY STRUCTURE
-- ============================================================================

CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    registration_number TEXT,
    gst_number TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES person(id)
);

CREATE TABLE company_regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    district TEXT,
    taluka TEXT,
    manager_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (manager_id) REFERENCES person(id)
);

-- ============================================================================
-- 8. FARMER ONBOARDING & MAPPING
-- ============================================================================

CREATE TABLE farmer_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER NOT NULL,
    registered_by INTEGER NOT NULL,
    registration_date DATE NOT NULL,
    registration_method TEXT CHECK(registration_method IN ('dealer', 'company')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER,
    approval_date DATE,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES person(id),
    FOREIGN KEY (registered_by) REFERENCES person(id),
    FOREIGN KEY (approved_by) REFERENCES person(id)
);

CREATE TABLE dealer_farmer_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    farmer_id INTEGER NOT NULL,
    assigned_date DATE NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES person(id),
    FOREIGN KEY (farmer_id) REFERENCES person(id),
    UNIQUE(dealer_id, farmer_id)
);

CREATE TABLE company_dealer_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    dealer_id INTEGER NOT NULL,
    assigned_date DATE NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (dealer_id) REFERENCES person(id),
    UNIQUE(company_id, dealer_id)
);

-- ============================================================================
-- 9. PROJECTS TABLE (Main Table)
-- ============================================================================

CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT,
    company_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    project_manager_id INTEGER,
    farmer_id INTEGER NOT NULL,
    dealer_id INTEGER,
    bank_branch_id INTEGER,
    area_type_id INTEGER NOT NULL,
    village TEXT,
    taluka TEXT,
    district TEXT,
    khasra_no TEXT,
    survey_no TEXT,
    land_area REAL,
    land_unit TEXT DEFAULT 'SQM',
    latitude REAL,
    longitude REAL,
    project_stage TEXT DEFAULT 'farmer_onboarding' CHECK(project_stage IN (
        'farmer_onboarding', 'dealer_verification', 'office_dpr_quotation', 'bank',
        'subsidy_registration_goc', 'erection', 'drip', 'bed', 'plantation',
        'other_components', 'subsidy_claim_nhb', 'subsidy_visit_nhb',
        'subsidy_meeting_nhb', 'subsidy_released_nhb', 'completed'
    )),
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('high', 'normal', 'low')),
    expected_start_date DATE,
    expected_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    crop_id INTEGER,
    crop_category TEXT,
    
    -- Stage 3: Office DPR & Quotation
    dpr_file_path TEXT,
    quotation_file_path TEXT,
    estimated_project_cost REAL,
    dpr_quotation_ready INTEGER DEFAULT 0,
    
    -- Stage 4: Bank Loan
    loan_amount REAL,
    loan_sanction_date DATE,
    loan_account_number TEXT,
    bank_approved INTEGER DEFAULT 0,
    
    -- Stage 5: Subsidy Registration (GOC)
    goc_number TEXT,
    goc_date DATE,
    goc_file_path TEXT,
    goc_received INTEGER DEFAULT 0,
    
    -- Stage 6-9: Execution
    erection_start_date DATE,
    erection_completion_date DATE,
    drip_completion_date DATE,
    bed_completion_date DATE,
    
    -- Stage 9: Plantation
    plantation_date DATE,
    seedlings_count INTEGER,
    plantation_photo_path TEXT,
    agronomist_recommendations TEXT,
    
    -- Stage 10: Other Components
    other_components_completed INTEGER DEFAULT 0,
    other_components_completion_date DATE,
    
    -- Stage 11: NHB Claim
    nhb_claim_reference TEXT,
    nhb_claim_date DATE,
    nhb_claim_documents_path TEXT,
    nhb_claim_filed INTEGER DEFAULT 0,
    
    -- Stage 12: NHB Visit
    nhb_inspection_date DATE,
    nhb_inspector_name TEXT,
    nhb_inspection_report_path TEXT,
    nhb_inspection_done INTEGER DEFAULT 0,
    nhb_inspection_remarks TEXT,
    
    -- Stage 13: NHB Meeting
    nhb_meeting_date DATE,
    nhb_meeting_decision TEXT CHECK(nhb_meeting_decision IN ('approved', 'rejected', 'pending')),
    nhb_meeting_minutes_path TEXT,
    nhb_meeting_done INTEGER DEFAULT 0,
    nhb_approved_amount REAL,
    nhb_meeting_remarks TEXT,
    
    -- Stage 14: NHB Release
    nhb_release_date DATE,
    nhb_release_order_number TEXT,
    nhb_release_amount REAL,
    nhb_bank_credit_date DATE,
    nhb_amount_released INTEGER DEFAULT 0,
    
    -- Stage 15: Completion
    completion_certificate_date DATE,
    completion_certificate_path TEXT,
    farmer_feedback TEXT,
    farmer_rating INTEGER CHECK(farmer_rating BETWEEN 1 AND 5),
    
    -- Subsidy Calculations
    total_eligible_cost REAL,
    total_subsidy_claimed REAL,
    total_subsidy_received REAL,
    
    -- Site Visit Tracking
    last_site_visit_date DATE,
    last_site_visit_by INTEGER,
    site_visit_count INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES person(id),
    FOREIGN KEY (project_manager_id) REFERENCES person(id),
    FOREIGN KEY (farmer_id) REFERENCES person(id),
    FOREIGN KEY (dealer_id) REFERENCES person(id),
    FOREIGN KEY (bank_branch_id) REFERENCES bank_branch(id),
    FOREIGN KEY (area_type_id) REFERENCES project_area_types(id),
    FOREIGN KEY (crop_id) REFERENCES crops(id),
    FOREIGN KEY (last_site_visit_by) REFERENCES person(id)
);

CREATE INDEX idx_projects_stage ON projects(project_stage);
CREATE INDEX idx_projects_farmer ON projects(farmer_id);
CREATE INDEX idx_projects_pm ON projects(project_manager_id);
CREATE INDEX idx_projects_company ON projects(company_id);

CREATE TRIGGER update_projects_timestamp 
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER set_crop_category
AFTER INSERT ON projects
BEGIN
    UPDATE projects 
    SET crop_category = (SELECT crop_category FROM crops WHERE id = NEW.crop_id)
    WHERE id = NEW.id;
END;

-- ============================================================================
-- 10. PROJECT STRUCTURES & COMPONENTS
-- ============================================================================

CREATE TABLE project_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    structure_id INTEGER NOT NULL,
    area_sqm REAL NOT NULL,
    eligible_cost REAL,
    subsidy_amount REAL,
    actual_cost REAL,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (structure_id) REFERENCES structures(id)
);

CREATE TABLE project_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    component_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT,
    eligible_cost REAL,
    subsidy_amount REAL,
    actual_cost REAL,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id)
);

-- ============================================================================
-- 11. CONTRACTOR MANAGEMENT
-- ============================================================================

CREATE TABLE project_contractors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    contractor_id INTEGER NOT NULL,
    specialization_id INTEGER NOT NULL,
    assigned_date DATE,
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
    payment_amount REAL,
    payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'completed')),
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (contractor_id) REFERENCES person(id),
    FOREIGN KEY (specialization_id) REFERENCES contractor_specializations(id)
);

-- ============================================================================
-- 12. SITE VISITS
-- ============================================================================

CREATE TABLE site_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    visited_by INTEGER NOT NULL,
    visit_date DATE NOT NULL,
    visit_type TEXT CHECK(visit_type IN ('scheduled', 'unscheduled', 'emergency')),
    visit_latitude REAL,
    visit_longitude REAL,
    location_verified INTEGER DEFAULT 0,
    work_status TEXT,
    laborers_present INTEGER,
    materials_status TEXT,
    quality_issues TEXT,
    photos TEXT,
    actions_taken TEXT,
    follow_up_required INTEGER DEFAULT 0,
    follow_up_date DATE,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (visited_by) REFERENCES person(id)
);

CREATE INDEX idx_site_visits_project ON site_visits(project_id);
CREATE INDEX idx_site_visits_date ON site_visits(visit_date);

-- ============================================================================
-- 13. LOGS & REPORTS
-- ============================================================================

CREATE TABLE project_stage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    stage_name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    remarks TEXT,
    updated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES person(id)
);

CREATE TABLE structure_stage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_structure_id INTEGER NOT NULL,
    stage_name TEXT NOT NULL CHECK(stage_name IN (
        'layout', 'foundation', 'structure_erection', 'net_fixing',
        'drip_installation', 'bed_preparation', 'completed'
    )),
    start_date DATE,
    end_date DATE,
    progress_percent REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    remarks TEXT,
    updated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_structure_id) REFERENCES project_structures(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES person(id)
);

CREATE TABLE daily_site_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    project_structure_id INTEGER,
    report_date DATE NOT NULL,
    supervisor_id INTEGER,
    work_done TEXT,
    labor_count INTEGER,
    issues TEXT,
    next_plan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (project_structure_id) REFERENCES project_structures(id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES person(id)
);

CREATE TABLE project_progress_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    project_structure_id INTEGER,
    stage TEXT CHECK(stage IN (
        'layout', 'foundation', 'structure_erection', 'net_fixing',
        'drip_installation', 'bed_preparation', 'plantation',
        'farmer', 'dealer', 'office', 'bank', 'subsidy_visit', 
        'other_components', 'completed'
    )),
    file_path TEXT NOT NULL,
    geo_location TEXT,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (project_structure_id) REFERENCES project_structures(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES person(id)
);

CREATE TABLE project_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES person(id)
);

CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK(type IN ('stage_change', 'task_assigned', 'document_required', 'approval_needed', 'subsidy_update')),
    is_read INTEGER DEFAULT 0,
    related_entity_type TEXT,
    related_entity_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES person(id) ON DELETE CASCADE
);

-- ============================================================================
-- 14. AGRONOMIST CONSULTATIONS
-- ============================================================================

CREATE TABLE agronomist_consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    agronomist_id INTEGER NOT NULL,
    consultation_date DATE NOT NULL,
    crop_advice TEXT,
    fertilizer_recommendations TEXT,
    pest_control_measures TEXT,
    irrigation_schedule TEXT,
    expected_yield REAL,
    follow_up_date DATE,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (agronomist_id) REFERENCES person(id)
);

-- ============================================================================
-- 15. VIEWS
-- ============================================================================

CREATE VIEW project_subsidy_calculation AS
SELECT 
    p.id AS project_id,
    p.project_name,
    pat.name AS area_type,
    pat.multiplier AS area_multiplier,
    c.name AS crop_name,
    c.crop_category,
    COALESCE((
        SELECT SUM(ps.area_sqm * s.eligible_project_cost_per_sqm * pat.multiplier)
        FROM project_structures ps
        JOIN structures s ON ps.structure_id = s.id
        WHERE ps.project_id = p.id
    ), 0) AS structure_eligible_cost,
    COALESCE((
        SELECT SUM(ps.area_sqm * s.subsidy_per_sqm * pat.multiplier)
        FROM project_structures ps
        JOIN structures s ON ps.structure_id = s.id
        WHERE ps.project_id = p.id
    ), 0) AS structure_subsidy,
    COALESCE((
        SELECT SUM(
            CASE 
                WHEN comp.unit_type = 'Per Project' THEN comp.eligible_project_cost * pat.multiplier * pc.quantity
                WHEN comp.unit_type = 'Per Acre' THEN comp.eligible_project_cost * pat.multiplier * pc.quantity
                WHEN comp.unit_type = 'Per SQM' THEN comp.eligible_project_cost * pat.multiplier * p.land_area * pc.quantity
                ELSE comp.eligible_project_cost * pat.multiplier * pc.quantity
            END
        )
        FROM project_components pc
        JOIN components comp ON pc.component_id = comp.id
        WHERE pc.project_id = p.id
    ), 0) AS component_eligible_cost,
    COALESCE((
        SELECT SUM(
            CASE 
                WHEN comp.unit_type = 'Per Project' THEN comp.subsidy_amount * pat.multiplier * pc.quantity
                WHEN comp.unit_type = 'Per Acre' THEN comp.subsidy_amount * pat.multiplier * pc.quantity
                WHEN comp.unit_type = 'Per SQM' THEN comp.subsidy_amount * pat.multiplier * p.land_area * pc.quantity
                ELSE comp.subsidy_amount * pat.multiplier * pc.quantity
            END
        )
        FROM project_components pc
        JOIN components comp ON pc.component_id = comp.id
        WHERE pc.project_id = p.id
    ), 0) AS component_subsidy,
    COALESCE((
        SELECT SUM(ps.area_sqm * s.eligible_project_cost_per_sqm * pat.multiplier)
        FROM project_structures ps
        JOIN structures s ON ps.structure_id = s.id
        WHERE ps.project_id = p.id
    ), 0) + COALESCE((
        SELECT SUM(
            CASE 
                WHEN comp.unit_type = 'Per Project' THEN comp.eligible_project_cost * pat.multiplier * pc.quantity
                WHEN comp.unit_type = 'Per Acre' THEN comp.eligible_project_cost * pat.multiplier * pc.quantity
                WHEN comp.unit_type = 'Per SQM' THEN comp.eligible_project_cost * pat.multiplier * p.land_area * pc.quantity
                ELSE comp.eligible_project_cost * pat.multiplier * pc.quantity
            END
        )
        FROM project_components pc
        JOIN components comp ON pc.component_id = comp.id
        WHERE pc.project_id = p.id
    ), 0) AS total_eligible_cost,
    COALESCE((
        SELECT SUM(ps.area_sqm * s.subsidy_per_sqm * pat.multiplier)
        FROM project_structures ps
        JOIN structures s ON ps.structure_id = s.id
        WHERE ps.project_id = p.id
    ), 0) + COALESCE((
        SELECT SUM(
            CASE 
                WHEN comp.unit_type = 'Per Project' THEN comp.subsidy_amount * pat.multiplier * pc.quantity
                WHEN comp.unit_type = 'Per Acre' THEN comp.subsidy_amount * pat.multiplier * pc.quantity
                WHEN comp.unit_type = 'Per SQM' THEN comp.subsidy_amount * pat.multiplier * p.land_area * pc.quantity
                ELSE comp.subsidy_amount * pat.multiplier * pc.quantity
            END
        )
        FROM project_components pc
        JOIN components comp ON pc.component_id = comp.id
        WHERE pc.project_id = p.id
    ), 0) AS total_subsidy_eligible
FROM projects p
JOIN project_area_types pat ON p.area_type_id = pat.id
LEFT JOIN crops c ON p.crop_id = c.id;

CREATE VIEW project_completion_stats AS
SELECT 
    id AS project_id,
    project_name,
    project_stage,
    CASE project_stage
        WHEN 'farmer_onboarding' THEN 6.67
        WHEN 'dealer_verification' THEN 13.33
        WHEN 'office_dpr_quotation' THEN 20.00
        WHEN 'bank' THEN 26.67
        WHEN 'subsidy_registration_goc' THEN 33.33
        WHEN 'erection' THEN 40.00
        WHEN 'drip' THEN 46.67
        WHEN 'bed' THEN 53.33
        WHEN 'plantation' THEN 60.00
        WHEN 'other_components' THEN 66.67
        WHEN 'subsidy_claim_nhb' THEN 73.33
        WHEN 'subsidy_visit_nhb' THEN 80.00
        WHEN 'subsidy_meeting_nhb' THEN 86.67
        WHEN 'subsidy_released_nhb' THEN 93.33
        WHEN 'completed' THEN 100.00
        ELSE 0
    END AS completion_percentage
FROM projects;

CREATE VIEW project_manager_dashboard AS
SELECT 
    pm.id AS manager_id,
    pm.first_name || ' ' || pm.last_name AS manager_name,
    COUNT(DISTINCT p.id) AS total_projects,
    COUNT(CASE WHEN p.project_stage IN ('erection', 'drip', 'bed', 'plantation') THEN 1 END) AS active_projects,
    COUNT(CASE WHEN p.project_stage = 'completed' THEN 1 END) AS completed_projects,
    COUNT(DISTINCT sv.id) AS total_visits,
    MAX(sv.visit_date) AS last_visit_date,
    COUNT(CASE WHEN p.project_stage IN ('erection', 'drip', 'bed', 'plantation') 
        AND julianday('now') > julianday(p.expected_end_date) THEN 1 END) AS overdue_projects,
    SUM(p.land_area) AS total_area_managed
FROM person pm
LEFT JOIN projects p ON p.project_manager_id = pm.id
LEFT JOIN site_visits sv ON sv.project_id = p.id
WHERE pm.role = 'project_manager'
GROUP BY pm.id;

CREATE VIEW project_manager_projects AS
SELECT 
    p.id AS project_id,
    p.project_name,
    p.project_stage,
    p.village,
    p.taluka,
    p.district,
    p.land_area,
    p.latitude,
    p.longitude,
    p.expected_end_date,
    f.first_name || ' ' || f.last_name AS farmer_name,
    f.phone_primary AS farmer_phone,
    d.first_name || ' ' || d.last_name AS dealer_name,
    sv.visit_date AS last_visit_date,
    s.name AS structure_name,
    ps.area_sqm AS structure_area,
    CASE p.project_stage
        WHEN 'erection' THEN 'Structure Erection in Progress'
        WHEN 'drip' THEN 'Drip Installation in Progress'
        WHEN 'bed' THEN 'Bed Preparation in Progress'
        WHEN 'plantation' THEN 'Plantation in Progress'
        ELSE p.project_stage
    END AS progress_status,
    CASE 
        WHEN p.expected_end_date IS NOT NULL AND p.actual_end_date IS NULL 
        THEN julianday(p.expected_end_date) - julianday('now')
        ELSE NULL
    END AS days_remaining
FROM projects p
LEFT JOIN person f ON p.farmer_id = f.id
LEFT JOIN person d ON p.dealer_id = d.id
LEFT JOIN project_structures ps ON p.id = ps.project_id
LEFT JOIN structures s ON ps.structure_id = s.id
LEFT JOIN (
    SELECT project_id, MAX(visit_date) AS visit_date
    FROM site_visits
    GROUP BY project_id
) sv ON p.id = sv.project_id
WHERE p.project_manager_id IS NOT NULL;

-- ============================================================================
-- 16. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample users
INSERT INTO person (first_name, last_name, role, phone_primary, email) VALUES
('Raj', 'Mehta', 'owner', '9999999999', 'raj@agrico.com'),
('Vikram', 'Singh', 'project_manager', '9876543210', 'vikram@agrico.com'),
('Amit', 'Sharma', 'dealer', '8888888888', 'amit@dealer.com'),
('Ramesh', 'Kumar', 'farmer', '7777777777', 'ramesh@example.com');

-- Insert sample company
INSERT INTO companies (name, owner_id, registration_number, gst_number) VALUES
('AgriCo Solutions', (SELECT id FROM person WHERE email = 'raj@agrico.com'), 'ABC123456', '27ABCDE1234F1Z5');

-- Insert sample bank
INSERT INTO bank (name) VALUES ('State Bank of India');

-- Insert sample bank branch
INSERT INTO bank_branch (bank_id, branch_name, ifsc, district) VALUES
((SELECT id FROM bank WHERE name = 'State Bank of India'), 'Nashik Main', 'SBIN0001234', 'Nashik');

-- ============================================================================
-- 17. VERIFICATION QUERIES
-- ============================================================================

-- List all tables
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- List all views
SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;

-- Count records in key tables
SELECT 'project_area_types' AS table_name, COUNT(*) AS count FROM project_area_types
UNION ALL SELECT 'crops', COUNT(*) FROM crops
UNION ALL SELECT 'structure_types', COUNT(*) FROM structure_types
UNION ALL SELECT 'structures', COUNT(*) FROM structures
UNION ALL SELECT 'component_categories', COUNT(*) FROM component_categories
UNION ALL SELECT 'components', COUNT(*) FROM components
UNION ALL SELECT 'person', COUNT(*) FROM person
UNION ALL SELECT 'companies', COUNT(*) FROM companies;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================