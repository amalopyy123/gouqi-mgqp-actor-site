# 勇战RPG角色特征与备注一览

这是一个使用网页目录内 `actors.json` 的静态角色资料浏览页。页面支持角色搜索，以及通过控制栏统一控制角色说明、补充备注、原固有能力和 `source_raw` 的显示状态。

页面标题区域提供了 Mod 发布网站入口：[https://mgqp.21001231.xyz/](https://mgqp.21001231.xyz/)。

搜索词需要点击“搜索”按钮或按 Enter 后才会执行，避免输入过程中反复重建角色列表。页面右下角提供回到顶部和跳到底部按钮。

“补充备注”默认展开，也可以在控制栏切换为“收缩（可查看）”或“隐藏”；`source_raw` 可以切换为“收缩（可查看）”（默认）、“展开”或“隐藏”；“原固有能力”可以切换为“查看”、“收缩”（默认）或“隐藏”。隐藏只影响页面显示，不会从数据中删除，也不会影响搜索。角色说明收缩时，切换这些内部显示模式不会强制打开角色卡片。

## 启动

在网页目录执行：

```powershell
python -m http.server 4173 --directory research-mod/web-data/actor-web
```

然后打开：

```text
http://localhost:4173/
```

也可以使用其他静态文件服务器。网页只读取当前目录的 `actors.json`，不访问上层目录。

## 数据来源

页面运行时读取 `research-mod/web-data/actor-web/actors.json`，该文件由 `build_actor_web_data.py` 从数据源生成。原始 `research-mod/web-data/actors.json` 仍然保留，网页不再访问上层目录。`app.js` 对缺失字段做了空值处理；缺少固有能力信息的角色会显示明确提示。

同一脚本还会生成三份 CSV：

- `actors.csv`：完整扁平导出，嵌套字段以 JSON 字符串列保存，适合机器处理。
- `actors_fixed_abilities.csv`：原固有能力列表，来自 `actor_fixed_abilities.csv`，补充角色日文名和中文名。
- `actors_important_abilities.csv`：实际说明记录，来自 `actor_important_abilities_extracted.csv`，补充角色日文名和中文名。

头像地址由 `config.js` 的 `faceBaseUrl` 配置。当前线上配置为 `https://mgqp-actor-images.21001231.xyz/assets`，网页会读取 `faces-dressed/` 和 `faces-original/` 下按角色 ID 命名的图片。头像选择“隐藏”时不会创建图片请求，并会移除头像列占用的空间。

## 发布到独立网站项目

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\research-mod\web-data\publish_actor_site.ps1
```

脚本默认复制到 `git文件/gouqi-mgqp-actor-site/`，只复制网页运行所需的 HTML、CSS、JavaScript、配置和 `actors.json`。本地头像目录不会复制，线上头像从 R2 加载。也可以指定目标目录：

```powershell
powershell -ExecutionPolicy Bypass -File .\research-mod\web-data\publish_actor_site.ps1 -Destination .\git文件\gouqi-mgqp-actor-site
```

如果原始 CSV 有更新，先重新生成网页数据再同步：

```powershell
powershell -ExecutionPolicy Bypass -File .\research-mod\web-data\publish_actor_site.ps1 -RefreshData
```

不加 `-RefreshData` 时，脚本不会重新读取 CSV，只会复制当前网页目录中的文件。

## 当前限制

- 首版会将所有角色摘要和可展开内容建立在页面中，适合当前 888 个角色规模；如果以后数据继续扩大，可以再改成分页或虚拟列表。
- 头像默认使用穿衣服版，缺失时回退到原版；页面也可以切换为原版头像。
- 头像文件位于 `public/assets/faces-original/` 和 `public/assets/faces-dressed/`，按角色 ID 命名。
