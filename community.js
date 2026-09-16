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
let privateTarget = null;
let privateConversationId = null;
let privateRealtimeChannel = null;
let privateConversationsCache = [];
let pendingImageData = null;
let pendingFileData = null;
let pendingPrivateImageData = null;
let pendingPrivateFileData = null;

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
    if(currentUser) loadPrivateConversations().catch(()=>{});
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
  const hasImage = Boolean(message.imageUrl) && !message.deleted;
  bubble.className = `message-bubble ${hasImage ? 'has-image' : ''}`;

  const hasFile = Boolean(message.fileUrl) && !message.deleted;
  bubble.className = `message-bubble ${hasImage ? 'has-image' : ''} ${hasFile ? 'has-file' : ''}`;

  if(message.deleted){
    bubble.textContent = 'تم حذف هذه الرسالة';
  }else if(hasFile){
    const link = document.createElement('a');
    link.className = 'message-file-card';
    link.href = message.fileUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.download = message.fileName || '';
    const icon = document.createElement('div'); icon.className='message-file-icon'; icon.innerHTML=`<span class="material-icons-round">${fileIcon(message.fileName,message.fileType)}</span>`;
    const info = document.createElement('div'); info.className='message-file-info';
    const name = document.createElement('span'); name.className='message-file-name'; name.textContent=message.fileName || 'ملف';
    const meta = document.createElement('div'); meta.className='message-file-meta';
    const type = document.createElement('span'); type.className='message-file-type'; type.textContent=fileTypeLabel(message.fileName,message.fileType);
    const size = document.createElement('span'); size.className='message-file-size'; size.textContent=formatFileSize(message.fileSize);
    meta.append(type,size); info.append(name,meta); link.append(icon,info); bubble.appendChild(link);
    const caption = String(message.text || '').trim();
    if(caption){ const captionEl=document.createElement('div'); captionEl.className='message-image-caption'; captionEl.textContent=caption; bubble.appendChild(captionEl); }
  }else if(hasImage){
    const imageWrap = document.createElement('div');
    imageWrap.className = 'message-image-wrap';

    const image = document.createElement('img');
    image.className = 'message-image';
    image.src = message.imageUrl;
    image.alt = 'صورة مرسلة';
    image.loading = 'lazy';
    image.decoding = 'async';

    imageWrap.appendChild(image);

    const caption = String(message.text || '').trim();
    if(caption){
      const captionEl = document.createElement('div');
      captionEl.className = 'message-image-caption';
      captionEl.textContent = caption;
      imageWrap.appendChild(captionEl);
    }

    bubble.appendChild(imageWrap);
  }else{
    bubble.textContent = String(message.text || '');
  }

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

