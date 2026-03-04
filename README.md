# UniArchive AI（前后端一体）

本仓库现在包含：
- 前端：React + TypeScript + Vite
- 后端：Flask + SQLAlchemy（支持 SQLite / MySQL）

## 1. 前端运行

```bash
npm install
npm run dev
```

### 前端 API 地址配置（支持 HTTP / HTTPS 双地址）
在根目录创建 `.env.local`：

```bash
VITE_API_HTTP_BASE=http://localhost:5009
VITE_API_HTTPS_BASE=https://localhost:5443
```

前端会根据当前页面协议自动选择接口地址：
- 当前页面是 `http://` → 使用 `VITE_API_HTTP_BASE`
- 当前页面是 `https://` → 使用 `VITE_API_HTTPS_BASE`
- 未配置时默认回退到 `http://localhost:5009`

## 2. 后端环境要求

- Python 3.11+
- （可选）MySQL 8.0+

## 3. 后端本地运行

进入后端目录并安装依赖：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows 使用 .venv\\Scripts\\activate
pip install -r requirements.txt
```

建议统一使用 `python -m flask` 执行 Flask CLI，避免误用系统全局的 `flask` 可执行文件（常见现象是报错路径指向 `/opt/homebrew/.../site-packages/flask`）。

```bash
python -m flask --app wsgi init-db
python -m flask --app wsgi seed
```

若提示 `ModuleNotFoundError: No module named 'jwt'`，通常表示当前 Python 环境未安装后端依赖。请确认已激活 `backend/.venv` 后重新安装：

```bash
pip install -r requirements.txt
```

提示：若仅需运行数据库初始化等命令而暂不使用 Excel 导入/导出功能，可先跳过安装 `openpyxl`。当系统检测到缺少该依赖时，会在页面上给予提示并引导执行 `pip install openpyxl`。

### （可选）使用 MySQL

```bash
export DATABASE_URI="mysql+pymysql://ailibrary:ailibrary@localhost/ailibrary"
export SECRET_KEY="change-me"
python -m flask --app wsgi init-db
python -m flask --app wsgi seed
```

如果不设置 `DATABASE_URI`，默认使用 `instance/ailibrary.sqlite`。

### 初始化并启动

```bash
python -m flask --app wsgi init-db
python -m flask --app wsgi seed
python -m flask --app wsgi run --debug --host 0.0.0.0 --port 5009
```

默认账号：
- 管理员：`admin/admin123`
- 普通用户：`user/user123`

### 后端核心接口（新增）

- `POST /api/auth/login`：登录获取 token
- `GET /api/auth/me`：校验 token 并返回当前用户信息及权限
- `GET/POST/PUT/DELETE /api/archives`：档案主数据、元数据、实体与版本管理
- `POST /api/uploads`：创建上传记录并生成 AI 任务
- `GET /api/tasks`：查询 AI 任务状态
- `GET /api/reviews/queue`、`POST /api/reviews/<id>/approve|reject`：审核工作台
- `GET/POST/PUT /api/users`：用户管理
- `GET /api/search`：关键词+实体检索
- `GET /api/stats/dashboard`：仪表盘统计
- `GET/PUT /api/settings`：系统配置
- `GET /api/health`：健康检查

## 4.1 后台批处理 Job（每分钟执行 / 每次2个文件）

当用户上传文件后，系统会创建 AI 任务并标记为 `PENDING`（提示“任务已创建，等待处理”）。
可通过下面命令启动后台批处理程序：

```bash
cd backend
python -m flask --app wsgi run-ai-batch-worker --interval 60 --batch-size 2
```

说明：
- `--interval 60`：每 60 秒轮询一次。
- `--batch-size 2`：每次最多处理 2 个待解析任务（对应 2 个文件）。

若只希望手动触发一次批处理（用于测试）：

```bash
cd backend
python -m flask --app wsgi run-ai-batch-once --batch-size 2
```

### 批处理使用的 AI 配置

批处理会读取系统配置中的以下键值：
- `llm.provider`（如 `openai` / `kimi` / `qwen` / `glm` / `deepseek` / `local`）
- `llm.<provider>_url`
- `llm.<provider>_api_key`

可选环境变量：

```bash
export LLM_MODEL=gpt-4o-mini
```

当 URL 或 API Key 未配置时，系统会自动使用“本地兜底解析”生成基础元数据，确保任务可继续流转至“待人工校验”。

## 5. Docker 部署

```bash
cd backend
docker compose up -d --build
```

仅 SQLite 单容器模式：

```bash
docker build -t ai-library .
docker run -d \
  --name ai-library \
  -p 5009:5009 \
  -e SECRET_KEY=change-me \
  -v "$(pwd)/instance:/app/instance" \
  ai-library
```

初始化数据库：

```bash
docker exec -it ai-library flask --app wsgi init-db
docker exec -it ai-library flask --app wsgi seed
```

Compose 模式初始化：

```bash
docker compose exec web flask --app wsgi init-db
docker compose exec web flask --app wsgi seed
```

访问 `http://localhost:5009`（后端 API）与前端开发地址进行联调。
