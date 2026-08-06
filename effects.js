const items = document.querySelectorAll(
".card,.badge,.stat,.menu-item,.wallpaper-card,.category-card,.slider-item"
);

items.forEach(item=>{

item.addEventListener("mousemove",(e)=>{

const rect=item.getBoundingClientRect();

const x=e.clientX-rect.left;
const y=e.clientY-rect.top;

const rotateY=((x/rect.width)-0.5)*18;
const rotateX=((y/rect.height)-0.5)*-18;

item.style.transform=
`perspective(1200px)
rotateX(${rotateX}deg)
rotateY(${rotateY}deg)
translateY(-8px)
scale(1.03)`;

});

item.addEventListener("mouseleave",()=>{

item.style.transform="";

});

});