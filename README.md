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

提示：若仅需运行数据库初始化等命令而暂不使用 Excel 导入/导出功能，可先跳过安装 `openpyxl`。当系统检测到缺少该依赖时，会在页面上给予提示并引导执行 `pip install openpyxl`。

### （可选）使用 MySQL

```bash
export DATABASE_URI="mysql+pymysql://ailibrary:ailibrary@localhost/ailibrary"
export SECRET_KEY="change-me"
flask --app wsgi init-db
flask --app wsgi seed
```

如果不设置 `DATABASE_URI`，默认使用 `instance/ailibrary.sqlite`。

### 初始化并启动

```bash
flask --app wsgi init-db
flask --app wsgi seed
flask --app wsgi run --debug --host 0.0.0.0 --port 5009
```

默认账号：
- 管理员：`admin/admin123`
- 普通用户：`user/user123`

### 登录相关接口

- `POST /api/auth/login`：登录获取 token
- `GET /api/auth/me`：校验 token 并返回当前用户信息
- `GET /api/health`：健康检查

## 4. Docker 部署

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
