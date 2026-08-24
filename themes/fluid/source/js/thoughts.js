(function () {
  'use strict';

  var list = document.querySelector('[data-thought-list]');
  if (!list) return;

  var batchSize = parseInt(list.dataset.batchSize || '20', 10);
  var nextPage = parseInt(list.dataset.nextPage || '2', 10);
  var totalPages = parseInt(list.dataset.totalPages || '1', 10);
  var baseUrl = list.dataset.baseUrl || location.pathname.replace(/\/?$/, '/');
  var sentinel = document.querySelector('[data-thoughts-sentinel]');
  var loading = document.querySelector('[data-thoughts-loading]');
  var busy = false;

  // ---- 相对时间 ----
  function fmt(ts) {
    var diff = Date.now() - ts;
    var m = 60000, h = 3600000, d = 86400000;
    if (diff < m) return '刚刚';
    if (diff < h) return Math.floor(diff / m) + ' 分钟前';
    if (diff < d) return Math.floor(diff / h) + ' 小时前';
    if (diff < 30 * d) return Math.floor(diff / d) + ' 天前';
    return Math.floor(diff / (30 * d)) + ' 个月前';
  }
  function refreshTime(scope) {
    (scope || document).querySelectorAll('.thought-time-ago').forEach(function (el) {
      var ts = parseInt(el.dataset.timestamp, 10);
      if (ts) el.textContent = fmt(ts);
    });
  }
  refreshTime();
  setInterval(refreshTime, 60000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refreshTime();
  });

  // ---- 高亮深链 ----
  function highlight(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('highlight-thought');
    setTimeout(function () { el.classList.remove('highlight-thought'); }, 2000);
  }

  // ---- 点赞（乐观更新 + Supabase RPC）----
  function bubble(btn, text, cls) {
    var wrap = btn.closest('.thought-like-wrap');
    if (!wrap) return;
    var b = wrap.querySelector('.thought-bubble');
    if (!b) {
      b = document.createElement('span');
      b.className = 'thought-bubble';
      wrap.appendChild(b);
    }
    b.textContent = text;
    b.className = 'thought-bubble ' + cls;
    requestAnimationFrame(function () { b.classList.add('bubble-visible'); });
    setTimeout(function () { b.classList.remove('bubble-visible'); }, 1600);
  }

  function initLike(li) {
    var btn = li.querySelector('.thought-like-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var count = btn.querySelector('.thought-like-count');
      var total = parseInt(btn.dataset.total || '0', 10);
      if (btn.dataset.liked === 'true') {
        bubble(btn, '已经赞过啦', 'liked');
        return;
      }
      btn.dataset.liked = 'true';
      btn.dataset.total = String(total + 1);
      count.textContent = total + 1 || '';
      var heart = btn.querySelector('.thought-heart');
      if (heart) {
        heart.style.animation = 'none'; void heart.offsetWidth;
        heart.style.animation = 'thought-heart-pop .45s cubic-bezier(.17,.89,.32,1.49)';
      }
      if (window.dogxiLike) {
        window.dogxiLike(btn.dataset.thoughtId, function (res) {
          if (res && typeof res.total === 'number') {
            btn.dataset.total = String(res.total);
            count.textContent = res.total || '';
          }
          if (res && res.limited) {
            bubble(btn, res.message || '今天已达上限', 'error');
          } else if (res && res.liked === false) {
            bubble(btn, '已经赞过啦', 'liked');
          } else if (res) {
            bubble(btn, '谢谢你的赞', 'thanks');
          }
        }, function () {
          // 失败回滚
          btn.dataset.liked = 'false';
          btn.dataset.total = String(total);
          count.textContent = total || '';
          bubble(btn, '点赞失败，稍后再试', 'error');
        });
      }
    });
  }

  // ---- 初始化一批条目（懒加载图片 / 点赞 / 锚点复制）----
  function initItem(li) {
    li.querySelectorAll('img').forEach(function (img) {
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    });
    var anchor = li.querySelector('.thought-anchor');
    if (anchor) anchor.addEventListener('click', function (e) {
      e.preventDefault();
      var id = li.id;
      var url = location.origin + location.pathname + '#' + id;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(function () {});
      }
      if (history.pushState) history.pushState(null, '', '#' + id);
      highlight(id);
    });
    initLike(li);
  }
  document.querySelectorAll('.thought-item').forEach(initItem);

  // ---- 无限滚动：fetch 下一页，提取 .thought-item 注入 ----
  function loadMore() {
    if (busy || nextPage > totalPages) return;
    busy = true;
    if (loading) loading.hidden = false;
    fetch(baseUrl + 'page/' + nextPage + '/')
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var items = doc.querySelectorAll('[data-thought-list] .thought-item');
        if (!items.length) { nextPage = totalPages + 1; return; }
        items.forEach(function (it) {
          list.appendChild(it);
          initItem(it);
        });
        refreshTime();
        nextPage += 1;
      })
      .catch(function () { /* 网络失败静默，下次滚动重试 */ })
      .finally(function () { busy = false; if (loading) loading.hidden = true; });
  }

  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) loadMore();
    }, { rootMargin: '900px 0px' }).observe(sentinel);
  } else {
    window.addEventListener('scroll', function () {
      if (sentinel && sentinel.getBoundingClientRect().top < innerHeight + 900) loadMore();
    }, { passive: true });
  }

  // ---- 深链 ----
  function resolveHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!/^\d+$/.test(id)) return;
    if (document.getElementById(id)) return highlight(id);
    (function step() {
      if (document.getElementById(id)) return highlight(id);
      if (nextPage > totalPages) return;
      loadMore();
      setTimeout(step, 400);
    })();
  }
  window.addEventListener('hashchange', resolveHash);
  resolveHash();

  // ---- 点赞后端（Supabase，可选；未建表时回退为本地乐观计数）----
  var SUPABASE_URL = 'https://eqkcyfkhnihdchmcfdcw.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_4Y_S9gtbbOoa99cPZsKEbg_gaIw1GPW';

  function fingerprint() {
    var parts = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      String(new Date().getTimezoneOffset())
    ];
    try {
      var c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      var x = c.getContext('2d');
      x.fillText('fp', 2, 15);
      parts.push(c.toDataURL().slice(-50));
    } catch (e) {}
    var data = parts.join('|||');
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
        .then(function (buf) {
          return Array.from(new Uint8Array(buf)).map(function (b) {
            return b.toString(16).padStart(2, '0');
          }).join('').slice(0, 32);
        })
        .catch(function () { return simpleHash(data); });
    }
    return Promise.resolve(simpleHash(data));
  }
  function simpleHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8) + str.length.toString(16);
  }

  function loadSupabase() {
    return new Promise(function (resolve) {
      if (window.supabase && window.supabase.createClient) {
        return resolve(window.supabase);
      }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = function () {
        resolve(window.supabase && window.supabase.createClient ? window.supabase : null);
      };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
  }

  var sbPromise = null;
  function getClient() {
    if (!sbPromise) {
      sbPromise = loadSupabase().then(function (supabase) {
        return supabase ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
      });
    }
    return sbPromise;
  }

  window.dogxiLike = function (id, done, fail) {
    getClient().then(function (sb) {
      if (!sb) {
        if (typeof fail === 'function') fail(new Error('Supabase 不可用'));
        return;
      }
      fingerprint().then(function (fp) {
        sb.rpc('like_thought', { p_target: id, p_fp: fp }).then(function (res) {
          if (res.error) {
            if (typeof fail === 'function') fail(res.error);
            return;
          }
          done(res.data);
        }).catch(function (err) {
          if (typeof fail === 'function') fail(err);
        });
      });
    });
  };

  // 首屏批量回填点赞数（可选优化；RPC 未建时静默跳过）
  function fillLikes() {
    var items = document.querySelectorAll('[data-thought-list] .thought-item');
    var ids = [];
    items.forEach(function (li) {
      var btn = li.querySelector('.thought-like-btn');
      if (btn) ids.push(btn.getAttribute('data-thought-id'));
    });
    getClient().then(function (sb) {
      if (!sb || !ids.length) return;
      sb.rpc('get_thought_likes', { targets: ids }).then(function (res) {
        if (res.error || !res.data) return;
        res.data.forEach(function (row) {
          var btn = document.querySelector('.thought-like-btn[data-thought-id="' + row.target_id + '"]');
          if (btn) {
            btn.dataset.total = String(row.total);
            var count = btn.querySelector('.thought-like-count');
            if (count) count.textContent = row.total || '';
          }
        });
      }).catch(function () {});
    });
  }
  fillLikes();
})();
