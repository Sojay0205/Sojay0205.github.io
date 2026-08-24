'use strict';

// 碎碎念（Thoughts）生成器
// 把 front-matter 中 thought: true 的文章按日期倒序分页，生成 /notes/ 与 /notes/page/N/ 时间线。
// 参考 docs/碎碎念模块设计方案.md
const pagination = require('hexo-pagination');

hexo.extend.generator.register('thoughts', function (locals) {
  const cfg = Object.assign({ per_page: 20, order: -1 }, hexo.config.thoughts || {});

  const isThought = (p) => p.thought === true;
  const thoughts = locals.posts.filter(isThought).sort('date', cfg.order);
  const count = thoughts.length;

  // 全局稳定序号：最早一条 = #1，最新一条 = #N（用于锚点深链 /notes/#N）
  const seq = {};
  locals.posts.filter(isThought).sort('date', 1).forEach((p, i) => {
    seq[p._id] = i + 1;
  });

  const base = 'notes/';
  const data = {
    title: '碎碎念',
    subtitle: '一些不成文的瞬间，记录生活、心情与灵感',
    count,
    seq
  };

  // 还没有碎碎念时也生成 /notes/，避免导航 404
  if (!count) {
    return [{
      path: base,
      layout: ['thoughts', 'archive', 'index'],
      data: Object.assign({
        base,
        total: 1,
        current: 1,
        current_url: base,
        posts: thoughts,
        prev: 0,
        prev_link: '',
        next: 0,
        next_link: ''
      }, data)
    }];
  }

  return pagination(base, thoughts, {
    perPage: cfg.per_page,
    layout: ['thoughts', 'archive', 'index'],
    format: (hexo.config.pagination_dir || 'page') + '/%d/',
    data
  });
});

// 可选 helper：供布局/模板取用全部碎碎念（如 RSS、导航徽标）
hexo.extend.helper.register('thoughts', function () {
  const posts = this.site && this.site.posts;
  if (!posts) return [];
  return posts.filter((p) => p.thought === true).sort('date', -1);
});
