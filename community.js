const feed = document.getElementById('feed');
const form = document.getElementById('composer');
const input = document.getElementById('message');
const send = form.querySelector('.send');

let supabaseClient = null;
let currentUser = null;
let realtimeChannel = null;
let reconnectTimer = null;
let membersCache = [];
let activeTab = 'general';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function initials(name){
  const value = String(name || 'عضو').trim();
  return value.slice(0, 1) || 'ع';
}

function timeOf(value){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ar-MA',{hour:'2-digit',minute:'2-digit'});
}

function avatarMarkup(user, className = 'message-avatar'){
  const name = user?.name || 'عضو';
  const avatar = String(user?.avatarUrl || '').trim();
  const image = avatar
    ? `<img src="${avatar.replace(/"/g, '&quot;')}" alt="" loading="lazy">`
    : initials(name);
  return `<div class="${className}">${image}</div>`;
}

function showToast(text){
  const toast = $('#toast');
  if(!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function updateComposerState(){
  const enabled = Boolean(currentUser);
  input.disabled = !enabled;
  send.disabled = !enabled;
  input.placeholder = enabled
    ? 'اكتب رسالة للمجتمع...'
    : 'سجّل الدخول للمشاركة في المجتمع';
}

async function initSupabase(){
  const response = await fetch('/api/supabase/config',{cache:'no-store'});
  if(!response.ok) throw new Error('Supabase غير مهيأ');

  const config = await response.json();
  const {createClient} = window.supabase;

  supabaseClient = createClient(config.url, config.anonKey);

  const {data} = await supabaseClient.auth.getSession();
  currentUser = data?.session?.user || null;

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateProfileCard();
    updateComposerState();
  });

  subscribeToMessages();
}

async function authHeaders(){
  if(!supabaseClient) return {};
  const {data} = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token;
  return token ? {Authorization:`Bearer ${token}`} : {};
}

async function fetchJson(url, options = {}){
  const response = await fetch(url,{
    cache:'no-store',
    ...options
  });

  const raw = await response.text();
  let result = {};
  try{
    result = raw ? JSON.parse(raw) : {};
  }catch(_error){
    result = {};
  }

  if(!response.ok || result.success === false){
    throw new Error(result.message || `تعذر تنفيذ الطلب (${response.status})`);
  }

  return result;
}

function renderMessage(message){
  const row = document.createElement('article');
  const mine = Boolean(currentUser && message.userId === currentUser.id);

  row.className = `message-row ${mine ? 'mine' : ''}`;
  row.dataset.id = String(message.id);

  const user = message.user || {};
  const stack = document.createElement('div');
  stack.className = 'message-stack';

  const meta = document.createElement('div');
  meta.className = 'message-meta';

  const name = document.createElement('b');
  name.textContent = user.name || 'عضو';

  const time = document.createElement('time');
  time.textContent = timeOf(message.createdAt);

  meta.append(name,time);

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = message.deleted ? 'تم حذف هذه الرسالة' : String(message.text || '');

  stack.append(meta,bubble);

  if(mine && !message.deleted){
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete-message';
    del.textContent = 'حذف الرسالة';
    del.addEventListener('click',() => deleteMessage(message.id,row));

    actions.append(del);
    stack.append(actions);
  }

  row.innerHTML = avatarMarkup(user);
  row.append(stack);

  return row;
}

function hasMessage(id){
  return Boolean(id && feed.querySelector(`[data-id="${CSS.escape(String(id))}"]`));
}

function addRealtimeMessage(message){
  if(!message?.id || hasMessage(message.id)) return;

  const welcome = feed.querySelector('.welcome');
  if(welcome) welcome.remove();

  feed.appendChild(renderMessage(message));
  feed.scrollTop = feed.scrollHeight;
  updateMessageCount();
}

function removeRealtimeMessage(id){
  const element = feed.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  if(element) element.remove();
  updateMessageCount();
}

