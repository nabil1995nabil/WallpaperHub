const title = document.getElementById("title");

title.innerHTML =
"WallpaperHub"
.split("")
.map(letter=>`<span>${letter}</span>`)
.join("");


setTimeout(()=>{

window.location.href="home.html";

},5000);