function formatFileSize(bytes){
  const size = Number(bytes) || 0;
  if(size < 1024) return `${size} B`;
  if(size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function fileTypeLabel(name, mime){
  const value = String(name || '').toLowerCase();
  const ext = value.includes('.') ? value.split('.').pop().slice(0, 8) : '';
  if(ext) return ext.toUpperCase();
  if(String(mime || '').includes('/')) return String(mime).split('/').pop().toUpperCase();
  return 'FILE';
}

function fileIcon(name, mime){
  const ext = String(name || '').toLowerCase().split('.').pop();
  const m = String(mime || '').toLowerCase();
  if(m.includes('pdf') || ext === 'pdf') return 'picture_as_pdf';
  if(/doc|word/.test(m) || ['doc','docx','odt'].includes(ext)) return 'description';
  if(/sheet|excel/.test(m) || ['xls','xlsx','csv','ods'].includes(ext)) return 'table_chart';
  if(/presentation|powerpoint/.test(m) || ['ppt','pptx','odp'].includes(ext)) return 'slideshow';
  if(m.startsWith('audio/') || ['mp3','wav','ogg','m4a'].includes(ext)) return 'audio_file';
  if(m.startsWith('video/') || ['mp4','webm','mov','mkv'].includes(ext)) return 'video_file';
  if(['zip','rar','7z','tar','gz'].includes(ext)) return 'folder_zip';
  if(['txt','md','json','xml','html','css','js'].includes(ext) || m.startsWith('text/')) return 'article';
  return 'insert_drive_file';
}

function prepareFileForChat(file){
  return new Promise((resolve,reject) => {
    if(!file) return reject(new Error('اختر ملفًا أولاً'));
    if(file.size > 10 * 1024 * 1024) return reject(new Error('حجم الملف كبير جدًا. الحد الأقصى 10MB.'));
    const blocked = /\.(exe|apk|bat|cmd|com|msi|scr|sh|ps1)$/i.test(String(file.name || ''));
    if(blocked) return reject(new Error('هذا النوع من الملفات غير مسموح به لأسباب أمنية.'));

    const reader = new FileReader();
    reader.onload = () => resolve({
      dataUrl: String(reader.result || ''),
      name: String(file.name || 'ملف'),
      mime: String(file.type || 'application/octet-stream'),
      size: Number(file.size || 0)
    });
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

function showPendingFile(data, previewSelector){
  const preview = $(previewSelector);
  if(!preview || !data) return;
  preview.classList.add('is-file');
  const card = $('.file-preview-card', preview);
  const icon = $('.file-preview-card .material-icons-round', preview);
  const name = $('.file-preview-name', preview);
  if(card) card.style.display = 'flex';
  if(icon) icon.textContent = fileIcon(data.name, data.mime);
  if(name) name.textContent = data.name;
  preview.classList.remove('hidden');
}

function clearFilePreview(previewSelector, imageSelector){
  const preview = $(previewSelector);
  const image = $(imageSelector);
  if(image) image.removeAttribute('src');
  if(preview){
    preview.classList.remove('is-file');
    preview.classList.add('hidden');
  }
}

function prepareAttachment(file){
  if(file?.type?.startsWith('image/')) return prepareImageForChat(file).then(dataUrl => ({kind:'image',dataUrl}));
  return prepareFileForChat(file).then(data => ({kind:'file',...data}));
}

function prepareImageForChat(file){
  return new Promise((resolve,reject) => {
    if(!file.type || !file.type.startsWith('image/')){
      reject(new Error('اختر صورة فقط'));
      return;
    }

    if(file.size > 12 * 1024 * 1024){
      reject(new Error('حجم الصورة الأصلية كبير جدًا. الحد الأقصى 12MB.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if(!ctx){
          reject(new Error('تعذر تجهيز الصورة'));
          return;
        }

        ctx.drawImage(img,0,0,width,height);

        let quality = 0.84;
        let dataUrl = canvas.toDataURL('image/webp',quality);

        // Keep uploads reasonably small while preserving good mobile quality.
        for(let i=0;i<5 && dataUrl.length > 2_800_000;i++){
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/webp',Math.max(.5,quality));
        }

        if(dataUrl.length > 4_500_000){
          reject(new Error('تعذر ضغط الصورة إلى حجم مناسب. اختر صورة أصغر.'));
          return;
        }

        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('تعذر قراءة الصورة'));
      img.src = String(reader.result || '');
    };

    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}

function showPendingImage(dataUrl,previewSelector,imageSelector){
  const preview = $(previewSelector);
  const image = $(imageSelector);
  if(!preview || !image) return;
  image.src = dataUrl;
  preview.classList.remove('hidden');
}

function clearPendingImage(){
  pendingImageData = null;
  pendingFileData = null;
  clearFilePreview('#attachmentPreview','#attachmentPreviewImage');
}

function clearPendingPrivateImage(){
  pendingPrivateImageData = null;
  pendingPrivateFileData = null;
  clearFilePreview('#privateAttachmentPreview','#privateAttachmentPreviewImage');
}

async function sendMessage(){
  const content = input.value.trim();
  if((!content && !pendingImageData && !pendingFileData) || !currentUser || send.disabled) return;

  send.disabled = true;

  try{
    const result = await fetchJson('/api/community/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...(await authHeaders())
      },
      body:JSON.stringify({
        content,
        imageData: pendingImageData || null,
        fileData: pendingFileData || null
      })
    });

    if(result?.message){
      addRealtimeMessage(result.message);
    }

    input.value = '';
    clearPendingImage();
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
  item.dataset.userId = String(member.id || '');

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
    <button class="member-message-button" type="button" aria-label="مراسلة خاصة">
      <span class="material-icons-round">chat_bubble</span>
    </button>
  `;
  $('.member-info b',item).textContent = member.name || 'عضو';

  $('.member-message-button',item).addEventListener('click',event => {
    event.stopPropagation();
    openPrivateChat(member);
  });
  item.addEventListener('click',() => openPrivateChat(member));

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

  membersCache.forEach(member => {
    if(currentUser && String(member.id) === String(currentUser.id)) return;
    target.appendChild(memberElement(member));
  });
}

function renderPrivateConversations(){
  const target = $('#privateConversations');
  if(!target) return;
  target.innerHTML = '';

  if(!privateConversationsCache.length){
    target.innerHTML = '<div class="mini-loading">لا توجد محادثات خاصة بعد. اختر عضوًا لبدء محادثة.</div>';
    return;
  }

  privateConversationsCache.forEach(conversation => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'private-conversation';

    const avatar = String(conversation.otherUser?.avatarUrl || '').trim();
    const image = avatar
      ? `<img src="${avatar.replace(/"/g,'&quot;')}" alt="" loading="lazy">`
      : initials(conversation.otherUser?.name);

    item.innerHTML = `
      <div class="private-conversation-avatar">${image}</div>
      <div class="private-conversation-info">
        <b></b>
        <small></small>
      </div>
      <time class="private-conversation-time"></time>
    `;
    $('.private-conversation-info b',item).textContent = conversation.otherUser?.name || 'عضو';
    $('.private-conversation-info small',item).textContent =
      conversation.lastMessage?.text || (conversation.lastMessage?.imageUrl ? '📷 صورة' : (conversation.lastMessage?.fileUrl ? `📎 ${conversation.lastMessage?.fileName || 'ملف'}` : 'ابدأ محادثة خاصة'));
    $('.private-conversation-time',item).textContent =
      conversation.lastMessage?.createdAt ? timeOf(conversation.lastMessage.createdAt) : '';

    item.addEventListener('click',() => {
      openPrivateChat(conversation.otherUser, conversation.id);
    });
    target.appendChild(item);
  });
}


function privateAvatarMarkup(user){
  const avatar = String(user?.avatarUrl || '').trim();
  return avatar
    ? `<img src="${avatar.replace(/"/g,'&quot;')}" alt="">`
    : initials(user?.name);
}

function clearPrivateRealtime(){
  if(privateRealtimeChannel && supabaseClient){
    supabaseClient.removeChannel(privateRealtimeChannel);
  }
  privateRealtimeChannel = null;
}

async function openPrivateChat(member, conversationId = null){
  if(!currentUser){
    showToast('سجّل الدخول لبدء محادثة خاصة');
    return;
  }

  if(String(member?.id || '') === String(currentUser.id)){
    showToast('لا يمكنك بدء محادثة خاصة مع نفسك');
    return;
  }

  privateTarget = member;
  privateConversationId = conversationId;

  $('#privateUserAvatar').innerHTML = privateAvatarMarkup(member);
  $('#privateChatTitle').textContent = member?.name || 'عضو';
  $('#privateUserStatus').textContent = 'محادثة بينكما فقط';

  const overlay = $('#privateChatOverlay');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden','false');
  document.body.classList.add('private-chat-open');

  if(!privateConversationId){
    try{
      const result = await fetchJson('/api/community/private/conversations',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(await authHeaders())
        },
        body:JSON.stringify({userId:String(member.id)})
      });
      privateConversationId = result.conversation?.id || null;
    }catch(error){
      closePrivateChat();
      showToast(error.message);
      return;
    }
  }

  await loadPrivateMessages();
  subscribeToPrivateMessages();
  $('#privateMessage').focus();
}

