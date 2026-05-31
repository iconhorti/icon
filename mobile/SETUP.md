# ICON Greenhouse — Mobile App Setup

## Prerequisites

Install once on your PC:

1. **Node.js** (v18+) — https://nodejs.org
2. **Expo CLI**
   ```
   npm install -g expo-cli eas-cli
   ```
3. **Android Studio** (for emulator) — https://developer.android.com/studio  
   OR install **Expo Go** on your Android phone from the Play Store.

---

## Step 1 — Install dependencies

Open Command Prompt in this folder:
```
cd "E:\Google Drive\01-Pankaj\199 ICON_Accounts\95 Software Design\ICON\mobile"
npm install
```

---

## Step 2 — Configure the backend URL

Open `src/api/client.js` and set the correct URL:

**Android Emulator** (default — already set):
```js
export const API_BASE_URL = 'http://10.0.2.2:8000/api/v1';
```

**Physical Android Device** (change to your PC's local IP):
```js
export const API_BASE_URL = 'http://192.168.1.XXX:8000/api/v1';
```
Find your PC's IP: open Command Prompt → type `ipconfig` → look for `IPv4 Address`.

Make sure your backend is running: `run_all.bat`

---

## Step 3 — Run the app

### On Android Emulator
1. Open Android Studio → AVD Manager → Start a virtual device
2. Then run:
```
npm run android
```

### On Physical Device (easiest!)
1. Install **Expo Go** from Play Store on your phone
2. Make sure phone & PC are on the **same WiFi**
3. Run:
```
npm start
```
4. Scan the QR code shown in the terminal with **Expo Go**

---

## Step 4 — Build APK for distribution

When ready to share with your team:
```
eas build --platform android --profile preview
```
This creates an APK you can install on any Android device.

---

## Screens by Role

| Role | Screens |
|------|---------|
| **Dealer** | Dashboard, My Farmers, Register Farmer, Projects, Create Project, Upload Docs |
| **Farmer** | Dashboard with progress tracker, 19-stage timeline, Subsidy summary, Documents |
| **Admin / Owner** | Full dashboard, All projects with filters, Stage advance, Document verification |
| **Office Staff** | Same as Admin |
| **Others** | Admin view (Project Manager, Bank Officer, Agency, Agronomist) |

---

## Folder Structure

```
mobile/
├── App.js                    ← entry point
├── src/
│   ├── api/client.js         ← all API calls (mirrors web)
│   ├── context/AuthContext.js← login/logout/token storage
│   ├── navigation/AppNavigator.js ← role-based routing
│   ├── screens/
│   │   ├── shared/           ← Login, Profile, Notifications, DocumentUpload
│   │   ├── dealer/           ← Dashboard, FarmerList, RegisterFarmer, ProjectList, CreateProject
│   │   ├── farmer/           ← Dashboard (19-stage tracker), ProjectDetail
│   │   └── admin/            ← Dashboard, ProjectList, ProjectDetail, DocumentVerify
│   ├── components/UI.js      ← Card, Button, Input, StageBadge, KpiCard, etc.
│   └── styles/theme.js       ← colors, spacing, fonts
```

---

## Troubleshooting

**"Network Error" on login**
- Make sure backend is running (`run_all.bat`)
- Check the API_BASE_URL in `src/api/client.js`
- On physical device: use your PC's local IP, not `10.0.2.2`

**Metro bundler error**
```
npm start -- --clear
```

**Package install errors**
```
npm install --legacy-peer-deps
```
