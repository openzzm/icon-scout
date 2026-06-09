# Icon Scout

输入网站网址，发现并下载它声明的 favicon、Apple Touch Icon、Web App Manifest 图标和默认 `/favicon.ico`。

## 运行

要求 Node.js 20 或更高版本，无需安装第三方依赖。

```bash
npm start
```

默认地址为 `http://127.0.0.1:3000`。

可用环境变量：

```bash
PORT=8080 HOST=0.0.0.0 npm start
```

开发时可以使用：

```bash
npm run dev
npm test
npm run check
```

## 功能

- 自动补全缺失的 `https://`
- 解析 HTML 图标声明、Apple Touch Icon 和 Web App Manifest
- 添加默认 `/favicon.ico` 候选
- 检测常见图片格式和尺寸
- 推荐最清晰的候选，同时展示全部图标
- 通过服务端代理预览和下载
- 支持按原始格式、PNG、JPEG 或 WebP 下载；JPEG 透明区域使用白色背景
- 支持将常见网站 `favicon.ico` 中的最高分辨率图层转换为 PNG、JPEG 或 WebP
- 拦截本机、私有网络、链路本地和保留地址
- 对页面、Manifest、图标和重定向地址分别执行安全验证

## 部署

这是一个无状态 Node.js HTTP 服务，可以部署到支持常驻 Node.js 进程的平台。生产环境应：

- 设置 `HOST=0.0.0.0` 和平台提供的 `PORT`
- 使用 HTTPS
- 在反向代理或平台层配置速率限制
- 限制实例的出站网络权限
- 保持 Node.js 为受支持的稳定版本

服务主动限制请求超时、重定向次数和响应体积。公开部署仍应增加平台级速率限制，避免服务被用于大量代理请求。

### Netlify

项目包含 `netlify.toml` 和 Netlify Function 适配层。静态页面从 `public/` 发布，`/api/icons` 和 `/api/icon-file` 由 Netlify Functions 处理。

```bash
npx netlify dev
npx netlify deploy
npx netlify deploy --prod
```

## API

```text
GET /api/icons?url=https://example.com
GET /api/icon-file?url=https://example.com/favicon.ico
GET /api/icon-file?url=https://example.com/favicon.ico&download=1
GET /api/icon-file?url=https://example.com/favicon.ico&download=1&format=png
```

`/api/icons` 返回推荐图标 ID 和全部候选元数据。`/api/icon-file` 默认以内联方式代理图片，加入 `download=1` 后以附件形式下载。`format` 可选值为 `png`、`jpeg`、`webp`；不提供时保留原始格式。
