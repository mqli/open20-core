# 需求：数据导出与导入（Data Export & Import）

## 需求描述

独立 app 无云端，数据安全靠本地存储 + JSON 导出/导入。

防止数据丢失是最高优先级。

## 验收标准

- [ ] 每次修改后自动保存（debounce 500ms）
- [ ] 导出为 `<character-name>-<timestamp>.dnd2024.json`
- [ ] 导出文件包含完整 Character 对象（不含临时状态如 deathSaves）
- [ ] 导入时校验 schemaVersion 兼容性
- [ ] 导入时校验规则合法性（属性范围、专长前提等）
- [ ] 不兼容的 schemaVersion 提示用户并拒绝导入
- [ ] 导入成功后自动跳转到该角色的游戏模式
- [ ] 支持批量导出所有角色（多角色管理P1功能，MVP可先预留接口）

## 数据模型

引用 `../../spec/data-model.md` 中的以下结构：

- `Character` JSON schema — 完整角色数据
- `schemaVersion: "2024.1"` — 数据版本号
- 导出时排除字段：`deathSaves`、`notes`（临时状态）
- 导入时校验字段范围：
  - `abilities` 各属性 1-30
  - `hitPoints.current` 不超过 `hitPoints.max`
  - `classes[].level` 合计不超过 20

## 边界情况

- 导出文件名含特殊字符（如 `/`、`\`）时，需进行 sanitize 处理
- 导入文件为非 JSON 格式时，明确提示文件格式错误
- 导入文件 schemaVersion 高于当前版本时，提示「文件版本过高，请升级应用」
- 导入时若本地已有同名角色，提示用户选择覆盖或重命名
- 批量导出时若角色数为0，提示「无角色可导出」

## 参考资料

- PRD v4.0 §4.9 数据安全
- PRD v4.0 §7 开放问题（数据迁移）
