---
title: 碎碎念
date: 2026-07-06 00:00:00
layout: page
---

<div class="notes-page">
  <div class="notes-hero">
    <h1>碎碎念</h1>
    <p>随时记录一点短想法，写完就存下来。</p>
  </div>

  <div class="notes-composer">
    <textarea id="noteInput" maxlength="300" placeholder="想说点什么，随手记一条…"></textarea>
    <div class="notes-actions">
      <span id="countHint">0 / 300</span>
      <button type="button" id="publishBtn">发布</button>
    </div>
    <p id="statusText" class="notes-tip">加载中…</p>
  </div>

  <div id="authBox" class="auth-box" hidden>
    <div class="auth-row">
      <input id="emailInput" type="email" placeholder="输入邮箱登录后删除内容" />
      <button type="button" id="loginBtn">发送登录链接</button>
    </div>
    <p class="notes-tip">只有登录到管理员邮箱后，才显示删除按钮。</p>
  </div>

  <div id="notesList" class="notes-list"></div>
</div>

<style>
.notes-page{max-width:860px;margin:0 auto;padding:1rem 0 2rem}
.notes-hero{margin-bottom:1rem}
.notes-hero h1{font-size:1.8rem;margin:0 0 .4rem}
.notes-hero p{margin:0;color:var(--text-color-3,#7a7a7a)}
.notes-composer,.note-card,.auth-box{background:var(--card-bg-color,#fff);border:1px solid rgba(127,127,127,.14);border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.04)}
.notes-composer,.auth-box{padding:1rem;margin-bottom:1rem}
#noteInput{width:100%;min-height:120px;resize:vertical;border:0;outline:none;background:transparent;color:inherit;font-size:1rem;line-height:1.7}
.notes-actions{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:.75rem}
#publishBtn,.note-delete,.auth-row button{border:0;border-radius:999px;padding:.6rem 1rem;cursor:pointer;transition:.2s ease}
#publishBtn,.auth-row button{background:var(--btn-bg-color,#1e80ff);color:#fff;font-weight:600}
#publishBtn:hover,.auth-row button:hover{opacity:.92}
.notes-tip{margin:.75rem 0 0;color:var(--text-color-3,#7a7a7a);font-size:.9rem}
.notes-list{display:grid;gap:.9rem}
.note-card{padding:1rem}
.note-meta{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.5rem;color:var(--text-color-3,#7a7a7a);font-size:.88rem}
.note-text{white-space:pre-wrap;word-break:break-word;line-height:1.8}
.note-delete{background:rgba(255,82,82,.1);color:#ff5f5f}
.note-delete:hover{background:rgba(255,82,82,.16)}
.note-empty{padding:2rem 1rem;text-align:center;color:var(--text-color-3,#7a7a7a)}
.auth-row{display:flex;gap:.75rem;align-items:center}
.auth-row input{flex:1;min-width:0;border:1px solid rgba(127,127,127,.18);border-radius:999px;padding:.7rem 1rem;background:transparent;color:inherit;outline:none}
.auth-row input:focus{border-color:var(--btn-bg-color,#1e80ff)}
@media (max-width: 640px){
  .notes-page{padding:.2rem 0 1.5rem}
  .notes-composer,.note-card,.auth-box{border-radius:14px}
  .notes-actions,.auth-row{flex-direction:column;align-items:stretch}
  #publishBtn,.note-delete,.auth-row button{width:100%}
}
</style>

<script type="module">
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

  const SUPABASE_URL = 'https://eqkcyfkhnihdchmcfdcw.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_4Y_S9gtbbOoa99cPZsKEbg_gaIw1GPW';
  const OWNER_EMAIL = '1557754391@qq.com';
  const TABLE_NAME = 'notes';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const input = document.getElementById('noteInput');
  const publishBtn = document.getElementById('publishBtn');
  const notesList = document.getElementById('notesList');
  const countHint = document.getElementById('countHint');
  const statusText = document.getElementById('statusText');
  const authBox = document.getElementById('authBox');
  const emailInput = document.getElementById('emailInput');
  const loginBtn = document.getElementById('loginBtn');

  const formatTime = (value) => new Date(value).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  const getSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  };

  const isOwnerSession = (session) => Boolean(session?.user?.email && session.user.email.toLowerCase() === OWNER_EMAIL.toLowerCase());

  const setStatus = (message) => {
    statusText.textContent = message;
  };

  const updateCount = () => {
    countHint.textContent = `${input.value.length} / 300`;
  };

  const renderNotes = async () => {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, content, created_at, user_email')
      .order('created_at', { ascending: false });

    if (error) {
      notesList.innerHTML = `<div class="note-empty">加载失败：${error.message}</div>`;
      return;
    }

    const session = await getSession();
    const canDelete = isOwnerSession(session);

    if (!data.length) {
      notesList.innerHTML = '<div class="note-empty">还没有碎碎念，先写第一条吧。</div>';
      return;
    }

    notesList.innerHTML = data.map(note => `
      <article class="note-card" data-id="${note.id}">
        <div class="note-meta">
          <time>${formatTime(note.created_at)}</time>
          ${canDelete ? `<button class="note-delete" type="button" data-delete="${note.id}">删除</button>` : ''}
        </div>
        <div class="note-text"></div>
      </article>
    `).join('');

    notesList.querySelectorAll('.note-card').forEach((card) => {
      const note = data.find((item) => item.id === card.dataset.id);
      card.querySelector('.note-text').textContent = note.content;
    });
  };

  const publish = async () => {
    const content = input.value.trim();
    if (!content) return;

    publishBtn.disabled = true;
    setStatus('正在发布…');

    const { error } = await supabase.from(TABLE_NAME).insert({ content });

    if (error) {
      setStatus(`发布失败：${error.message}`);
      publishBtn.disabled = false;
      return;
    }

    input.value = '';
    updateCount();
    await renderNotes();
    setStatus('已发布');
    publishBtn.disabled = false;
  };

  const deleteNote = async (id) => {
    const session = await getSession();
    if (!isOwnerSession(session)) {
      setStatus('只有管理员邮箱登录后才能删除。');
      return;
    }

    if (!window.confirm('确定删除这条碎碎念吗？')) return;

    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
    if (error) {
      setStatus(`删除失败：${error.message}`);
      return;
    }

    setStatus('已删除');
    await renderNotes();
  };

  notesList.addEventListener('click', (event) => {
    const target = event.target.closest('[data-delete]');
    if (!target) return;
    deleteNote(target.dataset.delete);
  });

  publishBtn.addEventListener('click', publish);
  input.addEventListener('input', updateCount);
  input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') publish();
  });

  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      setStatus('请输入管理员邮箱。');
      return;
    }

    loginBtn.disabled = true;
    setStatus('正在发送登录链接…');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    if (error) {
      setStatus(`发送失败：${error.message}`);
      loginBtn.disabled = false;
      return;
    }
    setStatus('登录链接已发送，请查收邮箱。');
    loginBtn.disabled = false;
  });

  const init = async () => {
    updateCount();
    authBox.hidden = false;
    const session = await getSession();
    setStatus(session && isOwnerSession(session) ? `当前登录：${session.user.email}` : '公开发布已开启；管理员登录后可删除内容。');
    await renderNotes();

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setStatus(nextSession && isOwnerSession(nextSession) ? `当前登录：${nextSession.user.email}` : '公开发布已开启；管理员登录后可删除内容。');
      await renderNotes();
    });
  };

  init();
</script>


