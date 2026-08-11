// ==============================
// WallpaperHub AI Siri Button
// ==============================


const canvas =
document.getElementById("siriCanvas");


const button =
document.getElementById("siriButton");



if(canvas && button){


const ctx =
canvas.getContext("2d");



const size = 300;


canvas.width = size;
canvas.height = size;



const centerX = size / 2;
const centerY = size / 2;



let isActive = false;
let isHovered = false;



let currentRadius = 75;


const baseRadiusNormal = 75;

const baseRadiusActive = 60;




const colors = [

'rgba(0,122,255,.8)',

'rgba(142,68,173,.8)',

'rgba(255,0,128,.8)',

'rgba(0,242,254,.8)'

];





const energyStrands = [];



for(let i=0;i<10;i++){


energyStrands.push({

color:
colors[i % colors.length],


radiusOffset:
(Math.random()-.5)*15,


baseSpeed:
Math.random()*.003+.002,


baseRotSpeed:
(Math.random()*.002+.001) *
(Math.random()>0.5?1:-1),


phase:
Math.random()*Math.PI*2,


baseAmp1:
Math.random()*10+8,


baseAmp2:
Math.random()*8+5,


frequency1:
Math.floor(Math.random()*3)+3,


frequency2:
Math.floor(Math.random()*4)+5,


currentRotation:
Math.random()*Math.PI*2


});


}






button.addEventListener(
"mouseenter",
()=>{

isHovered=true;

});



button.addEventListener(
"mouseleave",
()=>{

isHovered=false;
isActive=false;

});



button.addEventListener(
"mousedown",
()=>{

isActive=true;

});



button.addEventListener(
"mouseup",
()=>{

isActive=false;

});




// الهاتف

button.addEventListener(
"touchstart",
()=>{

isActive=true;

});



button.addEventListener(
"touchend",
()=>{

isActive=false;

});





// فتح صفحة AI

button.onclick=()=>{

location.href="ai.html";

};







function drawAI(){



ctx.clearRect(
0,
0,
size,
size
);



let target =
isActive ?
baseRadiusActive :
baseRadiusNormal;



currentRadius +=
(target-currentRadius)*0.15;






energyStrands.forEach(strand=>{


ctx.save();



ctx.translate(
centerX,
centerY
);



let speed = 1;



if(isActive)
speed=4;


else if(isHovered)
speed=1.8;




strand.currentRotation +=
strand.baseRotSpeed * speed;



ctx.rotate(
strand.currentRotation
);



ctx.shadowBlur =
isActive ? 20 : 12;


ctx.shadowColor =
strand.color;



ctx.strokeStyle =
strand.color;



ctx.lineWidth = 1.5;



ctx.beginPath();




for(
let angle=0;
angle<=Math.PI*2;
angle+=0.05
){


const wave1 =
Math.sin(
angle*strand.frequency1+
strand.phase
)
*
strand.baseAmp1;


const wave2 =
Math.cos(
angle*strand.frequency2-
strand.phase
)
*
strand.baseAmp2;



const r =
currentRadius +
strand.radiusOffset +
wave1+
wave2;




const x =
Math.cos(angle)*r;



const y =
Math.sin(angle)*r;




if(angle===0)

ctx.moveTo(x,y);

else

ctx.lineTo(x,y);



}



ctx.closePath();

ctx.stroke();


ctx.restore();



strand.phase +=
strand.baseSpeed*speed;



});



requestAnimationFrame(
drawAI
);


}




drawAI();



}