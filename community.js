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
let communityMessagesCache = [];
let pendingImageData = null;
let pendingFileData = null;
let pendingPrivateImageData = null;
let pendingPrivateFileData = null;

// ================= Community message actions / replies =================
let activeReply = null;
let messageActionTarget = null;
let messageLongPressTimer = null;
let messageLongPressRow = null;
let messageLongPressStartX = 0;
let messageLongPressStartY = 0;
const MESSAGE_LONG_PRESS_MS = 520;

// ================= Real WebRTC Voice Room =================
const VOICE_MAX_PARTICIPANTS = 6;
let voiceChannel = null;
let voiceLocalStream = null;
let voicePeers = new Map();
let voiceIceQueues = new Map();
let voiceJoined = false;
let voiceMuted = false;
let voiceReadyPromise = null;
let voiceAudioContext = null;
let voiceAudioMonitors = new Map();
let voiceSlotByUser = new Map();

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


function messagePreviewText(message){
  if(!message) return 'رسالة';
  if(message.deleted) return 'تم حذف هذه الرسالة';
  const text = String(message.text || '').trim();
  if(text) return text;
  if(message.imageUrl) return '📷 صورة';
  if(message.fileUrl) return `📎 ${message.fileName || 'ملف'}`;
  return 'رسالة';
}


function openReportModal(message){
  const modal = $('#messageReportModal');
  if(!modal || !message?.id) return;

  const avatar = $('#messageReportAvatar');
  const name = $('#messageReportUser');
  const time = $('#messageReportTime');
  const preview = $('#messageReportPreview');
  const image = $('#messageReportImage');
  const file = $('#messageReportFile');
  const details = $('#messageReportDetails');
  const reason = $('#messageReportReason');
  const submit = $('#messageReportSubmit');
  const user = message.user || {};

  if(avatar){
    avatar.innerHTML = '';
    const avatarUrl = String(user.avatarUrl || '').trim();
    if(avatarUrl){
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = '';
      avatar.appendChild(img);
    }else{
      avatar.textContent = initials(user.name);
    }
  }

  if(name) name.textContent = user.name || 'عضو';
  if(time) time.textContent = timeOf(message.createdAt);
  if(preview) preview.textContent = messagePreviewText(message);

  if(image){
    image.classList.toggle('hidden', !message.imageUrl || Boolean(message.deleted));
    if(message.imageUrl && !message.deleted) image.src = message.imageUrl;
    else image.removeAttribute('src');
  }

  if(file){
    file.classList.toggle('hidden', !message.fileUrl || Boolean(message.deleted));
    file.textContent = message.fileName ? `📎 ${message.fileName}` : '📎 ملف مرفق';
    if(message.fileUrl && !message.deleted){
      file.href = message.fileUrl;
      file.download = message.fileName || '';
    }else{
      file.removeAttribute('href');
    }
  }

  if(reason) reason.value = '';
  if(details) details.value = '';
  if(submit){
    submit.disabled = false;
    submit.dataset.messageId = String(message.id);
  }

  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
  });
}

function closeReportModal(){
  const modal = $('#messageReportModal');
  if(!modal) return;

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');

  clearTimeout(closeReportModal.timer);
  closeReportModal.timer = setTimeout(() => {
    if(!modal.classList.contains('is-open')) modal.classList.add('hidden');
  },220);
}

async function submitMessageReport(){
  const modal = $('#messageReportModal');
  const submit = $('#messageReportSubmit');
  const reason = $('#messageReportReason');
  const details = $('#messageReportDetails');

  if(!modal || !submit || !currentUser) return;

  const messageId = String(submit.dataset.messageId || '').trim();
  const selectedReason = String(reason?.value || '').trim();
  const explanation = String(details?.value || '').trim();

  if(!messageId){
    showToast('الرسالة غير صالحة');
    return;
  }

  if(!selectedReason){
    showToast('اختر سبب البلاغ أولًا');
    reason?.focus();
    return;
  }

  submit.disabled = true;

  try{
    const result = await fetchJson('/api/community/message-reports',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...(await authHeaders())
      },
      body:JSON.stringify({
        messageId,
        reason:selectedReason,
        details:explanation
      })
    });

    closeReportModal();
    showToast(result?.duplicate
      ? 'سبق أن أبلغت عن هذه الرسالة'
      : 'تم إرسال البلاغ إلى فريق الإدارة');
  }catch(error){
    showToast(error.message || 'تعذر إرسال البلاغ');
  }finally{
    submit.disabled = false;
  }
}

function closeMessageActionSheet(){
  const sheet = $('#messageActionSheet');
  if(!sheet) return;

  sheet.classList.remove('is-open');
  sheet.setAttribute('aria-hidden','true');

  clearTimeout(closeMessageActionSheet.timer);
  closeMessageActionSheet.timer = setTimeout(() => {
    if(!sheet.classList.contains('is-open')) sheet.classList.add('hidden');
  }, 220);

  messageActionTarget = null;
}