function closePrivateChat(){
  clearPrivateRealtime();
  privateConversationId = null;
  privateTarget = null;
  const overlay = $('#privateChatOverlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden','true');
  document.body.classList.remove('private-chat-open');
}

async function loadPrivateMessages(){
  const target = $('#privateFeed');
  if(!privateConversationId) return;

  try{
    const result = await fetchJson(
      `/api/community/private/messages/${encodeURIComponent(privateConversationId)}?limit=100`,
      {headers:await authHeaders()}
    );

    target.innerHTML = '';

    if(!Array.isArray(result.messages) || !result.messages.length){
      target.innerHTML = `
        <div class="private-empty">
          <div class="private-empty-icon"><span class="material-icons-round">lock</span></div>
          <h3>ابدأ المحادثة</h3>
          <p>هذه الرسائل خاصة بينك وبين ${privateTarget?.name || 'العضو'} فقط.</p>
        </div>`;
      return;
    }

    result.messages.forEach(message => target.appendChild(renderPrivateMessage(message)));
    target.scrollTop = target.scrollHeight;
  }catch(error){
    showToast(error.message);
  }
}

function renderPrivateMessage(message){
  const row = document.createElement('article');
  const mine = Boolean(currentUser && String(message.senderId) === String(currentUser.id));
  row.className = `private-message-row ${mine ? 'mine' : ''}`;
  row.dataset.id = String(message.id);

  const user = message.sender || privateTarget || {};
  const stack = document.createElement('div');
  stack.className = 'private-message-stack';

  const time = document.createElement('div');
  time.className = 'private-message-time';
  time.textContent = timeOf(message.createdAt);

  const hasImage = Boolean(message.imageUrl) && !message.deleted;
  const hasFile = Boolean(message.fileUrl) && !message.deleted;
  const bubble = document.createElement('div');
  bubble.className = `private-message-bubble ${hasImage ? 'has-image' : ''} ${hasFile ? 'has-file' : ''} ${message.deleted ? 'private-message-deleted' : ''}`;

  if(message.deleted){
    bubble.textContent = 'تم حذف هذه الرسالة';
  }else if(hasFile){
    const link=document.createElement('a');
    link.className='private-message-file-card';
    link.href=message.fileUrl;
    link.target='_blank';
    link.rel='noopener';
    link.download=message.fileName || '';

    const icon=document.createElement('div');
    icon.className='message-file-icon';
    icon.innerHTML=`<span class="material-icons-round">${fileIcon(message.fileName,message.fileType)}</span>`;

    const info=document.createElement('div');
    info.className='message-file-info';
    const name=document.createElement('span');
    name.className='message-file-name';
    name.textContent=message.fileName || 'ملف';
    const meta=document.createElement('div');
    meta.className='message-file-meta';
    const type=document.createElement('span');
    type.className='message-file-type';
    type.textContent=fileTypeLabel(message.fileName,message.fileType);
    const size=document.createElement('span');
    size.className='message-file-size';
    size.textContent=formatFileSize(message.fileSize);
    meta.append(type,size);
    info.append(name,meta);
    link.append(icon,info);
    bubble.appendChild(link);

    const caption=String(message.text || '').trim();
    if(caption){
      const cap=document.createElement('div');
      cap.className='private-message-image-caption';
      cap.textContent=caption;
      bubble.appendChild(cap);
    }
  }else if(hasImage){
    const wrap=document.createElement('div');
    wrap.className='private-message-image-wrap';
    const image=document.createElement('img');
    image.className='private-message-image';
    image.src=message.imageUrl;
    image.alt='صورة مرسلة';
    image.loading='lazy';
    image.decoding='async';
    wrap.appendChild(image);
    const caption=String(message.text || '').trim();
    if(caption){
      const cap=document.createElement('div');
      cap.className='private-message-image-caption';
      cap.textContent=caption;
      wrap.appendChild(cap);
    }
    bubble.appendChild(wrap);
  }else{
    bubble.textContent=String(message.text || '');
  }

  stack.append(time,bubble);

  if(mine && !message.deleted){
    const actions=document.createElement('div');
    actions.className='private-message-actions';
    const del=document.createElement('button');
    del.type='button';
    del.className='private-delete';
    del.textContent='حذف';
    del.addEventListener('click',() => deletePrivateMessage(message.id,row));
    actions.appendChild(del);
    stack.appendChild(actions);
  }

  const avatar=document.createElement('div');
  avatar.className='private-message-avatar';
  avatar.innerHTML=privateAvatarMarkup(user);
  row.append(avatar,stack);
  return row;
}
function addPrivateRealtimeMessage(message){
  const target = $('#privateFeed');
  if(!target || !message?.id || !privateConversationId) return;
  if(target.querySelector(`[data-id="${CSS.escape(String(message.id))}"]`)) return;

  const empty = target.querySelector('.private-empty');
  if(empty) empty.remove();

  target.appendChild(renderPrivateMessage(message));
  target.scrollTop = target.scrollHeight;
}

