import { auth } from "./firebase.js";
import {
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const googleBtn = document.getElementById("googleBtn");
const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

// =========================
// تسجيل عبر Google
// =========================
googleBtn.onclick = async () => {
    try {
        const provider = new GoogleAuthProvider();
        
        // إجبار اختيار الحساب في كل مرة
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        const result = await signInWithPopup(auth, provider);
        console.log("Google login success:", result.user);
        
        // الانتقال بعد التأكد من النجاح
        location.href = "profile.html";

    } catch (error) {
        console.error("Google login error:", error);
        
        // رسائل خطأ أكثر وضوحاً
        let errorMessage = "حدث خطأ أثناء تسجيل الدخول";
        
        switch(error.code) {
            case 'auth/popup-blocked':
                errorMessage = "تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.";
                break;
            case 'auth/popup-closed-by-user':
                errorMessage = "تم إغلاق نافذة تسجيل الدخول.";
                break;
            case 'auth/cancelled-popup-request':
                errorMessage = "تم إلغاء طلب تسجيل الدخول.";
                break;
            case 'auth/unauthorized-domain':
                errorMessage = "هذا النطاق غير مصرح له. أضفه في إعدادات Firebase.";
                break;
            case 'auth/operation-not-allowed':
                errorMessage = "تسجيل الدخول عبر Google غير مفعل في Firebase Console.";
                break;
            default:
                errorMessage = error.message;
        }
        
        alert(errorMessage);
    }
};

// =========================
// إنشاء حساب
// =========================
registerBtn.onclick = async () => {
    try {
        if (!email.value || !password.value) {
            alert("يرجى إدخال البريد وكلمة المرور");
            return;
        }
        
        if (password.value.length < 6) {
            alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email.value,
            password.value
        );

        await updateProfile(userCredential.user, {
            displayName: "مستخدم WallpaperHub"
        });

        location.href = "profile.html";

    } catch (error) {
        console.error("Register error:", error);
        alert(error.message);
    }
};

// =========================
// تسجيل الدخول
// =========================
loginBtn.onclick = async () => {
    try {
        if (!email.value || !password.value) {
            alert("يرجى إدخال البريد وكلمة المرور");
            return;
        }

        await signInWithEmailAndPassword(
            auth,
            email.value,
            password.value
        );

        location.href = "profile.html";

    } catch (error) {
        console.error("Login error:", error);
        alert(error.message);
    }
};