async function loadMessages(){
  const result = await fetchJson('/api/community/messages?limit=100');

  feed.innerHTML = '';

  if(!Array.isArray(result.messages) || !result.messages.length){
    const welcome = document.createElement('article');
    welcome.className = 'welcome';
    welcome.innerHTML = `
      <div class="welcome-icon"><span class="material-icons-round">forum</span></div>
      <h2>أهلاً بك في المجتمع</h2>
      <p>شارك أفكارك واكتشف خلفيات جديدة وتحدث مع محبي WallpaperHub.</p>
    `;
    feed.appendChild(welcome);
    updateMessageCount();
    return;
  }

  result.messages.forEach(message => feed.appendChild(renderMessage(message)));
  feed.scrollTop = feed.scrollHeight;
  updateMessageCount();
}

function subscribeToMessages(){
  if(!supabaseClient) return;

  if(realtimeChannel){
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  clearTimeout(reconnectTimer);

  realtimeChannel = supabaseClient
    .channel('community-messages-live')
    .on('postgres_changes',{
      event:'INSERT',
      schema:'public',
      table:'community_messages'
    },async payload => {
      const row = payload?.new;
      if(!row?.id || hasMessage(row.id)) return;

      try{
        const result = await fetchJson(
          `/api/community/messages/${encodeURIComponent(row.id)}`
        );
        if(result?.message) addRealtimeMessage(result.message);
      }catch(_error){
        // The INSERT already exists. Refresh is only a fallback.
        loadMessages().catch(()=>{});
      }
    })
    .on('postgres_changes',{
      event:'DELETE',
      schema:'public',
      table:'community_messages'
    },payload => {
      removeRealtimeMessage(payload?.old?.id);
    })
    .subscribe(status => {
      if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
        reconnectTimer = setTimeout(() => subscribeToMessages(),5000);
      }
    });
}

async function deleteMessage(id, element){
  const ok = window.confirm('حذف هذه الرسالة؟');
  if(!ok) return;

  try{
    const result = await fetchJson(
      `/api/community/messages/${encodeURIComponent(id)}`,
      {method:'DELETE',headers:await authHeaders()}
    );

    if(result.success){
      element.remove();
      showToast('تم حذف الرسالة');
      updateMessageCount();
    }
  }catch(error){
    showToast(error.message);
  }
}

async function sendMessage(){
  const content = input.value.trim();
  if(!content || !currentUser || send.disabled) return;

  send.disabled = true;

  try{
    const result = await fetchJson('/api/community/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...(await authHeaders())
      },
      body:JSON.stringify({content})
    });

    if(result?.message){
      addRealtimeMessage(result.message);
    }

    input.value = '';
    input.focus();
  }catch(error){
    showToast(error.message);
  }finally{
    updateComposerState();
  }
}

form.addEventListener('submit',event => {
  event.preventDefault();
  sendMessage();
});

input.addEventListener('keydown',event => {
  if(event.key === 'Enter' && !event.shiftKey){
    event.preventDefault();
    sendMessage();
  }
});

function updateProfileCard(){
  const user = currentUser;
  const metadata = user?.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    user?.email?.split('@')[0] ||
    'عضو في المجتمع';

  const avatar =
    metadata.avatar_url ||
    metadata.picture ||
    '';

  $('#profileName').textContent = name;
  $('#profileSubtitle').textContent =
    user ? (user.email || 'عضو في مجتمع WallpaperHub') : 'سجّل الدخول للمشاركة';

  const target = $('#profileAvatar');
  target.innerHTML = avatar
    ? `<img src="${avatar.replace(/"/g,'&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : initials(name);

  const topAvatar = $('#profileButton .avatar-fallback');
  if(topAvatar){
    topAvatar.textContent = initials(name);
    if(avatar){
      topAvatar.innerHTML = `<img src="${avatar.replace(/"/g,'&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    }
  }
}

function updateMessageCount(){
  const count = feed.querySelectorAll('.message-row').length;
  $('#statMessages').textContent = String(count);
}