function openMessageActionSheet(message){
  if(!message?.id) return;

  const sheet = $('#messageActionSheet');
  const title = $('#messageActionTitle');
  const preview = $('#messageActionPreview');
  const avatar = $('#messageActionAvatar');
  const deleteButton = $('#messageActionDelete');
  const reportButton = $('#messageActionReport');

  if(!sheet || !title || !preview || !avatar) return;

  messageActionTarget = message;

  const user = message.user || {};
  title.textContent = user.name || 'عضو';
  preview.textContent = messagePreviewText(message);

  const avatarUrl = String(user.avatarUrl || '').trim();
  avatar.innerHTML = '';
  if(avatarUrl){
    const image = document.createElement('img');
    image.src = avatarUrl;
    image.alt = '';
    avatar.appendChild(image);
  }else{
    avatar.textContent = initials(user.name);
  }

  const mine = Boolean(currentUser && String(message.userId) === String(currentUser.id));

  if(deleteButton){
    deleteButton.classList.toggle('hidden', !mine || Boolean(message.deleted));
  }
  if(reportButton){
    reportButton.classList.toggle('hidden', mine || Boolean(message.deleted));
  }

  clearTimeout(closeMessageActionSheet.timer);
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => {
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden','false');
  });
}

function setReplyTarget(message){
  if(!message?.id) return;

  activeReply = message;

  const composer = $('#replyComposer');
  const name = $('#replyComposerName');
  const preview = $('#replyComposerPreview');

  if(composer){
    composer.classList.remove('hidden');
    composer.setAttribute('aria-hidden','false');
  }
  if(name) name.textContent = message.user?.name || 'عضو';
  if(preview) preview.textContent = messagePreviewText(message);

  closeMessageActionSheet();
  input.focus();
}

function clearReplyTarget(){
  activeReply = null;
  const composer = $('#replyComposer');
  if(composer){
    composer.classList.add('hidden');
    composer.setAttribute('aria-hidden','true');
  }
}

function scrollToMessage(id){
  if(!id) return;

  const row = feed.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  if(!row){
    showToast('الرسالة الأصلية غير موجودة');
    return;
  }

  row.scrollIntoView({behavior:'smooth',block:'center'});
  row.classList.remove('reply-highlight');

  requestAnimationFrame(() => row.classList.add('reply-highlight'));

  clearTimeout(row.replyHighlightTimer);
  row.replyHighlightTimer = setTimeout(() => row.classList.remove('reply-highlight'),1800);
}

function bindMessageLongPress(row, message){
  let moved = false;

  const cancel = () => {
    clearTimeout(messageLongPressTimer);
    messageLongPressTimer = null;
    messageLongPressRow = null;
  };

  row.addEventListener('pointerdown',event => {
    if(event.button !== undefined && event.button !== 0) return;

    messageLongPressRow = row;
    messageLongPressStartX = event.clientX;
    messageLongPressStartY = event.clientY;
    moved = false;

    clearTimeout(messageLongPressTimer);
    messageLongPressTimer = setTimeout(() => {
      if(!moved && messageLongPressRow === row) openMessageActionSheet(message);
      messageLongPressTimer = null;
    },MESSAGE_LONG_PRESS_MS);
  },{passive:true});

  row.addEventListener('pointermove',event => {
    if(messageLongPressRow !== row) return;

    const dx = Math.abs(event.clientX - messageLongPressStartX);
    const dy = Math.abs(event.clientY - messageLongPressStartY);

    if(dx > 10 || dy > 10){
      moved = true;
      cancel();
    }
  },{passive:true});

  row.addEventListener('pointerup',cancel,{passive:true});
  row.addEventListener('pointercancel',cancel,{passive:true});
  row.addEventListener('pointerleave',event => {
    if(event.pointerType === 'mouse') cancel();
  },{passive:true});

  row.addEventListener('contextmenu',event => {
    event.preventDefault();
    cancel();
    openMessageActionSheet(message);
  });
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

  if(message.replyTo){
    const quote = document.createElement('button');
    quote.type = 'button';
    quote.className = 'message-reply-quote';
    quote.dataset.replyTargetId = String(message.replyTo.id || message.replyToId || '');
    quote.setAttribute('aria-label','الانتقال إلى الرسالة الأصلية');

    const quoteAccent = document.createElement('span');
    quoteAccent.className = 'message-reply-accent';

    const quoteBody = document.createElement('span');
    quoteBody.className = 'message-reply-body';

    const quoteName = document.createElement('b');
    quoteName.className = 'message-reply-name';
    quoteName.textContent = message.replyTo.user?.name || 'عضو';

    const quoteText = document.createElement('span');
    quoteText.className = 'message-reply-text';
    quoteText.textContent = messagePreviewText(message.replyTo);

    quoteBody.append(quoteName,quoteText);
    quote.append(quoteAccent,quoteBody);

    quote.addEventListener('click',event => {
      event.stopPropagation();
      scrollToMessage(message.replyTo.id || message.replyToId);
    });

    stack.append(quote);
  }

  stack.append(meta,bubble);

  row.innerHTML = avatarMarkup(user);
  row.append(stack);

  bindMessageLongPress(row,message);

  return row;
}
function hasMessage(id){
  return Boolean(id && feed.querySelector(`[data-id="${CSS.escape(String(id))}"]`));
}

