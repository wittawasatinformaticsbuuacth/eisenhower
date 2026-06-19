# Deploy Guide — Eisenhower Matrix

## 1. Firebase Project

1. ไปที่ https://console.firebase.google.com
2. คลิก **Create a new Firebase project**
3. ตั้งชื่อ เช่น `eisenhower-matrix`
4. ปิด Google Analytics → **Create project**

---

## 2. เพิ่ม Web App + copy config

1. Project Overview → คลิก **+ Add app** → เลือก **</>** (Web)
2. ตั้งชื่อ app → **Register app**
3. copy ค่า config ลงใน `.env`:

```
VITE_API_KEY=
VITE_AUTH_DOMAIN=
VITE_PROJECT_ID=
VITE_STORAGE_BUCKET=
VITE_MESSAGING_SENDER_ID=
VITE_APP_ID=
```

---

## 3. เปิด Authentication (Facebook)

1. Firebase Console → **Security** → **Authentication** → **Get started**
2. แท็บ **Sign-in method** → **Facebook** → เปิด
3. กรอก App ID + App Secret (ได้จากขั้นตอน Facebook ด้านล่าง)
4. **Save** → copy **OAuth redirect URI** ที่ปรากฏ

---

## 4. Facebook Developer App

1. ไปที่ https://developers.facebook.com → **My Apps** → **Create App**
2. ตั้งชื่อ app → ใส่ contact email → **Next**
3. Use cases → เลือก **"Authenticate and request data from users with Facebook Login"** → **Next**
4. ผ่าน Business / Requirements → **Create app**
5. เมนูซ้าย → **App settings** → **Basic**
   - copy **App ID** และ **App secret** → ไปใส่ใน Firebase Authentication (ขั้นตอน 3)
6. เมนูซ้าย → **Use cases** → **Customize** → **Permissions and features**
   - คลิก **+ Add** ที่ **email**
7. เมนูซ้าย → **Use cases** → **Settings** (ใต้ Facebook Login)
   - ช่อง **Valid OAuth Redirect URIs** → วาง URI จาก Firebase → **Save changes**

---

## 5. Firestore Database

1. Firebase Console → **Databases & Storage** → **Firestore Database** → **Create database**
2. Location: **asia-southeast1 (Singapore)**
3. Security rules: **Production mode** → **Create**
4. แท็บ **Rules** → ลบ rule เดิม → วาง rule นี้ → **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 6. Deploy

```bash
# ติดตั้ง Firebase CLI (ครั้งแรกครั้งเดียว)
npm install -g firebase-tools

# login Firebase
firebase login

# init hosting (เลือก Hosting, ใช้ dist เป็น public dir, SPA = yes)
firebase init hosting

# แก้ firebase.json ให้ public เป็น "dist" (ถ้า init เปลี่ยนเป็น "public")
# "public": "dist"

# build + deploy
npm run build
firebase deploy
```

URL สาธารณะ: **https://eisenhower-matrix-66cc6.web.app**

---

## 7. Firebase Login Re-authentication

ถ้า credentials หมดอายุหรือเกิด error: `Your credentials are no longer valid`

```bash
firebase login --reauth
```

เข้าไปยืนยัน Google account → สำเร็จ

---

## 8. Troubleshoot

| ปัญหา                           | สาเหตุ                                       | วิธีแก้                                                  |
| ------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| หน้าขาว                         | Babel CDN ไม่รองรับ ES module                | เปลี่ยนเป็น `type="module"` + esm.sh                     |
| `Invalid Scopes: email`         | Facebook app ไม่ได้ add email permission     | Use cases → Customize → + Add email                      |
| Firebase Hosting Setup Complete | `firebase.json` ชี้ไปที่ `public` แทน `dist` | แก้ `"public": "dist"` ใน firebase.json แล้ว deploy ใหม่ |
| `&&` ไม่ทำงานใน PowerShell      | PowerShell ไม่รองรับ `&&`                    | รันทีละคำสั่งแยกกัน                                      |
| คนอื่น login ไม่ได้             | Facebook App ยัง Unpublished                 | Meta → **Publish** app                                   |
