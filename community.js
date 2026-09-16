const feed = document.getElementById('feed');
const form = document.getElementById('composer');
const input = document.getElementById('message');
const send = form.querySelector('.send');

let supabaseClient = null;
let currentUser = null;
let realtimeChannel = null;

async function initSupabase(){
  const response = await fetch('/api/supabase/config', {cache:'no-store'});
  if(!response.ok) throw new Error('Supabase غير مهيأ');
  const config = await response.json();
  const { createClient } = window.supabase;
  supabaseClient = createClient(config.url, config.anonKey);
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data?.session?.user || null;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateComposerState();
    subscribeToMessages();
  });
  subscribeToMessages();
}

function updateComposerState(){
  input.disabled = !currentUser;
  send.disabled = !currentUser;
  input.placeholder = currentUser ? 'اكتب رسالة للمجتمع...' : 'سجّل الدخول للمشاركة في المجتمع';
}

async function authHeaders(){
  const { data } = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token;
  return token ? {Authorization:`Bearer ${token}`} : {};
}

function timeOf(value){
  return new Date(value).toLocaleTimeString('ar-MA',{hour:'2-digit',minute:'2-digit'});
}

function escapeText(value){
  return String(value ?? '');
}

function renderMessage(message){
  const article = document.createElement('article');
  article.className = `message ${currentUser && message.userId === currentUser.id ? 'mine' : ''}`;
  article.dataset.id = message.id;

  const top = document.createElement('div');
  top.className = 'message-top';
  const name = document.createElement('b');
  name.textContent = escapeText(message.user?.name || 'عضو');
  const time = document.createElement('small');
  time.textContent = timeOf(message.createdAt);
  top.append(name, time);

  const text = document.createElement('div');
  text.className = 'message-text';
  text.textContent = escapeText(message.text);
  article.append(top, text);

  if(currentUser && message.userId === currentUser.id && !message.deleted){
    const actions = document.createElement('button');
    actions.type = 'button';
    actions.className = 'delete-message';
    actions.textContent = 'حذف';
    actions.onclick = () => deleteMessage(message.id, article);
    article.append(actions);
  }
  return article;
}

function showStatus(text){
  const old = feed.querySelector('.status-message');
  if(old) old.remove();
  const el = document.createElement('div');
  el.className = 'status-message';
  el.textContent = text;
  feed.appendChild(el);
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
}

function removeRealtimeMessage(id){
  const element = feed.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  if(element) element.remove();
}

function subscribeToMessages(){
  if(!supabaseClient) return;
  if(realtimeChannel){
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabaseClient
    .channel('community-messages-live')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'community_messages'
    }, async payload => {
      const row = payload?.new;
      if(!row?.id) return;
      try{
        const response = await fetch(`/api/community/messages/${encodeURIComponent(row.id)}`, {cache:'no-store'});
        if(response.ok){
          const result = await response.json();
          if(result?.success && result.message) addRealtimeMessage(result.message);
          return;
        }
      }catch(_error){}
      // Fallback: refresh the feed if enrichment failed.
      loadMessages().catch(()=>{});
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'community_messages'
    }, payload => {
      removeRealtimeMessage(payload?.old?.id);
    })
    .subscribe(status => {
      if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
        setTimeout(() => subscribeToMessages(), 2500);
      }
    });
}

async function loadMessages(){
  const response = await fetch('/api/community/messages?limit=100',{cache:'no-store'});
  const result = await response.json();
  if(!response.ok || !result.success) throw new Error(result.message || 'تعذر تحميل الرسائل');

  feed.innerHTML = '';
  if(!result.messages.length){
    const welcome = document.createElement('article');
    welcome.className = 'welcome';
    welcome.innerHTML = '<div class="welcome-icon">✦</div><h2>أهلاً بك في المجتمع</h2><p>هنا تبدأ المحادثات والمشاركة. كن أول من يكتب شيئاً.</p>';
    feed.appendChild(welcome);
    return;
  }
  result.messages.forEach(m => feed.appendChild(renderMessage(m)));
  feed.scrollTop = feed.scrollHeight;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const content = input.value.trim();
  if(!content || !currentUser || send.disabled) return;
  send.disabled = true;
  try{
    const headers = {'Content-Type':'application/json', ...(await authHeaders())};
    const response = await fetch('/api/community/messages',{method:'POST',headers,body:JSON.stringify({content})});
    const result = await response.json();
    if(!response.ok || !result.success) throw new Error(result.message || 'تعذر إرسال الرسالة');
    const welcome = feed.querySelector('.welcome');
    if(welcome) welcome.remove();
    addRealtimeMessage(result.message);
    input.value = '';
    feed.scrollTop = feed.scrollHeight;
  }catch(error){
    alert(error.message);
  }finally{
    updateComposerState();
  }
});

async function deleteMessage(id, element){
  if(!confirm('حذف هذه الرسالة؟')) return;
  try{
    const response = await fetch(`/api/community/messages/${encodeURIComponent(id)}`,{method:'DELETE',headers:await authHeaders()});
    const result = await response.json();
    if(!response.ok || !result.success) throw new Error(result.message || 'تعذر حذف الرسالة');
    element.remove();
  }catch(error){ alert(error.message); }
}

(async function(){
  try{
    await initSupabase();
    updateComposerState();
    await loadMessages();
  }catch(error){
    updateComposerState();
    showStatus(error.message);
  }
})();
