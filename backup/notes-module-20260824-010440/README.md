# notes 模块备份（迁移前）

备份时间：2026-08-24（自动生成）

本次把旧的「notes / 碎碎念」模块从 Supabase 动态方案迁移为 Hexo 静态方案（见 docs/碎碎念模块设计方案.md）。

## 备份内容

| 文件 | 说明 |
|---|---|
| source-notes-index.html | 旧「/notes/」页：在线发布（文字 + 图片上传）+ 时间线 |
| source-notes-manage-index.html | 旧「/notes/manage/」页：管理员登录 + 删除碎碎念/留言 |
| _migrate_notes.js | 旧的 Supabase 数据迁移脚本，内含 6 条碎碎念原始文案 |

## 碎碎念原始内容

> `_migrate_notes.js` 只是旧的迁移脚本，里面的 6 条是**种子占位内容**，不是真实数据。

真实旧内容已从 Supabase comments 表（scope=notes）拉取并导入为 source/_posts/ 下的 markdown，共 **20 条**，含 3 张图片（下载到 source/img/），时间取各自 created_at（UTC）。文件名形如 thought-<id前8位>.md，标题为内容前 20 字截断。

## 如何回滚

如需恢复旧方案：把上面 3 个文件放回原位置即可——

- source-notes-index.html → source/notes/index.html
- source-notes-manage-index.html → source/notes/manage/index.html
- _migrate_notes.js → 项目根目录