function memberElement(member){
  const item = document.createElement('div');
  item.className = 'member-item';
  item.dataset.name = `${member.name || ''} ${member.username || ''}`.toLowerCase();

  const avatar = String(member.avatarUrl || '').trim();
  const image = avatar
    ? `<img src="${avatar.replace(/"/g,'&quot;')}" alt="" loading="lazy">`
    : initials(member.name);

  item.innerHTML = `
    <div class="member-avatar">${image}</div>
    <div class="member-info">
      <b></b>
      <small>${member.username ? '@' + member.username : 'عضو في المجتمع'}</small>
    </div>
    <i class="member-online"></i>
  `;
  $('.member-info b',item).textContent = member.name || 'عضو';

  return item;
}

async function loadMembers(){
  const preview = $('#membersPreview');
  preview.innerHTML = '<div class="mini-loading">جاري تحميل الأعضاء...</div>';

  try{
    const result = await fetchJson('/api/community/members?limit=50');
    membersCache = Array.isArray(result.members) ? result.members : [];

    $('#statMembers').textContent = String(membersCache.length);

    preview.innerHTML = '';
    membersCache.slice(0,5).forEach(member => {
      preview.appendChild(memberElement(member));
    });

    if(!membersCache.length){
      preview.innerHTML = '<div class="mini-loading">لا يوجد أعضاء لعرضهم بعد.</div>';
    }
  }catch(error){
    preview.innerHTML = `<div class="mini-loading">${error.message}</div>`;
  }
}

function renderAllMembers(){
  const target = $('#allMembers');
  target.innerHTML = '';

  if(!membersCache.length){
    target.innerHTML = '<div class="mini-loading">لا توجد بيانات أعضاء متاحة.</div>';
    return;
  }

  membersCache.forEach(member => target.appendChild(memberElement(member)));
}

function showTab(tab){
  activeTab = tab;

  $$('.room-tab').forEach(button => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });

  $('#generalPanel').classList.toggle('hidden',tab !== 'general');
  $('#membersPanel').classList.toggle('hidden',tab !== 'members');
  $('#filesPanel').classList.toggle('hidden',tab !== 'files');
  $('#topicsPanel').classList.toggle('hidden',tab !== 'topics');

  if(tab === 'members') renderAllMembers();
}

$$('.room-tab').forEach(button => {
  button.addEventListener('click',() => showTab(button.dataset.tab));
});

$$('[data-back-general]').forEach(button => {
  button.addEventListener('click',() => showTab('general'));
});

$('#viewMembers').addEventListener('click',() => showTab('members'));

$('#joinChat').addEventListener('click',() => {
  showTab('general');
  input.focus();
  document.querySelector('.chat-card').scrollIntoView({behavior:'smooth',block:'start'});
});

$('#focusSearch').addEventListener('click',() => {
  $('#memberSearch').focus();
});

$('#memberSearch').addEventListener('input',event => {
  const query = event.target.value.trim().toLowerCase();

  if(activeTab === 'members'){
    $$('.member-item', $('#allMembers')).forEach(item => {
      item.style.display = !query || item.dataset.name.includes(query) ? '' : 'none';
    });
    return;
  }

  $$('.message-row', feed).forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = !query || text.includes(query) ? '' : 'none';
  });
});

$('#emojiButton').addEventListener('click',() => {
  const emojis = ['😊','❤️','🔥','👏','😍','✨','👍'];
  const emoji = emojis[Math.floor(Math.random()*emojis.length)];
  input.value += emoji;
  input.focus();
});

$('#attachButton').addEventListener('click',() => {
  showToast('إرفاق الملفات سيُفعّل عند إضافة دعم الملفات للمجتمع');
});

$('.notification-button').addEventListener('click',() => {
  showToast('لا توجد إشعارات جديدة');
});

$('.theme-button').addEventListener('click',() => {
  showToast('المجتمع يعمل حاليًا بالوضع الداكن');
});

$('#profileButton').addEventListener('click',() => {
  showToast(currentUser ? 'أنت داخل المجتمع الآن' : 'سجّل الدخول للمشاركة');
});

(async function(){
  try{
    await initSupabase();
    updateProfileCard();
    updateComposerState();
    await Promise.all([
      loadMessages(),
      loadMembers()
    ]);
  }catch(error){
    updateComposerState();
    showToast(error.message);
  }
})();