function addRealtimeMessage(message){
  if(!message?.id || hasMessage(message.id)) return;

  const welcome = feed.querySelector('.welcome');
  if(welcome) welcome.remove();

  communityMessagesCache.push(message);
  feed.appendChild(renderMessage(message));
  feed.scrollTop = feed.scrollHeight;
  updateMessageCount();
  if(activeTab === 'files') renderSharedFiles();
}

function removeRealtimeMessage(id){
  const element = feed.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  if(element) element.remove();
  communityMessagesCache = communityMessagesCache.filter(message => String(message?.id) !== String(id));
  updateMessageCount();
  if(activeTab === 'files') renderSharedFiles();
}

async function loadMessages(){
  const result = await fetchJson('/api/community/messages?limit=100');
  communityMessagesCache = Array.isArray(result.messages) ? result.messages : [];

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
  if(file?.type === 'image/gif'){
    return readFileAsDataUrl(file).then(dataUrl => ({
      kind:'image',
      dataUrl,
      animated:true,
      mime:file.type,
      name:file.name,
      size:file.size
    }));
  }

  if(file?.type?.startsWith('image/')){
    return prepareImageForChat(file).then(dataUrl => ({kind:'image',dataUrl}));
  }

  return prepareFileForChat(file).then(data => ({kind:'file',...data}));
}

function readFileAsDataUrl(file){
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة ملف GIF'));
    reader.readAsDataURL(file);
  });
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
        fileData: pendingFileData || null,
        replyToId: activeReply?.id ? String(activeReply.id) : null
      })
    });

    if(result?.message){
      addRealtimeMessage(result.message);
    }

    input.value = '';
    clearPendingImage();
    clearReplyTarget();
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


function sharedFileDataFromMessage(message){
  if(!message || message.deleted) return null;

  const fileUrl = String(message.fileUrl || '').trim();
  const imageUrl = String(message.imageUrl || '').trim();

  if(fileUrl){
    return {
      id:String(message.id || ''),
      url:fileUrl,
      name:String(message.fileName || 'ملف مشترك').trim() || 'ملف مشترك',
      type:String(message.fileType || '').trim(),
      size:Number(message.fileSize || 0),
      sender:String(message.user?.name || 'عضو').trim() || 'عضو',
      createdAt:message.createdAt || '',
      icon:fileIcon(message.fileName,message.fileType),
      label:fileTypeLabel(message.fileName,message.fileType)
    };
  }

  if(imageUrl){
    return {
      id:String(message.id || ''),
      url:imageUrl,
      name:'صورة مشتركة',
      type:'image/*',
      size:0,
      sender:String(message.user?.name || 'عضو').trim() || 'عضو',
      createdAt:message.createdAt || '',
      icon:'image',
      label:'IMAGE'
    };
  }

  return null;
}