function subscribeToPrivateMessages(){
  clearPrivateRealtime();
  if(!supabaseClient || !privateConversationId) return;

  const conversationId = String(privateConversationId);
  privateRealtimeChannel = supabaseClient
    .channel(`private-messages-${conversationId}`)
    .on('postgres_changes',{
      event:'INSERT',
      schema:'public',
      table:'private_messages',
      filter:`conversation_id=eq.${conversationId}`
    },async payload => {
      const row = payload?.new;
      if(!row?.id) return;

      try{
        const result = await fetchJson(
          `/api/community/private/messages/by-id/${encodeURIComponent(row.id)}`,
          {headers:await authHeaders()}
        );
        if(result?.message) addPrivateRealtimeMessage(result.message);
      }catch(_error){
        loadPrivateMessages().catch(()=>{});
      }
    })
    .subscribe();
}

async function sendPrivateMessage(){
  const messageInput = $('#privateMessage');
  const sendButton = $('#privateSend');
  const content = messageInput.value.trim();

  if((!content && !pendingPrivateImageData && !pendingPrivateFileData) || !privateConversationId || !currentUser || sendButton.disabled) return;
  sendButton.disabled = true;

  try{
    const result = await fetchJson(
      `/api/community/private/messages/${encodeURIComponent(privateConversationId)}`,
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(await authHeaders())
        },
        body:JSON.stringify({
          content,
          imageData: pendingPrivateImageData || null,
          fileData: pendingPrivateFileData || null
        })
      }
    );

    if(result?.message) addPrivateRealtimeMessage(result.message);
    messageInput.value = '';
    clearPendingPrivateImage();
    messageInput.focus();
    loadPrivateConversations().catch(()=>{});
  }catch(error){
    showToast(error.message);
  }finally{
    sendButton.disabled = false;
  }
}
async function deletePrivateMessage(id,element){
  if(!window.confirm('حذف هذه الرسالة؟')) return;

  try{
    const result = await fetchJson(
      `/api/community/private/messages/${encodeURIComponent(id)}`,
      {method:'DELETE',headers:await authHeaders()}
    );
    if(result.success){
      element.remove();
      showToast('تم حذف الرسالة');
    }
  }catch(error){
    showToast(error.message);
  }
}

