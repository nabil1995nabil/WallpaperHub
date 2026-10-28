self.addEventListener("push",event=>{
 let data={};try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?event.data.text():""}}
 event.waitUntil(self.registration.showNotification(String(data.title||"WallpaperHub"),{
  body:String(data.body||"لديك إشعار جديد"),icon:data.icon||"/icons/icon-192.png",badge:data.badge||"/icons/icon-192.png",
  tag:String(data.tag||"wallpaperhub-notification"),data:{url:String(data.url||"/notifications.html")},dir:"rtl",lang:"ar"
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();const target=new URL(event.notification.data?.url||"/notifications.html",self.location.origin).href;
 event.waitUntil((async()=>{const list=await clients.matchAll({type:"window",includeUncontrolled:true});for(const client of list){if(client.url.startsWith(self.location.origin)&&"focus"in client){await client.focus();if("navigate"in client)await client.navigate(target);return}}if(clients.openWindow)await clients.openWindow(target)})());
});
