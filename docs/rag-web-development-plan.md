# RAG 系统 Web 端计划方案

## 1. 背景与目标

`ai-rag-web` 作为 RAG 系统的前端工程，面向知识库管理、文档入库、文档处理观察、切片质量检查、后续检索调试和知识库问答场景。后端接口参考相邻工程 `ai-rag-service`。

当前 `ai-rag-service` 已实现：

- 知识库创建、分页查询、详情、更新、删除。
- 文档上传、分页查询、状态筛选、详情、删除。
- 文档解析与切片。
- 文档 chunk 分页查询。
- 统一响应格式、统一错误码、分页结构。

当前后端尚未实现：

- Embedding 和向量索引接口。
- 检索接口。
- RAG 问答接口。
- 会话、消息、流式输出接口。
- 登录认证和权限体系。

因此 Web 端方案按两层设计：

- **MVP 阶段**：优先落地知识库和文档入库工作台，对接当前可用接口。
- **增强阶段**：在后端补齐 Embedding、检索、问答、会话、安全能力后，平滑扩展 Web 模块。

## 2. 产品定位

Web 端不是营销站点，而是一个面向运营、研发和知识库管理员的工作台。设计重点是信息密度、状态可见、操作路径短、错误可恢复。

核心用户：

| 用户 | 核心诉求 |
| --- | --- |
| 知识库管理员 | 创建知识库，配置切片参数，上传资料，跟踪处理状态 |
| 业务运营 | 管理文档，检查解析结果，发现失败文件并重试 |
| 研发/调试人员 | 查看 chunk 内容和 metadata，后续调试检索命中 |
| 普通使用者 | 后续在问答界面选择知识库并提问 |

## 3. MVP 范围

### 3.1 包含能力

- 应用基础框架：路由、布局、API 客户端、错误处理、环境配置。
- 知识库列表：分页、刷新、创建入口、状态展示。
- 知识库详情：基础信息、切片配置、文档列表、上传入口。
- 知识库编辑：名称、描述、chunkSize、chunkOverlap、embeddingModel。
- 文档上传：支持 `pdf`、`txt`、`md`、`markdown`、`docx`。
- 文档管理：分页、状态筛选、详情、删除、触发解析。
- Chunk 查看：按文档查看切片内容、序号、hash、tokenCount、metadata。
- 全局错误提示：后端业务错误码转中文提示。
- 空状态、加载态、失败态、表单校验。

### 3.2 不包含能力

- 用户登录和权限控制。
- 前端内置文档预览器。
- 大文件断点续传。
- 异步任务中心。
- 检索、问答、会话和流式输出。
- 模型供应商配置界面。
- 数据看板和成本统计。

这些能力作为后续阶段扩展，不阻塞 MVP。

## 4. 技术选型建议

当前 `ai-rag-web` 为空工程，建议采用偏管理后台风格的 Vue 技术栈：

| 类别 | 推荐方案 | 说明 |
| --- | --- | --- |
| 构建工具 | Vite | 启动快，配置简单 |
| 前端框架 | Vue 3 | 适合后台表单、列表、状态驱动页面 |
| 语言 | TypeScript | 与后端 DTO 对齐，减少接口字段误用 |
| 路由 | Vue Router | 页面路由和详情页参数管理 |
| 状态管理 | Pinia | 保存当前知识库、用户偏好、全局配置 |
| UI 组件 | Element Plus | 表格、分页、表单、上传组件成熟 |
| HTTP 客户端 | Axios | 统一拦截 `ApiResponse` 和错误码 |
| 数据请求 | TanStack Query for Vue 或自定义 composable | 统一缓存、刷新、分页请求状态 |
| 测试 | Vitest + Vue Test Utils | 组件和工具函数测试 |
| 代码规范 | ESLint + Prettier | 保持风格一致 |

如果团队更熟悉 React，也可以等价替换为 React + TypeScript + Vite + React Router + TanStack Query + Ant Design。本文后续以 Vue 3 方案描述。

## 5. 系统架构

```text
Browser
  |
  v
Vue Web App
  |
  +-- Router
  +-- Layout
  +-- Feature Modules
  |     +-- knowledge-base
  |     +-- document
  |     +-- chunk
  |     +-- retrieval        后续
  |     +-- chat             后续
  |
  +-- API Client
        |
        v
ai-rag-service
  |
  +-- /api/knowledge-bases
  +-- /api/documents
  +-- /api/retrieval         后续
  +-- /api/chat              后续
```

