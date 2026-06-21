// English base dictionary. Add keys here first; other languages fall back to these.
// Convention: dot-namespaced keys, e.g. "nav.projects", "common.save".
const en: Record<string, string> = {
  // Common actions
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.refresh': 'Refresh',
  'common.back': 'Back',
  'common.loading': 'Loading…',
  'common.search': 'Search',
  'common.exportCsv': 'Export CSV',
  'common.active': 'Active',
  'common.suspended': 'Suspended',
  'common.listView': 'List View',

  // Table column headers (shared across management grids)
  'col.id': 'ID',
  'col.name': 'Name',
  'col.role': 'Role',
  'col.type': 'Type',
  'col.phone': 'Phone',
  'col.email': 'Email',
  'col.firm': 'Firm',
  'col.district': 'District',
  'col.designation': 'Designation',
  'col.status': 'Status',
  'col.actions': 'Actions',
  'col.skills': 'Skills',
  'col.farmers': 'Farmers',
  'col.projects': 'Projects',
  // Project-list columns
  'col.projectId': 'Project ID',
  'col.farmer': 'Farmer',
  'col.dealer': 'Dealer',
  'col.bank': 'Bank',
  'col.branch': 'Branch',
  'col.area': 'Area',
  'col.structure': 'Structure',
  'col.crop': 'Crop',
  'col.stage': 'Stage',
  'col.priority': 'Priority',
  'col.projectCost': 'Project Cost',
  'col.loanAmount': 'Loan Amount',
  'col.totalSubsidy': 'Total Subsidy',

  // Form field labels (shared across management forms)
  'field.firstName': 'First Name',
  'field.lastName': 'Last Name',
  'field.phone': 'Phone',
  'field.email': 'Email',
  'field.role': 'Role',
  'field.designation': 'Designation',
  'field.district': 'District',
  'field.state': 'State',
  'field.firmName': 'Firm Name',
  'field.gstNumber': 'GST Number',
  'field.address': 'Address',

  // Users
  'users.title': 'User Management',
  'users.subtitle': 'Manage all system users — admins, staff, dealers, contractors, and farmers.',
  'users.add': 'Add User',

  // Agronomists
  'agronomists.title': 'Agronomists',
  'agronomists.subtitle': 'Crop science consultants for greenhouse projects.',
  'agronomists.add': 'Add Agronomist',

  // Contractors
  'contractors.title': 'Contractors',
  'contractors.subtitle': 'Manage structure, drip, bed, and plantation contractors with multiple skills.',
  'contractors.add': 'Add Contractor',

  // Staff
  'staff.dprWorkflow': 'DPR Workflow',

  // Farmers
  'farmers.title': 'Farmer Network',
  'farmers.subtitle': 'Manage onboarded farmers, KYC status, land records and analytics.',

  // Projects
  'projects.title': 'Projects',
  'projects.subtitle': 'Manage and track all agricultural greenhouse projects.',
  'projects.atStage': 'Showing projects at stage: {stage}',
  'projects.new': 'New Project',

  // Reports
  'reports.title': 'Reports & Analytics',
  'reports.subtitle': 'Performance overview — project pipeline, financials, and field operations.',

  // Notifications
  'notifications.title': 'Notifications',
  'notifications.subtitle': 'System alerts, project updates, and subsidy status changes.',
  'notifications.unreadCount': '{count} unread',
  'notifications.markAllRead': 'Mark All Read',

  // Navigation / page titles
  'nav.dashboard': 'Dashboard',
  'nav.projects': 'Projects',
  'nav.farmers': 'Farmers',
  'nav.dealers': 'Dealers',
  'nav.contractors': 'Contractors',
  'nav.agronomists': 'Agronomists',
  'nav.staff': 'Office Staff',
  'nav.users': 'Users',
  'nav.masters': 'Masters',
  'nav.reports': 'Reports',
  'nav.documents': 'Documents',
  'nav.settings': 'Settings',
  'nav.notifications': 'Notifications',

  // Dealers page (example of a migrated screen)
  'dealers.title': 'Dealers',
  'dealers.subtitle': 'Manage dealer profiles, farmers, and projects.',
  'dealers.add': 'Add Dealer',
  'dealers.activeDealers': 'Active Dealers',
  'dealers.networkFarmers': 'Network Farmers',
  'dealers.networkProjects': 'Network Projects',
  'dealers.conversionRate': 'Conversion Rate',
};

export default en;
