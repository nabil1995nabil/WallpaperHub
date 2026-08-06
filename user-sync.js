// =====================================
// WallpaperHub - User Sync (No Firestore)
// =====================================

import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";


// =====================================
// قراءة المفضلة المحلية
// =====================================

function getLocalFavorites() {

    try {

        const data = JSON.parse(
            localStorage.getItem("favorites") || "[]"
        );

        if (!Array.isArray(data)) {
            return [];
        }

        return data.map(String);

    } catch(error){

        console.error(
            "خطأ قراءة المفضلة:",
            error
        );

        return [];

    }

}


// =====================================
// حفظ المفضلة محلياً
// =====================================

function saveLocalFavorites(favorites){

    const cleanFavorites = [
        ...new Set(
            favorites.map(String)
        )
    ];


    localStorage.setItem(
        "favorites",
        JSON.stringify(cleanFavorites)
    );


    localStorage.setItem(
        "favoritesCount",
        String(cleanFavorites.length)
    );

}


// =====================================
// بيانات المستخدم محلياً فقط
// =====================================

function syncUserData(user){

    if(!user) return;


    const favorites =
        getLocalFavorites();


    const downloads =
        Number(
            localStorage.getItem("downloads") || 0
        );


    const userData = {

        uid: user.uid,

        name:
        user.displayName ||
        "مستخدم WallpaperHub",

        email:
        user.email || "",

        photo:
        user.photoURL || "",

        favorites:
        favorites,

        favoritesCount:
        favorites.length,

        downloads:
        downloads

    };


    localStorage.setItem(
        "userData",
        JSON.stringify(userData)
    );


    window.dispatchEvent(
        new CustomEvent(
            "wallpaperhub:user-synced",
            {
                detail:userData
            }
        )
    );


    console.log(
        "تم تحديث بيانات المستخدم محلياً"
    );

}


// =====================================
// مراقبة تسجيل الدخول فقط
// =====================================

onAuthStateChanged(
    auth,
    (user)=>{

        if(!user){

            console.log(
                "لا يوجد مستخدم مسجل"
            );

            return;

        }


        syncUserData(user);

    }
);


// =====================================
// Export
// =====================================

export {
    syncUserData,
    getLocalFavorites,
    saveLocalFavorites
};