前端只依赖后端 REST API，不直接访问数据库、Redis、文件系统或模型供应商。

## 6. 推荐目录结构

```text
ai-rag-web/
├── docs/
│   └── rag-web-development-plan.md
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   ├── knowledgeBaseApi.ts
│   │   ├── documentApi.ts
│   │   ├── retrievalApi.ts
│   │   └── chatApi.ts
│   ├── assets/
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── AppSidebar.vue
│   │   ├── PageHeader.vue
│   │   ├── StatusTag.vue
│   │   └── ConfirmDelete.vue
│   ├── features/
│   │   ├── knowledge-base/
│   │   ├── document/
│   │   ├── chunk/
│   │   ├── retrieval/
│   │   └── chat/
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   ├── appStore.ts
│   │   └── knowledgeBaseStore.ts
│   ├── styles/
│   │   ├── variables.css
│   │   └── global.css
│   ├── utils/
│   │   ├── format.ts
│   │   ├── file.ts
│   │   └── error.ts
│   ├── App.vue
│   └── main.ts
├── .env.development
├── .env.production
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 7. 页面与路由规划

### 7.1 MVP 路由

| 路由 | 页面 | 能力 |
| --- | --- | --- |
| `/` | 首页重定向 | 重定向到 `/knowledge-bases` |
| `/knowledge-bases` | 知识库列表 | 分页、创建、刷新、进入详情 |
| `/knowledge-bases/new` | 创建知识库 | 表单创建 |
| `/knowledge-bases/:id` | 知识库详情 | 基础信息、文档列表、上传文档 |
| `/knowledge-bases/:id/edit` | 编辑知识库 | 更新名称、描述和切片配置 |
| `/documents/:id` | 文档详情 | 文档元数据、处理状态、触发解析、删除 |
| `/documents/:id/chunks` | Chunk 列表 | 分页查看切片内容和 metadata |

### 7.2 后续路由

| 路由 | 页面 | 依赖后端能力 |
| --- | --- | --- |
| `/knowledge-bases/:id/retrieval` | 检索调试 | `POST /api/retrieval/search` |
| `/knowledge-bases/:id/retrieval/debug` | 检索链路调试 | `POST /api/retrieval/debug` |
| `/chat` | 问答入口 | `POST /api/chat` |
| `/chat/sessions/:id` | 会话详情 | 会话和消息接口 |
| `/settings/models` | 模型配置 | 后端模型配置接口，当前未定义 |
| `/monitoring` | 运行监控 | 日志、成本、指标接口，当前未定义 |

## 8. 核心页面设计

### 8.1 知识库列表

主要信息：

- 知识库名称。
- 描述摘要。
- 状态：`ACTIVE`、`ARCHIVED`、`DELETED`。
- chunkSize、chunkOverlap、embeddingModel。
- createdAt、updatedAt。
- 操作：查看、编辑、删除。

交互规则：

- 默认按 `createdAt desc` 分页。
- 删除前二次确认。
- 删除成功后刷新当前页。
- 如果当前页删除后为空且不是第一页，回退一页重新请求。
- 后端当前未提供关键词搜索，前端不做伪搜索，避免误导用户。

### 8.2 创建/编辑知识库

表单字段：

| 字段 | 校验 | 默认值 |
| --- | --- | --- |
| name | 必填，最多 128 字符 | 空 |
| description | 最多 2000 字符 | 空 |
| chunkSize | 正整数 | 800 |
| chunkOverlap | 大于等于 0，且小于 chunkSize | 100 |
| embeddingModel | 最多 128 字符 | `text-embedding-3-small` |

前端校验应覆盖后端约束：

- `name` 去除首尾空格后不能为空。
- `chunkSize > 0`。
- `chunkOverlap >= 0`。
- `chunkOverlap < chunkSize`。

提交失败时优先展示后端 `message`，同时按 `code` 做更友好的中文补充。

### 8.3 知识库详情

页面结构：

- 顶部：知识库名称、状态、更新时间、编辑按钮。
- 配置摘要：chunkSize、chunkOverlap、embeddingModel。
- 文档区域：上传按钮、状态筛选、文档表格、分页。

文档表格字段：

- fileName。
- fileType。
- fileSize。
- status。
- errorMessage。
- createdAt、updatedAt。
- 操作：详情、解析、查看 chunk、删除。

操作规则：

- `UPLOADED`、`PARSED`、`FAILED` 状态允许显示“解析”操作。
- `PARSING`、`CHUNKING`、`EMBEDDING` 等处理中状态禁用重复处理按钮。
- `PARSED` 状态优先展示“查看 chunk”。
- `FAILED` 状态展示错误原因和重试入口。

### 8.4 文档上传

上传接口：

```text
POST /api/knowledge-bases/{knowledgeBaseId}/documents
Content-Type: multipart/form-data
field: file
```

前端限制：

- 扩展名：`pdf`、`txt`、`md`、`markdown`、`docx`。
- 文件大小默认按后端配置上限 `20MB` 控制。
- 空文件在前端拦截。
- 文件名过长时给出提示。

上传体验：

- 支持拖拽或选择文件。
- MVP 阶段可先单文件上传。
- 上传成功后刷新文档列表。
- 上传失败展示错误码，例如 `DOCUMENT_FILE_EMPTY`、`DOCUMENT_TYPE_UNSUPPORTED`、`DOCUMENT_SIZE_EXCEEDED`。

### 8.5 文档详情

主要信息：

- 文档 ID、所属知识库 ID。
- 文件名、类型、大小。
- 存储路径。
- 状态和错误消息。
- 创建时间、更新时间。

操作：

- 触发解析：`POST /api/documents/{id}/parse`。
- 查看 chunk：跳转 `/documents/:id/chunks`。
- 删除文档：`DELETE /api/documents/{id}`。

处理说明：

- 当前后端解析为同步接口，点击解析后页面需要进入 loading。
- 如果后续改为异步任务，前端可以复用状态轮询机制。

### 8.6 Chunk 列表

接口：

```text
GET /api/documents/{id}/chunks?page=0&size=20&sort=chunkIndex,asc
```

展示字段：

- chunkIndex。
- content，默认展示前若干行，支持展开。
- tokenCount。
- contentHash。
- metadata，使用 JSON 折叠展示。
- createdAt、updatedAt。

设计目标：

- 帮助管理员检查切片是否过长、过短或内容缺失。
- 为后续检索调试页面复用 chunk 展示组件。

## 9. 后端接口映射

### 9.1 统一响应结构

后端成功和失败都返回统一结构：

```ts
export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
  timestamp: string
}
```

分页结构：

```ts
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}
```

前端 API 客户端规则：

- HTTP 2xx 且 `success=true` 时返回 `data`。
- HTTP 2xx 但 `success=false` 时按业务错误处理。
- HTTP 4xx/5xx 时尝试读取 `ApiResponse`，读取失败则生成网络错误。
- 列表接口不要在组件层手写响应拆包，统一在 API 层处理。

### 9.2 知识库接口

| 能力 | 方法 | 路径 | 状态 |
| --- | --- | --- | --- |
| 创建知识库 | POST | `/api/knowledge-bases` | 当前可用 |
| 知识库列表 | GET | `/api/knowledge-bases?page=0&size=20&sort=createdAt,desc` | 当前可用 |
| 知识库详情 | GET | `/api/knowledge-bases/{id}` | 当前可用 |
| 更新知识库 | PUT | `/api/knowledge-bases/{id}` | 当前可用 |
| 删除知识库 | DELETE | `/api/knowledge-bases/{id}` | 当前可用 |
| 重建知识库索引 | POST | `/api/knowledge-bases/{id}/index` | 后续阶段 |

请求类型：

```ts
export interface CreateKnowledgeBaseRequest {
  name: string
  description?: string
  chunkSize?: number
  chunkOverlap?: number
  embeddingModel?: string
}

