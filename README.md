# ai-rag-web

RAG 系统 Web 管理端，基于 Vue 3、TypeScript、Vite 和 Element Plus 实现。

当前版本对接 `ai-rag-service` 已实现接口，提供知识库管理、文档上传、文档解析、Chunk 查看、向量索引、检索调试、RAG 问答、会话管理和 SSE 流式输出能力。

## 功能

- 知识库分页列表、创建、编辑、删除和详情。
- 文档上传、分页列表、状态筛选、详情、删除。
- 触发文档解析。
- 查看文档 Chunk 内容、hash、tokenCount 和 metadata。
- 触发单文档向量索引、重建知识库索引。
- 执行 TopK 向量检索并查看命中 chunk、分数和 metadata。
- 执行非流式 RAG 问答并查看引用来源、跳转 chunk 和 token usage。
- 创建和切换问答会话，查看会话消息历史。
- 通过 SSE 流式生成回答，支持中断和流式错误展示。
- 统一处理后端 `ApiResponse`、`PageResponse` 和业务错误码。
- 基础单元测试、类型检查和生产构建。

## 本地开发

先启动后端：

```bash
cd ../ai-rag-service
docker compose up -d
mvn spring-boot:run
```

再启动前端：

```bash
cd ../ai-rag-web
npm install
npm run dev
```

默认访问：

```text
http://localhost:5173/
```

接口路径本身已经包含 `/api` 前缀。开发环境默认使用同源请求：

```text
/api/...
```

Vite 会把 `/api` 和 `/actuator` 代理到后端，默认后端代理目标为：

```text
http://localhost:8080
```

可通过 `.env.development` 修改：

```text
VITE_API_BASE_URL=
API_PROXY_TARGET=http://localhost:8080
```

`VITE_API_BASE_URL` 只用于配置后端 origin，例如 `http://example.com`，不要填写 `/api`，否则会和接口路径里的 `/api` 重复。

## 常用命令

```bash
npm run dev
npm run typecheck
npm run test
npm run build
```

## 项目结构

```text
src/
├── api/                  # 后端接口封装和类型
├── components/           # 布局与通用组件
├── features/
│   ├── document/         # 文档上传、详情、Chunk
│   ├── knowledge-base/   # 知识库管理
│   ├── chat/             # RAG 问答
│   └── retrieval/        # 检索调试
├── router/
├── stores/
├── styles/
└── utils/
```
