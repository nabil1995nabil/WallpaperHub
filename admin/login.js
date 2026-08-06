// ============================
// WallpaperHub Admin Login
// ============================

const form = document.getElementById("loginForm");

const username = document.getElementById("username");

const password = document.getElementById("password");

const errorMessage = document.getElementById("errorMessage");

// إنشاء حساب المدير لأول مرة
if(!localStorage.getItem("adminUsername")){

    localStorage.setItem("adminUsername","admin");

    localStorage.setItem("adminPassword","admin123");

}

form.addEventListener("submit",(e)=>{

    e.preventDefault();

    const user = username.value.trim();

    const pass = password.value.trim();

    const savedUser = localStorage.getItem("adminUsername");

    const savedPass = localStorage.getItem("adminPassword");

    if(user===savedUser && pass===savedPass){

        localStorage.setItem("adminLogged","true");

        location.href="admin.html";

    }else{

        errorMessage.textContent="اسم المستخدم أو كلمة المرور غير صحيحة";

        password.value="";

    }

});