WallpaperHub — Real Voice Room

This version implements a real multi-user voice room using WebRTC for audio and Supabase Realtime Broadcast/Presence for signaling and participant discovery.

Files:
- community.html
- community.css
- community.js

Requirements:
1. Supabase Realtime must be available/enabled for the project.
2. Users must be authenticated to join the voice room.
3. The site must run over HTTPS (Vercel is fine).
4. WebRTC uses Google public STUN servers. For users behind restrictive NAT/firewalls, add a TURN server for production reliability.

Behavior:
- Opening the voice UI only changes the hero; the written community chat remains visible.
- "انضم إلى المحادثة المباشرة" requests the microphone and joins the shared WebRTC room.
- Users in the same public room hear each other in real time.
- The same button mutes/unmutes the local microphone after joining.
- "العودة إلى النقاش" closes all peer connections, stops the microphone, leaves Supabase Presence, and returns to the normal community hero.
