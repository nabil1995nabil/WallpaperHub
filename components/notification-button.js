const notiBtn =
document.getElementById("notiBtn");


const notiBadge =
document.getElementById("notiBadge");


const bellIcon =
document.getElementById("bellIcon");



if(notiBtn){


let count = 0;



function playNotificationSound(){


const audioCtx =
new (window.AudioContext ||
window.webkitAudioContext)();



const osc =
audioCtx.createOscillator();


const gain =
audioCtx.createGain();



osc.type="sine";


osc.frequency.value=880;


gain.gain.value=.3;



osc.connect(gain);

gain.connect(
audioCtx.destination
);



osc.start();


osc.stop(
audioCtx.currentTime+.4
);


}





function updateNotifications(amount){


count += amount;


notiBadge.textContent =
count;



if(count>0){


notiBadge.classList.add(
"badge-active"
);


bellIcon.classList.add(
"bell-shake"
);


playNotificationSound();



setTimeout(()=>{


bellIcon.classList.remove(
"bell-shake"
);


},1000);



}


}




notiBtn.onclick=()=>{


count=0;


notiBadge.textContent="0";


notiBadge.classList.remove(
"badge-active"
);


};




// تجربة مؤقتة
// من بعد نحيدوها ونربطوها بالإشعارات الحقيقية

setTimeout(()=>{

updateNotifications(1);

},2000);



}