export interface UpdateKnowledgeBaseRequest {
  name?: string
  description?: string
  chunkSize?: number
  chunkOverlap?: number
  embeddingModel?: string
}

export type KnowledgeBaseStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED'

export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  status: KnowledgeBaseStatus
  chunkSize: number
  chunkOverlap: number
  embeddingModel: string
  createdAt: string
  updatedAt: string
}
```

### 9.3 文档接口

| 能力 | 方法 | 路径 | 状态 |
| --- | --- | --- | --- |
| 上传文档 | POST | `/api/knowledge-bases/{knowledgeBaseId}/documents` | 当前可用 |
| 文档列表 | GET | `/api/knowledge-bases/{knowledgeBaseId}/documents` | 当前可用 |
| 文档详情 | GET | `/api/documents/{id}` | 当前可用 |
| 解析并切片 | POST | `/api/documents/{id}/parse` | 当前可用 |
| Chunk 列表 | GET | `/api/documents/{id}/chunks` | 当前可用 |
| 删除文档 | DELETE | `/api/documents/{id}` | 当前可用 |
| 文档向量化 | POST | `/api/documents/{id}/index` | 后续阶段 |

类型定义：

```ts
export type DocumentStatus =
  | 'UPLOADED'
  | 'PARSING'
  | 'PARSED'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'INDEXED'
  | 'FAILED'
  | 'DELETED'