async function loadPrivateConversations(){
  if(!currentUser) return;

  try{
    const result = await fetchJson(
      '/api/community/private/conversations?limit=50',
      {headers:await authHeaders()}
    );
    privateConversationsCache = Array.isArray(result.conversations)
      ? result.conversations
      : [];
    renderPrivateConversations();
  }catch(error){
    showToast(error.message);
  }
}

function showPrivateInbox(){
  $('#allMembers').classList.add('hidden');
  $('#privateConversations').classList.remove('hidden');
  loadPrivateConversations();
}

function showAllMembers(){
  $('#privateConversations').classList.add('hidden');
  $('#allMembers').classList.remove('hidden');
  renderAllMembers();
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

  if(tab === 'members'){
    showAllMembers();
    loadPrivateConversations();
  }
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


$('#privateClose').addEventListener('click',closePrivateChat);
$('#privateChatOverlay').addEventListener('click',event => {
  if(event.target.id === 'privateChatOverlay') closePrivateChat();
});
$('#privateComposer').addEventListener('submit',event => {
  event.preventDefault();
  sendPrivateMessage();
});
$('#privateMessage').addEventListener('keydown',event => {
  if(event.key === 'Enter' && !event.shiftKey){
    event.preventDefault();
    sendPrivateMessage();
  }
});
$('#privateEmoji').addEventListener('click',() => {
  const emojis = ['😊','❤️','🔥','👏','😍','✨','👍'];
  $('#privateMessage').value += emojis[Math.floor(Math.random()*emojis.length)];
  $('#privateMessage').focus();
});
$('#privateAttach').addEventListener('click',() => {
  $('#privateFileInput').click();
});

$('#privateFileInput').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;

  try{
    const attachment = await prepareAttachment(file);
    clearPendingPrivateImage();
    if(attachment.kind === 'image'){
      pendingPrivateImageData = attachment.dataUrl;
      showPendingImage(pendingPrivateImageData,'#privateAttachmentPreview','#privateAttachmentPreviewImage');
    }else{
      pendingPrivateFileData = {
        dataUrl: attachment.dataUrl,
        name: attachment.name,
        mime: attachment.mime,
        size: attachment.size
      };
      showPendingFile(pendingPrivateFileData,'#privateAttachmentPreview');
    }
    showToast('المرفق جاهز للإرسال');
  }catch(error){
    showToast(error.message);
  }
});

