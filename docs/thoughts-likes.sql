-- 碎碎念点赞（Supabase）—— 建表 + 2 个 RPC
-- 在 Supabase 项目的 SQL Editor 里执行一次即可。
-- 说明见 docs/碎碎念模块设计方案.md 阶段 5。

-- 1) 点赞表（唯一约束去重：一个指纹对一条碎碎念只能点一次）
create table if not exists thought_likes (
  id          bigint generated always as identity primary key,
  target_id   text not null,
  fingerprint text not null,
  created_at  timestamptz not null default now(),
  constraint uq_thought_like unique (target_id, fingerprint)
);
create index if not exists idx_likes_target on thought_likes (target_id);
create index if not exists idx_likes_fp on thought_likes (fingerprint, created_at);

-- 2) 点赞 RPC（原子 + 每日上限 10 条）
create or replace function like_thought(p_target text, p_fp text)
returns json language plpgsql security definer as $$
declare
  v_total int;
  v_today int;
begin
  if exists (select 1 from thought_likes where target_id = p_target and fingerprint = p_fp) then
    select count(*) into v_total from thought_likes where target_id = p_target;
    return json_build_object('success', true, 'liked', false, 'total', v_total, 'userToday', 0);
  end if;

  select count(*) into v_today from thought_likes
   where fingerprint = p_fp and created_at >= date_trunc('day', now());
  if v_today >= 10 then
    return json_build_object('success', false, 'limited', true,
      'limitReason', 'daily_cap', 'message', '今天已经点赞了 10 条，明天再来吧');
  end if;

  insert into thought_likes (target_id, fingerprint) values (p_target, p_fp);
  select count(*) into v_total from thought_likes where target_id = p_target;
  select count(*) into v_today from thought_likes
   where fingerprint = p_fp and created_at >= date_trunc('day', now());
  return json_build_object('success', true, 'liked', true, 'total', v_total, 'userToday', v_today);
end; $$;

-- 3) 批量读取点赞数
create or replace function get_thought_likes(targets text[])
returns table(target_id text, total bigint) language sql stable as $$
  select target_id, count(*) from thought_likes
   where target_id = any(targets) group by target_id;
$$;

-- 4) 权限：表对 anon 不可直接读写，仅开放 RPC
revoke all on thought_likes from anon, authenticated;
grant execute on function like_thought(text, text) to anon, authenticated;
grant execute on function get_thought_likes(text[]) to anon, authenticated;
