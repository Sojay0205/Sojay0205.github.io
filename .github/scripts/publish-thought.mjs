// 把 GitHub Issue（带 thought 标签）转成 source/_posts/ 下的碎碎念 markdown。
// 由 .github/workflows/thought-from-issue.yml 调用。
import fs from 'node:fs';
import path from 'node:path';

const issueNumber = String(process.env.ISSUE_NUMBER || '').trim();
const rawTitle = String(process.env.ISSUE_TITLE || '').trim();
const rawBody = String(process.env.ISSUE_BODY || '');
const createdAt = String(process.env.ISSUE_CREATED_AT || '').trim();

if (!issueNumber) {
  console.error('缺少 ISSUE_NUMBER 环境变量');
  process.exit(1);
}

const DEFAULT_TITLE = '碎碎念';
const title = (rawTitle && rawTitle !== DEFAULT_TITLE)
  ? rawTitle
  : (DEFAULT_TITLE + ' ' + createdAt.slice(0, 10));

// 清理按钮预填的 HTML 注释提示语
let content = rawBody.replace(/<!--[\s\S]*?-->/g, '').trim();

function isImageUrl(u) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(u)
    || u.indexOf('user-attachments') !== -1
    || u.indexOf('user-images.githubusercontent') !== -1;
}

const images = [];

// 1) markdown 图片 ![alt](url)
content = content.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (whole, alt, url) {
  if (isImageUrl(url)) {
    images.push(url);
    return '![](__THOUGHT_IMG_' + (images.length - 1) + '__)';
  }
  return whole;
});

// 2) 裸图片链接
content = content.replace(/(https?:\/\/[^\s()<>"']+\.(?:png|jpe?g|gif|webp|avif|svg)(?:\?[^\s()<>"']*)?)/gi, function (whole) {
  images.push(whole);
  return '![](__THOUGHT_IMG_' + (images.length - 1) + '__)';
});

const imgDir = path.join('source', 'img');
const postsDir = path.join('source', '_posts');
fs.mkdirSync(imgDir, { recursive: true });
fs.mkdirSync(postsDir, { recursive: true });

async function downloadImage(url, i) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('下载图片失败 ' + res.status + ': ' + url);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  let ext = 'jpg';
  if (ct.indexOf('png') !== -1) ext = 'png';
  else if (ct.indexOf('gif') !== -1) ext = 'gif';
  else if (ct.indexOf('webp') !== -1) ext = 'webp';
  else if (ct.indexOf('svg') !== -1) ext = 'svg';
  else if (ct.indexOf('jpeg') !== -1 || ct.indexOf('jpg') !== -1) ext = 'jpg';
  else {
    const m = url.match(/\.(png|jpe?g|gif|webp|avif|svg)(?:\?|$)/i);
    if (m) ext = m[1].toLowerCase().replace('jpeg', 'jpg');
  }
  const name = 'thought-' + issueNumber + '-' + (i + 1) + '.' + ext;
  fs.writeFileSync(path.join(imgDir, name), buf);
  return '/img/' + name;
}

const localPaths = [];
for (let i = 0; i < images.length; i++) {
  try {
    localPaths.push(await downloadImage(images[i], i));
  } catch (err) {
    console.warn(err.message);
    localPaths.push(images[i]); // 下载失败则保留原外链
  }
}

content = content.replace(/!\[\]\(__THOUGHT_IMG_(\d+)__\)/g, function (whole, i) {
  return '![图片](' + localPaths[Number(i)] + ')';
});

const slug = 'thought-' + issueNumber;
const frontMatter = [
  '---',
  'title: ' + JSON.stringify(title),
  'date: ' + JSON.stringify(createdAt),
  'thought: true',
  'archive: true',
  'comments: false',
  '---'
].join('\n');

const filePath = path.join(postsDir, slug + '.md');
fs.writeFileSync(filePath, frontMatter + '\n\n' + (content || '(无内容)') + '\n');
console.log('已生成 ' + filePath);
