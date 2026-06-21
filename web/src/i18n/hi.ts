// Hindi dictionary. Only keys translated so far are listed; anything missing
// falls back to English automatically via t(). Translate incrementally.
const hi: Record<string, string> = {
  // Common actions
  'common.save': 'सहेजें',
  'common.cancel': 'रद्द करें',
  'common.delete': 'हटाएँ',
  'common.edit': 'संपादित करें',
  'common.add': 'जोड़ें',
  'common.refresh': 'ताज़ा करें',
  'common.back': 'वापस',
  'common.loading': 'लोड हो रहा है…',
  'common.search': 'खोजें',
  'common.exportCsv': 'CSV निर्यात करें',
  'common.active': 'सक्रिय',
  'common.suspended': 'निलंबित',
  'common.listView': 'सूची दृश्य',

  // Table column headers
  'col.id': 'आईडी',
  'col.name': 'नाम',
  'col.role': 'भूमिका',
  'col.type': 'प्रकार',
  'col.phone': 'फ़ोन',
  'col.email': 'ईमेल',
  'col.firm': 'फर्म',
  'col.district': 'जिला',
  'col.designation': 'पदनाम',
  'col.status': 'स्थिति',
  'col.actions': 'क्रियाएँ',
  'col.skills': 'कौशल',
  'col.farmers': 'किसान',
  'col.projects': 'परियोजनाएँ',
  // Project-list columns
  'col.projectId': 'परियोजना आईडी',
  'col.farmer': 'किसान',
  'col.dealer': 'डीलर',
  'col.bank': 'बैंक',
  'col.branch': 'शाखा',
  'col.area': 'क्षेत्र',
  'col.structure': 'संरचना',
  'col.crop': 'फसल',
  'col.stage': 'चरण',
  'col.priority': 'प्राथमिकता',
  'col.projectCost': 'परियोजना लागत',
  'col.loanAmount': 'ऋण राशि',
  'col.totalSubsidy': 'कुल सब्सिडी',

  // Form field labels
  'field.firstName': 'पहला नाम',
  'field.lastName': 'अंतिम नाम',
  'field.phone': 'फ़ोन',
  'field.email': 'ईमेल',
  'field.role': 'भूमिका',
  'field.designation': 'पदनाम',
  'field.district': 'जिला',
  'field.state': 'राज्य',
  'field.firmName': 'फर्म का नाम',
  'field.gstNumber': 'GST नंबर',
  'field.address': 'पता',

  // Users
  'users.title': 'उपयोगकर्ता प्रबंधन',
  'users.subtitle': 'सभी सिस्टम उपयोगकर्ता प्रबंधित करें — एडमिन, कर्मचारी, डीलर, ठेकेदार और किसान।',
  'users.add': 'उपयोगकर्ता जोड़ें',

  // Agronomists
  'agronomists.title': 'कृषि विशेषज्ञ',
  'agronomists.subtitle': 'ग्रीनहाउस परियोजनाओं के लिए फसल विज्ञान सलाहकार।',
  'agronomists.add': 'कृषि विशेषज्ञ जोड़ें',

  // Contractors
  'contractors.title': 'ठेकेदार',
  'contractors.subtitle': 'संरचना, ड्रिप, बेड और रोपण ठेकेदारों को कई कौशल के साथ प्रबंधित करें।',
  'contractors.add': 'ठेकेदार जोड़ें',

  // Staff
  'staff.dprWorkflow': 'DPR वर्कफ़्लो',

  // Farmers
  'farmers.title': 'किसान नेटवर्क',
  'farmers.subtitle': 'पंजीकृत किसान, KYC स्थिति, भूमि रिकॉर्ड और विश्लेषण प्रबंधित करें।',

  // Projects
  'projects.title': 'परियोजनाएँ',
  'projects.subtitle': 'सभी कृषि ग्रीनहाउस परियोजनाओं को प्रबंधित और ट्रैक करें।',
  'projects.atStage': 'इस चरण की परियोजनाएँ: {stage}',
  'projects.new': 'नई परियोजना',

  // Reports
  'reports.title': 'रिपोर्ट और विश्लेषण',
  'reports.subtitle': 'प्रदर्शन अवलोकन — परियोजना पाइपलाइन, वित्त और क्षेत्र संचालन।',

  // Notifications
  'notifications.title': 'सूचनाएँ',
  'notifications.subtitle': 'सिस्टम अलर्ट, परियोजना अपडेट और सब्सिडी स्थिति परिवर्तन।',
  'notifications.unreadCount': '{count} अपठित',
  'notifications.markAllRead': 'सभी पढ़ा हुआ चिह्नित करें',

  // Navigation
  'nav.dashboard': 'डैशबोर्ड',
  'nav.projects': 'परियोजनाएँ',
  'nav.farmers': 'किसान',
  'nav.dealers': 'डीलर',
  'nav.contractors': 'ठेकेदार',
  'nav.agronomists': 'कृषि विशेषज्ञ',
  'nav.staff': 'कार्यालय कर्मचारी',
  'nav.users': 'उपयोगकर्ता',
  'nav.masters': 'मास्टर डेटा',
  'nav.reports': 'रिपोर्ट',
  'nav.documents': 'दस्तावेज़',
  'nav.settings': 'सेटिंग्स',
  'nav.notifications': 'सूचनाएँ',

  // Dealers page
  'dealers.title': 'डीलर',
  'dealers.subtitle': 'डीलर प्रोफ़ाइल, किसान और परियोजनाएँ प्रबंधित करें।',
  'dealers.add': 'डीलर जोड़ें',
  'dealers.activeDealers': 'सक्रिय डीलर',
  'dealers.networkFarmers': 'नेटवर्क किसान',
  'dealers.networkProjects': 'नेटवर्क परियोजनाएँ',
  'dealers.conversionRate': 'रूपांतरण दर',
};

export default hi;
