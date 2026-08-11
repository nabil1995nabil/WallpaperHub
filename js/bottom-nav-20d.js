// ==================================
// WallpaperHub 20D Bottom Nav Engine
// Canvas Plasma + Magnetic Animation
// ==================================


const bottomNav = document.querySelector(".bottom-nav");


if(bottomNav){


const canvas = document.createElement("canvas");

canvas.className = "plasma-canvas";

bottomNav.prepend(canvas);


const ctx = canvas.getContext("2d");



let width = canvas.width = bottomNav.offsetWidth;
let height = canvas.height = bottomNav.offsetHeight;



window.addEventListener("resize",()=>{

    width = canvas.width = bottomNav.offsetWidth;
    height = canvas.height = bottomNav.offsetHeight;

});



let particles=[];



function createParticles(x,y){


    for(let i=0;i<18;i++){


        particles.push({

            x:x,
            y:y,

            vx:(Math.random()-.5)*5,
            vy:(Math.random()-.5)*5,

            size:
            Math.random()*3+1,

            alpha:1

        });


    }

}




function drawParticles(){


ctx.clearRect(
0,
0,
width,
height
);



particles.forEach((p,index)=>{


p.x += p.vx;
p.y += p.vy;


p.alpha -= .025;



ctx.beginPath();


ctx.arc(
p.x,
p.y,
p.size,
0,
Math.PI*2
);



ctx.fillStyle =
`rgba(0,242,254,${p.alpha})`;


ctx.shadowBlur=10;

ctx.shadowColor="#00f2fe";


ctx.fill();



if(p.alpha<=0){

particles.splice(index,1);

}



});



requestAnimationFrame(drawParticles);


}


drawParticles();




// ===============================
// Navigation Active + Plasma Line
// ===============================


const items =
document.querySelectorAll(".nav-item");


let active =
document.createElement("div");


active.className="plasma-line";


bottomNav.appendChild(active);



function moveIndicator(item){


const rect =
item.getBoundingClientRect();


const navRect =
bottomNav.getBoundingClientRect();



active.style.left =
(rect.left-navRect.left+
rect.width/2-25)+"px";



}




items.forEach((item,index)=>{


item.addEventListener("click",()=>{


items.forEach(i=>
i.classList.remove("active")
);



item.classList.add("active");



moveIndicator(item);



// مكان الانفجار

const rect =
item.getBoundingClientRect();


const navRect =
bottomNav.getBoundingClientRect();



createParticles(

rect.left-navRect.left+
rect.width/2,


rect.top-navRect.top+
rect.height/2

);



});



});



// أول تشغيل

const first =
document.querySelector(".nav-item.active");


if(first){

setTimeout(()=>{

moveIndicator(first);

},200);

}



// ===============================
// Magnetic 3D Mouse Effect
// ===============================


bottomNav.addEventListener(
"mousemove",
(e)=>{


const rect =
bottomNav.getBoundingClientRect();


const x =
e.clientX -
(rect.left+rect.width/2);



const y =
e.clientY -
(rect.top+rect.height/2);



bottomNav.style.transform =
`
translateX(-50%)
rotateX(${-y*.15}deg)
rotateY(${x*.08}deg)
`;



items.forEach(btn=>{


const b =
btn.getBoundingClientRect();



const bx =
e.clientX -
(b.left+b.width/2);



const by =
e.clientY -
(b.top+b.height/2);



const dist =
Math.sqrt(
bx*bx+by*by
);



if(dist<80){


btn.style.transform=
`
translateZ(35px)
rotateY(${bx*.15}deg)
rotateX(${-by*.15}deg)
`;



}else{


btn.style.transform="";

}



});



});





bottomNav.addEventListener(
"mouseleave",
()=>{


bottomNav.style.transform=
"translateX(-50%)";



items.forEach(btn=>{

btn.style.transform="";

});


});



}