export interface RagDocument {
  id: string
  knowledgeBaseId: string
  fileName: string
  fileType?: string
  fileSize: number
  storagePath: string
  status: DocumentStatus
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface DocumentChunk {
  id: string
  knowledgeBaseId: string
  documentId: string
  chunkIndex: number
  content: string
  contentHash: string
  metadata: Record<string, unknown>
  tokenCount?: number
  createdAt: string
  updatedAt: string
}
```

状态展示建议：

| 状态 | 展示文案 | 颜色语义 | 操作建议 |
| --- | --- | --- | --- |
| UPLOADED | 已上传 | 默认 | 可解析 |
| PARSING | 解析中 | 处理中 | 禁止重复操作 |
| PARSED | 已解析 | 成功 | 可查看 chunk，可重新解析 |
| CHUNKING | 切片中 | 处理中 | 禁止重复操作 |
| EMBEDDING | 向量化中 | 处理中 | 后续使用 |
| INDEXED | 已索引 | 成功 | 后续可问答 |
| FAILED | 失败 | 危险 | 展示错误，可重试解析 |
| DELETED | 已删除 | 弱化 | 默认不展示 |

### 9.4 检索接口，后续阶段

基础检索：

```text
POST /api/retrieval/search
```

请求草案：

```ts
export interface RetrievalSearchRequest {
  knowledgeBaseId: string
  query: string
  topK?: number
  minScore?: number
  strategy?: 'VECTOR' | 'KEYWORD' | 'HYBRID'
  vectorWeight?: number
  keywordWeight?: number
  rerank?: boolean
}
```

响应草案：

```ts
export interface RetrievalSearchResponse {
  query: string
  results: RetrievalResult[]
}

export interface RetrievalResult {
  chunkId: string
  documentId: string
  content: string
  score: number
  metadata: Record<string, unknown>
}
```

调试接口：

```text
POST /api/retrieval/debug
```

Web 页面设计：

- 左侧输入 query、topK、minScore、strategy、rerank。
- 右侧展示 vectorCandidates、keywordCandidates、mergedCandidates、deduplicatedCandidates、rerankedCandidates、finalResults。
- 每个结果可展开 chunk 内容和 metadata。

### 9.5 问答接口，后续阶段

非流式问答：

```text
POST /api/chat
```

请求草案：

```ts
export interface ChatRequest {
  knowledgeBaseId?: string
  sessionId?: string
  question: string
  topK?: number
  minScore?: number
}
```

响应草案：

```ts
export interface ChatResponse {
  answer: string
  references: ChatReference[]
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  sessionId?: string
  messageId?: string
}

export interface ChatReference {
  documentId: string
  chunkId: string
  fileName?: string
  score?: number
  contentPreview?: string
}
```

流式问答：

```text
POST /api/chat/stream
Accept: text/event-stream
```

建议事件：

- `metadata`：返回 sessionId、messageId。
- `delta`：增量文本。
- `references`：引用来源。
- `done`：结束。
- `error`：错误。

会话接口：

| 能力 | 方法 | 路径 | 状态 |
| --- | --- | --- | --- |
| 创建会话 | POST | `/api/chat/sessions` | 已实现 |
| 查询会话 | GET | `/api/chat/sessions/{id}` | 已实现 |
| 查询消息 | GET | `/api/chat/sessions/{id}/messages` | 已实现 |

## 10. API 客户端设计

### 10.1 环境变量

```text
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_TITLE=AI RAG Web
VITE_API_TOKEN=
```

### 10.2 Axios 实例

设计要求：

- `baseURL` 来自 `VITE_API_BASE_URL`。
- 默认请求超时建议 30 秒。
- 上传和解析接口超时可单独放宽。
- 请求拦截器接入认证 token 注入到 `X-API-Key`，优先读取页面保存的 token，其次读取 `VITE_API_TOKEN`。
- 响应拦截器统一处理 `ApiResponse`。
- 文件上传不要手动设置 multipart boundary，由浏览器自动生成。

错误对象建议：

```ts
export interface AppError {
  code: string
  message: string
  status?: number
  timestamp?: string
  raw?: unknown
}
```

### 10.3 错误码文案

| 错误码 | 前端文案 |
| --- | --- |
| VALIDATION_ERROR | 参数校验失败，请检查表单 |
| KNOWLEDGE_BASE_NOT_FOUND | 知识库不存在或已删除 |
| KNOWLEDGE_BASE_INACTIVE | 知识库不可用 |
| KNOWLEDGE_BASE_NAME_DUPLICATE | 知识库名称已存在 |
| DOCUMENT_NOT_FOUND | 文档不存在或已删除 |
| DOCUMENT_FILE_EMPTY | 文件为空，无法上传 |
| DOCUMENT_TYPE_UNSUPPORTED | 文件类型不支持 |
| DOCUMENT_SIZE_EXCEEDED | 文件超过大小限制 |
| DOCUMENT_STORAGE_FAILED | 文件保存失败 |
| DOCUMENT_STATUS_TRANSITION_INVALID | 当前状态不允许执行该操作 |
| DOCUMENT_PROCESSING_FAILED | 文档处理失败 |
| INTERNAL_ERROR | 服务异常，请稍后重试 |

## 11. 状态管理与数据刷新

### 11.1 全局状态

Pinia 只保存跨页面必要状态：

- 当前 API 基础地址。
- 侧边栏展开状态。
- 最近访问的知识库 ID。
- 用户偏好，例如表格 pageSize。

### 11.2 服务端数据

知识库、文档、chunk 这类服务端数据不要长期复制到 Pinia，建议交给请求 composable 或 TanStack Query 管理：

- 列表按 query key 缓存。
- 创建、更新、删除后 invalidate 对应列表和详情。
- 上传、解析后刷新文档详情和文档列表。
- 查看 chunk 时按 documentId、page、size 缓存。

### 11.3 轮询策略

MVP 后端解析是同步接口，暂不需要常驻轮询。后续如果解析、向量化改为异步，建议：

- 文档列表中存在 `PARSING`、`CHUNKING`、`EMBEDDING` 状态时，每 3 到 5 秒刷新当前页。
- 页面不可见时暂停轮询。
- 连续失败后退避，避免打满后端。

## 12. UI 设计原则

- 整体风格以后台工作台为主，避免大面积营销式 hero。
- 页面以左侧导航和顶部标题区组织，不使用多层嵌套卡片。
- 表格优先展示可扫描信息，长文本用省略和展开。
- 状态统一用 `StatusTag`，不要在各页面重复写颜色规则。
- 危险操作使用确认弹窗，并明确展示资源名称。
- 表单字段旁只保留必要说明，复杂规则交给校验提示。
- 文档 chunk 内容使用等宽字体或阅读性更好的文本容器。
- 上传、解析、删除等操作都要有明确 loading 和禁用状态。

## 13. 开发阶段计划

### 阶段 W1：工程初始化

目标：

- 初始化 Vite + Vue 3 + TypeScript 工程。
- 接入 Element Plus、Vue Router、Pinia、Axios。
- 建立基础目录结构和全局样式。
- 配置 `.env.development` 指向 `http://localhost:8080`。

验收：

- `npm run dev` 可启动。
- 首页可渲染基础布局。
- `/knowledge-bases` 路由可访问。

### 阶段 W2：API SDK 与基础布局

目标：

- 实现 `ApiResponse`、`PageResponse`、领域类型。
- 实现 Axios client 和错误封装。
- 实现 `knowledgeBaseApi`、`documentApi`。
- 实现应用布局、侧边栏、页面标题、空状态、错误提示。

验收：

- 可调用 `/api/knowledge-bases` 并正确处理分页。
- 后端错误码可统一展示。

### 阶段 W3：知识库管理

目标：

- 知识库列表。
- 创建知识库。
- 编辑知识库。
- 删除知识库。
- 知识库详情顶部信息。

验收：

- 能完成知识库 CRUD 闭环。
- 表单校验和后端校验一致。
- 删除后列表刷新正确。

### 阶段 W4：文档管理与上传

目标：

- 知识库详情页的文档列表。
- 状态筛选。
- 上传文档。
- 文档详情。
- 删除文档。

验收：

- 能上传支持格式文件。
- 能按状态筛选文档。
- 能展示后端返回的文件状态和错误原因。

### 阶段 W5：解析与 Chunk 查看

目标：

- 触发文档解析。
- 查看文档 chunk 分页列表。
- 展开 chunk 内容和 metadata。
- 失败状态重试入口。

验收：

- 上传文档后可触发解析并看到 `PARSED` 状态。
- `GET /api/documents/{id}/chunks` 可分页展示。

### 阶段 W6：向量索引与检索调试，依赖后端阶段 5 和阶段 8

目标：

- 增加文档向量化按钮。
- 增加知识库重建索引入口。
- 增加检索调试页面。
- 展示命中 chunk、分数、来源 metadata。

验收：

- 可调用后端检索接口并展示 TopK 结果。
- 可对比检索策略。

### 阶段 W7：RAG 问答，依赖后端阶段 6

目标：

- 增加问答页面。
- 支持选择知识库提问。
- 展示答案、引用来源和 token usage。
- 引用可跳转到文档 chunk。

验收：

- 可完成一次基于知识库的问答。
- 回答引用可追溯到文档和 chunk。

### 阶段 W8：会话与流式输出，依赖后端阶段 7

目标：

- 会话列表和会话详情。
- 消息历史展示。
- SSE 流式输出。
- 流式错误和中断处理。

验收：

- 可创建会话并连续提问。
- 流式输出过程中 UI 不阻塞。
- 完成后展示引用来源。

### 阶段 W9：生产化增强

目标：

- 接入认证 token。
- 增加权限和无权限状态。
- 增加监控或日志查看入口。
- 完善关键工具函数和状态规则回归测试。
- 增加 Docker/Nginx 部署配置。

验收：

- 可按环境构建。
- 核心流程具备自动化回归。
- 前端可独立部署并配置后端地址。

## 14. 测试策略

### 14.1 单元测试

覆盖：

- `formatFileSize`、时间格式化、状态文案映射。
- 表单校验规则。
- API 错误转换。
- 状态操作可用性判断。

### 14.2 组件测试

覆盖：

- 知识库表单。
- 文档上传组件。
- 状态标签组件。
- Chunk 展开组件。
- 删除确认组件。

## 15. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 后端部分接口仍处于后续阶段 | 前端页面无法完整联调 | 将接口按当前可用和后续阶段拆分，未实现页面使用 feature flag 隐藏 |
| 后端解析当前为同步接口 | 大文档解析时页面等待较久 | 给解析按钮加 loading 和超时提示，后续切换异步轮询 |
| 文件上传失败原因较多 | 用户难以定位问题 | 按错误码提供明确文案，并在上传前做基础校验 |
| chunk 内容可能很长 | 表格布局被撑开 | 内容默认折叠，详情抽屉或展开区展示全文 |
| 文档状态会继续演进 | 前端状态判断散落导致维护困难 | 集中维护状态枚举、文案、颜色和操作规则 |
| 问答和检索接口未定稿 | 后续改动成本 | API 类型集中在 `src/api`，页面不直接拼请求结构 |

## 16. 交付清单

MVP 文档和工程交付：

- [ ] Web 端开发计划文档。
- [ ] Vite + Vue 3 + TypeScript 工程。
- [ ] API client 与类型定义。
- [ ] 知识库管理页面。
- [ ] 文档上传和管理页面。
- [ ] 文档解析和 chunk 查看页面。
- [ ] 基础单元测试。
- [ ] README 启动说明。

后续增强交付：

- [x] 向量索引操作页面。
- [x] 检索调试页面。
- [x] RAG 问答页面。
- [x] 会话和流式输出页面。
- [x] 认证和权限接入。
- [x] 部署配置和基础回归测试。

## 17. 启动与联调建议

后端本地启动：

```bash
cd ../ai-rag-service
docker compose up -d
mvn spring-boot:run
```

前端本地启动，工程初始化后：

```bash
cd ../ai-rag-web
npm install
npm run dev
```

默认后端地址：

```text
http://localhost:8080
```

建议前端通过 `VITE_API_BASE_URL` 配置后端地址，开发环境可直接请求后端；如遇 CORS，再在 Vite dev server 配置 `/api` 代理。