function renderSharedFiles(){
  const target = $('#sharedFilesList');
  if(!target) return;

  const files = communityMessagesCache
    .map(sharedFileDataFromMessage)
    .filter(Boolean)
    .reverse();

  target.innerHTML = '';

  if(!files.length){
    target.innerHTML = `
      <div class="shared-files-empty">
        <div class="shared-files-empty-icon">
          <span class="material-icons-round">folder_off</span>
        </div>
        <h3>لا توجد ملفات مشتركة بعد</h3>
        <p>عند إرسال صورة أو ملف من زر + داخل المجتمع سيظهر هنا تلقائيًا.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  files.forEach(file => {
    const card = document.createElement('article');
    card.className = 'shared-file-item';
    card.dataset.fileId = file.id;

    const icon = document.createElement('div');
    icon.className = 'shared-file-icon';
    icon.innerHTML = `<span class="material-icons-round">${file.icon}</span>`;

    const info = document.createElement('div');
    info.className = 'shared-file-info';

    const name = document.createElement('a');
    name.className = 'shared-file-name';
    name.href = file.url;
    name.target = '_blank';
    name.rel = 'noopener noreferrer';
    name.download = file.name;
    name.textContent = file.name;
    name.title = file.name;

    const meta = document.createElement('div');
    meta.className = 'shared-file-meta';

    const type = document.createElement('span');
    type.className = 'shared-file-type';
    type.textContent = file.label;
    meta.append(type);

    if(file.size > 0){
      const size = document.createElement('span');
      size.className = 'shared-file-size';
      size.textContent = formatFileSize(file.size);
      meta.append(size);
    }

    const sender = document.createElement('span');
    sender.className = 'shared-file-sender';
    sender.textContent = file.sender;

    const time = document.createElement('time');
    time.className = 'shared-file-time';
    time.textContent = timeOf(file.createdAt);

    meta.append(sender,time);
    info.append(name,meta);

    const download = document.createElement('a');
    download.className = 'shared-file-download';
    download.href = file.url;
    download.target = '_blank';
    download.rel = 'noopener noreferrer';
    download.download = file.name;
    download.setAttribute('aria-label',`تنزيل ${file.name}`);
    download.title = 'تنزيل الملف';
    download.innerHTML = '<span class="material-icons-round">download</span>';

    card.append(icon,info,download);
    fragment.appendChild(card);
  });

  target.appendChild(fragment);
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

  if(tab === 'files'){
    renderSharedFiles();
  }
}

$$('.room-tab').forEach(button => {
  button.addEventListener('click',() => showTab(button.dataset.tab));
});

$$('[data-back-general]').forEach(button => {
  button.addEventListener('click',() => showTab('general'));
});

$('#viewMembers').addEventListener('click',() => showTab('members'));

const communityHero = $('#communityHero');
const normalHero = $('#normalHero');
const voiceHeroMode = $('#voiceHeroMode');

function currentVoiceProfile(){
  const metadata = currentUser?.user_metadata || {};
  const member = membersCache.find(member => String(member?.id || '') === String(currentUser?.id || ''));
  return {
    id:String(currentUser?.id || ''),
    name:
      metadata.full_name ||
      metadata.name ||
      metadata.user_name ||
      member?.name ||
      currentUser?.email?.split('@')[0] ||
      'عضو',
    avatarUrl:
      metadata.avatar_url ||
      metadata.avatarUrl ||
      metadata.picture ||
      member?.avatarUrl ||
      ''
  };
}

function showCommunityHero(){
  communityHero?.classList.remove('is-voice');
  if(normalHero) normalHero.setAttribute('aria-hidden','false');
  if(voiceHeroMode) voiceHeroMode.setAttribute('aria-hidden','true');
}

function showVoiceHero(){
  communityHero?.classList.add('is-voice');
  if(normalHero) normalHero.setAttribute('aria-hidden','true');
  if(voiceHeroMode) voiceHeroMode.setAttribute('aria-hidden','false');
  ensureVoicePresenceChannel().catch(() => {});
  requestAnimationFrame(() => updateVoicePresenceUI());
}

function voicePresenceProfiles(){
  const profiles = new Map();
  const state = voiceChannel?.presenceState?.() || {};

  Object.entries(state).forEach(([key,presences]) => {
    const latest = Array.isArray(presences) ? presences[presences.length - 1] : presences;
    if(!latest) return;

    const id = String(latest.user_id || key || '');
    if(!id) return;

    profiles.set(id,{
      id,
      name:String(latest.name || 'عضو'),
      avatarUrl:String(latest.avatarUrl || latest.avatar_url || latest.picture || '').trim()
    });
  });

  if(voiceJoined && currentUser){
    const me = currentVoiceProfile();
    profiles.set(me.id,me);
  }

  return [...profiles.values()];
}

function voiceParticipantIds(){
  return voicePresenceProfiles()
    .map(profile => profile.id)
    .filter(id => id && (!currentUser || id !== String(currentUser.id)));
}

function releaseVoiceSlot(userId){
  const id = String(userId || '');
  if(id) voiceSlotByUser.delete(id);
}

function assignVoiceSlot(userId){
  const id = String(userId || '');
  if(!id) return 0;

  const current = voiceSlotByUser.get(id);
  if(current) return current;

  const occupied = new Set(voiceSlotByUser.values());
  for(let slot = 1; slot <= VOICE_MAX_PARTICIPANTS; slot += 1){
    if(!occupied.has(slot)){
      voiceSlotByUser.set(id,slot);
      return slot;
    }
  }
  return 0;
}

function voiceSlotElement(slotNumber){
  return document.querySelector(`#voicePeople [data-slot="${slotNumber}"]`);
}

function clearVoiceSlot(slot){
  if(!slot) return;
  slot.classList.remove('is-speaking','is-own','is-occupied');
  slot.classList.add('is-empty');
  slot.dataset.userId = '';
  slot.setAttribute('aria-label','مكان شاغر في الغرفة الصوتية');
  slot.innerHTML = `
    <span class="voice-empty-avatar">
      <span class="material-icons-round">add</span>
    </span>
  `;
}

function setVoiceSlot(slotNumber,profile){
  const slot = voiceSlotElement(slotNumber);
  if(!slot) return;

  if(!profile){
    clearVoiceSlot(slot);
    return;
  }

  const own = currentUser && String(profile.id) === String(currentUser.id);
  const avatar = String(profile.avatarUrl || '').trim();

  slot.classList.remove('is-empty');
  slot.classList.add('is-occupied');
  slot.classList.toggle('is-own',Boolean(own));
  slot.dataset.userId = String(profile.id);
  slot.setAttribute('aria-label',`${profile.name}${own ? ' — أنت' : ''}`);

  const avatarWrap = document.createElement('span');
  avatarWrap.className = 'avatar-placeholder';

  if(avatar){
    const image = document.createElement('img');
    image.src = avatar;
    image.alt = '';
    image.loading = 'eager';
    image.decoding = 'async';
    avatarWrap.appendChild(image);
  }else{
    avatarWrap.textContent = initials(profile.name);
  }

  const speakingWave = document.createElement('span');
  speakingWave.className = 'voice-speaking-wave';
  speakingWave.setAttribute('aria-hidden','true');
  speakingWave.innerHTML = '<span></span><span></span><span></span>';

  const onlineDot = document.createElement('i');
  onlineDot.className = 'voice-online-dot';
  onlineDot.setAttribute('aria-hidden','true');

  slot.innerHTML = '';
  slot.append(avatarWrap,speakingWave,onlineDot);

  if(own){
    const leaveButton = document.createElement('button');
    leaveButton.type = 'button';
    leaveButton.className = 'voice-person-exit';
    leaveButton.title = 'الخروج من المحادثة';
    leaveButton.setAttribute('aria-label','الخروج من المحادثة الصوتية');
    leaveButton.innerHTML = '<span class="material-icons-round">close</span>';
    leaveButton.addEventListener('click',event => {
      event.stopPropagation();
      leaveVoiceRoom().then(() => {
        showCommunityHero();
        showToast('تم الخروج من المحادثة الصوتية');
      });
    });
    slot.appendChild(leaveButton);
  }
}

function syncVoiceSlots(){
  const participants = voicePresenceProfiles();
  const activeIds = new Set(participants.map(profile => String(profile.id)));

  for(const id of [...voiceSlotByUser.keys()]){
    if(!activeIds.has(String(id))){
      const oldSlotNumber = voiceSlotByUser.get(id);
      releaseVoiceSlot(id);
      if(oldSlotNumber) clearVoiceSlot(voiceSlotElement(oldSlotNumber));
      stopVoiceSpeakingMonitor(id);
    }
  }

  participants.forEach(profile => assignVoiceSlot(profile.id));

  for(let slotNumber = 1; slotNumber <= VOICE_MAX_PARTICIPANTS; slotNumber += 1){
    const id = [...voiceSlotByUser.entries()]
      .find(([,number]) => number === slotNumber)?.[0];

    const profile = participants.find(item => String(item.id) === String(id));
    setVoiceSlot(slotNumber,profile || null);
  }
}

function updateVoicePresenceUI(){
  syncVoiceSlots();

  const count = Math.min(voicePresenceProfiles().length,VOICE_MAX_PARTICIPANTS);
  const online = $('#voiceOnlineCount');
  const listeners = $('#voiceListenerCount');
  if(online) online.textContent = String(count);
  if(listeners) listeners.textContent = `${count}/${VOICE_MAX_PARTICIPANTS}`;

  const joinButton = $('#joinVoice');
  const backButton = $('#voiceBackToChat');
  const actions = $('.voice-actions');

  if(joinButton){
    joinButton.hidden = voiceJoined || count >= VOICE_MAX_PARTICIPANTS;
  }

  // Keep the return button visible even while connected.
  if(actions) actions.hidden = false;
  if(backButton) backButton.hidden = false;
}


function setVoiceSpeaking(peerId,speaking){
  const id = String(peerId || '');
  const slotNumber = voiceSlotByUser.get(id);
  const slot = slotNumber ? voiceSlotElement(slotNumber) : null;
  if(!slot) return;
  slot.classList.toggle('is-speaking',Boolean(speaking));
}

function stopVoiceSpeakingMonitor(peerId){
  const id = String(peerId || '');
  const monitor = voiceAudioMonitors.get(id);
  if(!monitor) return;

  cancelAnimationFrame(monitor.raf);
  try{ monitor.source?.disconnect(); }catch(_error){}
  try{ monitor.analyser?.disconnect(); }catch(_error){}
  voiceAudioMonitors.delete(id);
  setVoiceSpeaking(id,false);
}

async function startVoiceSpeakingMonitor(peerId,stream){
  const id = String(peerId || '');
  if(!id || !stream) return;

  stopVoiceSpeakingMonitor(id);

  try{
    if(!voiceAudioContext){
      voiceAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if(voiceAudioContext.state === 'suspended'){
      await voiceAudioContext.resume();
    }

    const analyser = voiceAudioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;

    const source = voiceAudioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    const monitor = {source,analyser,raf:0,speaking:false};
    voiceAudioMonitors.set(id,monitor);

    const tick = () => {
      const current = voiceAudioMonitors.get(id);
      if(current !== monitor) return;

      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for(let i = 0; i < data.length; i += 1){
        const normalized = (data[i] - 128) / 128;
        sum += normalized * normalized;
      }

      const rms = Math.sqrt(sum / data.length);
      const threshold = monitor.speaking ? 0.035 : 0.055;
      const nextSpeaking = rms > threshold;

      if(nextSpeaking !== monitor.speaking){
        monitor.speaking = nextSpeaking;
        setVoiceSpeaking(id,nextSpeaking);
      }

      monitor.raf = requestAnimationFrame(tick);
    };

    tick();
  }catch(_error){
    // Visual speaking detection is optional; the audio call remains active.
  }
}

function setVoiceButtonState(active){
  const button = $('#joinVoice');
  if(!button) return;

  if(active){
    button.innerHTML = voiceMuted
      ? '<span>الميكروفون مكتوم</span><span class="material-icons-round">mic_off</span>'
      : '<span>متصل الآن</span><span class="material-icons-round">mic</span>';
    button.classList.add('voice-connected');
    button.classList.toggle('voice-muted',voiceMuted);
    button.setAttribute('aria-pressed',String(voiceMuted));
  }else{
    button.innerHTML = '<span>انضم إلى المحادثة المباشرة</span><span class="material-icons-round">mic</span>';
    button.classList.remove('voice-connected','voice-muted');
    button.removeAttribute('aria-pressed');
  }

  updateVoicePresenceUI();
}

function removeVoiceAudio(peerId){
  const safe = String(peerId).replace(/[^a-zA-Z0-9_-]/g,'_');
  const audio = document.getElementById(`voice-audio-${safe}`);
  if(audio) audio.remove();
}

function closeVoicePeer(peerId){
  const id = String(peerId || '');
  const entry = voicePeers.get(id);
  if(entry){
    try{ entry.pc.close(); }catch(_error){}
    if(entry.audio) entry.audio.remove();
  }
  voicePeers.delete(id);
  voiceIceQueues.delete(id);
  stopVoiceSpeakingMonitor(id);
  updateVoicePresenceUI();
}

function createVoicePeer(peerId,initiator){
  peerId = String(peerId);
  if(!voiceLocalStream || !voiceChannel || !peerId) return null;

  const existing = voicePeers.get(peerId);
  if(existing) return existing.pc;

  const pc = new RTCPeerConnection({
    iceServers:[
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'stun:stun1.l.google.com:19302'}
    ]
  });

  voiceLocalStream.getTracks().forEach(track => pc.addTrack(track,voiceLocalStream));

  const entry = {pc,audio:null,remoteDescription:false};
  voicePeers.set(peerId,entry);
  voiceIceQueues.set(peerId,[]);

  pc.onicecandidate = event => {
    if(!event.candidate || !voiceChannel) return;
    voiceChannel.send({
      type:'broadcast',
      event:'voice-signal',
      payload:{
        type:'candidate',
        from:String(currentUser.id),
        to:peerId,
        candidate:event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
      }
    }).catch(()=>{});
  };

  pc.ontrack = event => {
    const stream = event.streams?.[0];
    if(!stream) return;

    let audio = entry.audio;
    if(!audio){
      audio = document.createElement('audio');
      audio.id = `voice-audio-${peerId.replace(/[^a-zA-Z0-9_-]/g,'_')}`;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.controls = false;
      audio.hidden = true;
      document.body.appendChild(audio);
      entry.audio = audio;
    }

    audio.srcObject = stream;
    audio.play().catch(() => {});
    startVoiceSpeakingMonitor(peerId,stream).catch(()=>{});
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    if(state === 'failed' || state === 'closed') closeVoicePeer(peerId);
  };

  if(initiator){
    pc.createOffer({offerToReceiveAudio:true})
      .then(offer => pc.setLocalDescription(offer).then(() => offer))
      .then(offer => voiceChannel?.send({
        type:'broadcast',
        event:'voice-signal',
        payload:{
          type:'offer',
          from:String(currentUser.id),
          to:peerId,
          description:offer
        }
      }))
      .catch(() => showToast('تعذر إنشاء اتصال صوتي مع أحد الأعضاء'));
  }

  return pc;
}

async function flushVoiceIce(peerId){
  const entry = voicePeers.get(String(peerId));
  const queue = voiceIceQueues.get(String(peerId)) || [];
  if(!entry?.remoteDescription || !queue.length) return;

  while(queue.length){
    const candidate = queue.shift();
    try{ await entry.pc.addIceCandidate(candidate); }catch(_error){}
  }
}

async function handleVoiceSignal(payload){
  if(!voiceJoined || !payload || !currentUser) return;

  const from = String(payload.from || '');
  const to = String(payload.to || '');
  if(!from || !to || to !== String(currentUser.id) || from === String(currentUser.id)) return;

  if(payload.type === 'bye'){
    closeVoicePeer(from);
    return;
  }

  let pc = voicePeers.get(from)?.pc;
  if(!pc) pc = createVoicePeer(from,false);
  const entry = voicePeers.get(from);
  if(!entry) return;

  try{
    if(payload.type === 'offer'){
      await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
      entry.remoteDescription = true;
      await flushVoiceIce(from);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await voiceChannel?.send({
        type:'broadcast',
        event:'voice-signal',
        payload:{
          type:'answer',
          from:String(currentUser.id),
          to:from,
          description:answer
        }
      });
      return;
    }

    if(payload.type === 'answer'){
      await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
      entry.remoteDescription = true;
      await flushVoiceIce(from);
      return;
    }

    if(payload.type === 'candidate'){
      const candidate = new RTCIceCandidate(payload.candidate);
      if(entry.remoteDescription) await pc.addIceCandidate(candidate);
      else voiceIceQueues.get(from)?.push(candidate);
    }
  }catch(_error){
    closeVoicePeer(from);
  }
}

async function syncVoicePeers(){
  updateVoicePresenceUI();

  if(!voiceJoined || !voiceChannel || !currentUser) return;

  const ids = voiceParticipantIds().filter(id => !voicePeers.has(String(id)));
  for(const peerId of ids){
    const initiator = String(currentUser.id) < String(peerId);
    createVoicePeer(peerId,initiator);
  }
}

async function ensureVoicePresenceChannel(){
  // Prevent race conditions when the user opens the voice room and
  // immediately presses "Join". All concurrent calls share one promise.
  if(!supabaseClient) return null;

  if(voiceReadyPromise){
    return voiceReadyPromise;
  }

  if(voiceChannel){
    return voiceChannel;
  }

  const presenceKey = String(
    currentUser?.id || `guest-${Math.random().toString(36).slice(2,9)}`
  );

  voiceChannel = supabaseClient.channel('wallpaperhub-public-voice',{
    config:{
      broadcast:{ack:true},
      presence:{key:presenceKey}
    }
  });

  voiceChannel
    .on('broadcast',{event:'voice-signal'},({payload}) => handleVoiceSignal(payload))
    .on('presence',{event:'sync'},() => {
      updateVoicePresenceUI();
      syncVoicePeers();
    })
    .on('presence',{event:'join'},() => {
      updateVoicePresenceUI();
      syncVoicePeers();
    })
    .on('presence',{event:'leave'},payload => {
      const ids = new Set();
      if(payload?.key) ids.add(String(payload.key));
      (payload?.leftPresences || []).forEach(item => {
        if(item?.user_id) ids.add(String(item.user_id));
      });

      ids.forEach(id => {
        const slot = voiceSlotByUser.get(id);
        releaseVoiceSlot(id);
        if(slot) clearVoiceSlot(voiceSlotElement(slot));
        closeVoicePeer(id);
      });

      updateVoicePresenceUI();
    });

  voiceReadyPromise = new Promise((resolve,reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if(settled) return;
      settled = true;
      reject(new Error('تعذر الاتصال بغرفة الصوت'));
    },8000);

    voiceChannel.subscribe(channelStatus => {
      if(settled) return;

      if(channelStatus === 'SUBSCRIBED'){
        settled = true;
        clearTimeout(timer);
        resolve(channelStatus);
        return;
      }

      if(channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT'){
        settled = true;
        clearTimeout(timer);
        reject(new Error('تعذر الاتصال بغرفة الصوت'));
      }
    });
  });

  try{
    const status = await voiceReadyPromise;

    if(status !== 'SUBSCRIBED' || !voiceChannel){
      throw new Error('تعذر الاتصال بغرفة الصوت');
    }

    updateVoicePresenceUI();
    return voiceChannel;
  }catch(error){
    const failedChannel = voiceChannel;
    voiceChannel = null;

    if(supabaseClient && failedChannel){
      try{ await supabaseClient.removeChannel(failedChannel); }catch(_error){}
    }

    throw error;
  }finally{
    voiceReadyPromise = null;
  }
}