$('#privateRemoveAttachment').addEventListener('click',clearPendingPrivateImage);
$('#privateMore').addEventListener('click',() => {
  showToast('خيارات المحادثة الخاصة ستُضاف لاحقًا');
});
$('#privateInboxButton').addEventListener('click',showPrivateInbox);

$('#emojiButton').addEventListener('click',() => {
  const emojis = ['😊','❤️','🔥','👏','😍','✨','👍'];
  const emoji = emojis[Math.floor(Math.random()*emojis.length)];
  input.value += emoji;
  input.focus();
});

$('#attachButton').addEventListener('click',() => {
  $('#fileInput').click();
});

$('#fileInput').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if(!file) return;

  try{
    const attachment = await prepareAttachment(file);
    clearPendingImage();
    if(attachment.kind === 'image'){
      pendingImageData = attachment.dataUrl;
      showPendingImage(pendingImageData,'#attachmentPreview','#attachmentPreviewImage');
    }else{
      pendingFileData = {
        dataUrl: attachment.dataUrl,
        name: attachment.name,
        mime: attachment.mime,
        size: attachment.size
      };
      showPendingFile(pendingFileData,'#attachmentPreview');
    }
    showToast('المرفق جاهز للإرسال');
  }catch(error){
    showToast(error.message);
  }
});

$('#removeAttachment').addEventListener('click',clearPendingImage);

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
      loadMembers(),
      loadPrivateConversations()
    ]);
  }catch(error){
    updateComposerState();
    showToast(error.message);
  }
})();

document.addEventListener('keydown',event => {
  if(event.key === 'Escape' && !$('#privateChatOverlay').classList.contains('hidden')){
    closePrivateChat();
  }
});