async function leaveVoiceRoom(){
  if(voiceChannel && currentUser && voiceJoined){
    for(const peerId of voicePeers.keys()){
      voiceChannel.send({
        type:'broadcast',
        event:'voice-signal',
        payload:{
          type:'bye',
          from:String(currentUser.id),
          to:String(peerId)
        }
      }).catch(()=>{});
    }
  }

  for(const peerId of [...voicePeers.keys()]) closeVoicePeer(peerId);

  if(voiceLocalStream){
    voiceLocalStream.getTracks().forEach(track => track.stop());
    voiceLocalStream = null;
  }

  for(const id of [...voiceAudioMonitors.keys()]) stopVoiceSpeakingMonitor(id);

  if(voiceChannel && supabaseClient){
    try{ await supabaseClient.removeChannel(voiceChannel); }catch(_error){}
  }

  voiceChannel = null;
  voiceReadyPromise = null;
  voiceJoined = false;
  voiceMuted = false;
  voiceSlotByUser.clear();
  setVoiceButtonState(false);

  if(document.body.classList.contains('voice-active')) updateVoicePresenceUI();
}

async function joinRealVoiceRoom(){
  if(voiceJoined) return;

  if(!currentUser){
    showToast('سجّل الدخول أولًا للانضمام إلى المحادثة الصوتية');
    return;
  }

  if(!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection){
    showToast('هذا المتصفح لا يدعم المكالمة الصوتية');
    return;
  }

  if(!supabaseClient){
    showToast('جاري تجهيز الاتصال، حاول مرة أخرى بعد لحظة');
    return;
  }

  const readyChannel = await ensureVoicePresenceChannel();

  if(!readyChannel || !voiceChannel){
    throw new Error('تعذر تجهيز الاتصال الصوتي، حاول مرة أخرى');
  }

  const currentCount = voicePresenceProfiles().length;
  if(currentCount >= VOICE_MAX_PARTICIPANTS){
    updateVoicePresenceUI();
    showToast('الغرفة الصوتية ممتلئة حاليًا');
    return;
  }

  try{
    voiceLocalStream = await navigator.mediaDevices.getUserMedia({
      audio:{
        echoCancellation:true,
        noiseSuppression:true,
        autoGainControl:true
      },
      video:false
    });

    if(!voiceAudioContext){
      voiceAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(voiceAudioContext.state === 'suspended'){
      await voiceAudioContext.resume().catch(()=>{});
    }

    const me = currentVoiceProfile();

    if(!voiceChannel){
      throw new Error('تعذر تجهيز غرفة الصوت');
    }

    await voiceChannel.track({
      user_id:me.id,
      name:me.name,
      avatarUrl:me.avatarUrl
    });

    voiceJoined = true;
    voiceMuted = false;
    setVoiceButtonState(true);
    updateVoicePresenceUI();
    startVoiceSpeakingMonitor(me.id,voiceLocalStream).catch(()=>{});
    await syncVoicePeers();

    const total = voicePresenceProfiles().length;
    if(total > VOICE_MAX_PARTICIPANTS){
      await leaveVoiceRoom();
      showToast('الغرفة امتلأت قبل اكتمال انضمامك');
      return;
    }

    showToast('تم الاتصال بالغرفة الصوتية 🎙️');
  }catch(error){
    await leaveVoiceRoom();
    showToast(error.message || 'تعذر بدء المكالمة الصوتية');
  }
}

$('#joinChat').addEventListener('click',() => {
  showCommunityHero();
  showTab('general');
  input.focus();
  document.querySelector('.chat-card').scrollIntoView({behavior:'smooth',block:'start'});
});

$('#openVoice')?.addEventListener('click',showVoiceHero);
$('#voiceBackToChat')?.addEventListener('click',async () => {
  await leaveVoiceRoom();
  showCommunityHero();
  showTab('general');
});

const joinVoiceButton = $('#joinVoice');
if(joinVoiceButton){
  joinVoiceButton.addEventListener('click', async () => {
    if(voiceJoined){
      voiceMuted = !voiceMuted;
      voiceLocalStream?.getAudioTracks().forEach(track => {
        track.enabled = !voiceMuted;
      });
      setVoiceButtonState(true);
      showToast(voiceMuted ? 'تم كتم الميكروفون' : 'تم تشغيل الميكروفون');
      return;
    }
    await joinRealVoiceRoom();
  });
}

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


$('#replyComposerCancel').addEventListener('click',clearReplyTarget);

$('#replyComposerJump').addEventListener('click',() => {
  if(activeReply?.id) scrollToMessage(activeReply.id);
});

$('#messageActionSheet').addEventListener('click',event => {
  if(event.target.id === 'messageActionSheet') closeMessageActionSheet();
});

$('#messageActionCancel').addEventListener('click',closeMessageActionSheet);

$('#messageActionReply').addEventListener('click',() => {
  if(messageActionTarget) setReplyTarget(messageActionTarget);
});

$('#messageActionDelete').addEventListener('click',async () => {
  const target = messageActionTarget;
  if(!target) return;

  const row = feed.querySelector(`[data-id="${CSS.escape(String(target.id))}"]`);
  closeMessageActionSheet();

  if(row) await deleteMessage(target.id,row);
});

$('#messageActionReport').addEventListener('click',() => {
  const target = messageActionTarget;
  closeMessageActionSheet();

  if(!target) return;

  if(!currentUser){
    showToast('يجب تسجيل الدخول لإرسال بلاغ');
    return;
  }

  openReportModal(target);
});


$('#messageReportClose').addEventListener('click',closeReportModal);
$('#messageReportCancel').addEventListener('click',closeReportModal);
$('#messageReportModal').addEventListener('click',event => {
  if(event.target.id === 'messageReportModal') closeReportModal();
});
$('#messageReportForm').addEventListener('submit',event => {
  event.preventDefault();
  submitMessageReport();
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
  if(event.key !== 'Escape') return;

  const reportModal = $('#messageReportModal');
  if(reportModal?.classList.contains('is-open')){
    closeReportModal();
    return;
  }

  const sheet = $('#messageActionSheet');
  if(sheet?.classList.contains('is-open')){
    closeMessageActionSheet();
    return;
  }

  if(activeReply){
    clearReplyTarget();
    return;
  }

  if(!$('#privateChatOverlay').classList.contains('hidden')){
    closePrivateChat();
  }
});
